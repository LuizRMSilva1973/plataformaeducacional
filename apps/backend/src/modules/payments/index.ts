import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'
import { z } from 'zod'
import crypto from 'crypto'

export const router = Router()

// Stripe Connect — cria/recupera account link para onboarding do diretor da escola
router.post('/:schoolId/stripe/account-link', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, stripeAccountId: true } })
  if (!process.env.STRIPE_SECRET_KEY) return res.status(501).json({ error: 'Stripe não configurado no servidor' })
  try{
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
    let accountId = school?.stripeAccountId
    if (!accountId){
      const acct = await stripe.accounts.create({ type: 'express', business_type: 'individual' })
      accountId = acct.id
      await prisma.school.update({ where: { id: schoolId }, data: { stripeAccountId: accountId } })
    }
    const refreshUrl = process.env.STRIPE_REFRESH_URL || 'http://localhost:5173/stripe/refresh'
    const returnUrl = process.env.STRIPE_RETURN_URL || 'http://localhost:5173/stripe/return'
    const link = await stripe.accountLinks.create({ account: accountId!, refresh_url: refreshUrl, return_url: returnUrl, type: 'account_onboarding' })
    ;(req as any).log?.info('stripe_account_link', { schoolId, accountId, url: !!link.url })
    res.json({ url: link.url })
  }catch(err:any){
    ;(req as any).log?.error('stripe_account_link_error', { schoolId, err: err?.message || String(err) })
    res.status(500).json({ error: err?.message || 'Falha ao integrar com Stripe' })
  }
})

// Mercado Pago — URL de OAuth para conectar a escola (diretor)
router.get('/:schoolId/mercadopago/oauth-url', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const clientId = process.env.MP_CLIENT_ID
  const redirectUri = process.env.MP_REDIRECT_URI
  if (!clientId || !redirectUri) return res.status(501).json({ error: 'Mercado Pago não configurado no servidor' })
  const state = schoolId
  const url = `https://auth.mercadopago.com.br/authorization?client_id=${encodeURIComponent(clientId)}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
  ;(req as any).log?.info('mp_oauth_url', { schoolId })
  res.json({ url })
})

// Callback OAuth Mercado Pago — salva mpUserId da escola
router.post('/mercadopago/oauth/callback', async (req, res) => {
  const schema = z.object({ code: z.string(), state: z.string() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const schoolId = parsed.data.state
  const clientId = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET
  const redirectUri = process.env.MP_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return res.status(501).json({ error: 'Mercado Pago não configurado' })
  try{
    // Troca code por token e pega o user_id
    const resp = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, code: parsed.data.code, redirect_uri: redirectUri }) as any,
    })
    const data = await resp.json() as any
    if (!resp.ok) return res.status(400).json({ error: data?.message || 'Falha no OAuth' })
    const userId = String(data?.user_id || data?.user?.id || '')
    if (!userId) return res.status(400).json({ error: 'user_id não retornado' })
    await prisma.school.update({ where: { id: schoolId }, data: { mpUserId: userId } })
    ;(req as any).log?.info('mp_oauth_connected', { schoolId, userId })
    res.json({ ok: true })
  }catch(err:any){ res.status(500).json({ error: err?.message || 'Erro ao conectar Mercado Pago' }) }
})

// OAuth GET callback (Mercado Pago redireciona via GET na maioria dos fluxos)
router.get('/mercadopago/oauth/callback', async (req, res) => {
  const code = String((req.query as any).code || '')
  const state = String((req.query as any).state || '')
  if (!code || !state) return res.status(400).send('missing code/state')
  const clientId = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET
  const redirectUri = process.env.MP_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return res.status(501).send('MP not configured')
  try{
    const resp = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }) as any,
    })
    const data = await resp.json() as any
    if (!resp.ok) return res.status(400).send(data?.message || 'OAuth error')
    const userId = String(data?.user_id || data?.user?.id || '')
    if (!userId) return res.status(400).send('user_id not found')
    await prisma.school.update({ where: { id: state }, data: { mpUserId: userId } })
    const redirect = (process.env.CHECKOUT_SUCCESS_URL || 'http://localhost:5173') + '?mp=connected'
    res.redirect(302, redirect)
  }catch(err:any){ res.status(500).send(err?.message || 'callback error') }
})

// Mercado Pago Webhook (simplificado): confirma pedidos por external_reference
router.post('/mercadopago/webhook', async (req, res) => {
  // Observação: em produção, valide a assinatura do MP (x-signature) conforme documentação.
  // Aqui, vamos buscar o pagamento via API para confirmar status e então conciliar por external_reference.
  try{
    // Use raw body if available for signature
    const raw = (req as any).rawBody
    const body = (raw && typeof raw !== 'string') ? JSON.parse(raw.toString('utf8')) : (req.body as any)
    const sigHeader = String(req.headers['x-signature'] || '')
    const validateMode = (process.env.MP_WEBHOOK_VALIDATE || 'loose').toLowerCase()
    const secret = process.env.MP_WEBHOOK_SECRET
    if (validateMode === 'strict' && secret) {
      // Very simplified signature check: x-signature: ts=...,v1=...
      try{
        const parts = Object.fromEntries(sigHeader.split(',').map((p)=>p.trim().split('='))) as any
        const payload = typeof raw === 'string' ? raw : raw?.toString('utf8') || JSON.stringify(body)
        const h = crypto.createHmac('sha256', secret).update(payload).digest('hex')
        if (!parts.v1 || parts.v1 !== h) return res.status(400).json({ error: 'invalid signature' })
      }catch{
        return res.status(400).json({ error: 'invalid signature' })
      }
    }
    const topic = (req.query as any).type || body?.type || ''
    const dataId = body?.data?.id || body?.id || ''
    const appToken = process.env.MP_APP_ACCESS_TOKEN
    if (!appToken) return res.status(501).json({ error: 'MP app token não configurado' })
    if (!dataId) return res.status(200).json({ ok: true })

    // Consulta pagamento
    const payResp = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(dataId))}`, {
      headers: { Authorization: `Bearer ${appToken}` },
    })
    const pay = await payResp.json() as any
    if (payResp.ok && pay?.status === 'approved'){
      const external = String(pay?.external_reference || '')
      if (external){
        try{
          const { confirmPaidOrder } = await import('./confirm.js')
          await confirmPaidOrder(external, { provider: 'MERCADO_PAGO', providerPaymentId: String(pay?.id || '') })
          await prisma.auditLog.create({ data: { schoolId: null, actorUserId: null, action: 'MP_PAYMENT_APPROVED', entity: 'Order', entityId: external, meta: { paymentId: dataId, topic } as any } })
          ;(req as any).log?.info('mp_payment_approved', { paymentId: dataId, external })
        }catch{}
      }
    }
    res.json({ ok: true })
  }catch(err:any){ res.status(200).json({ ok: true, warn: err?.message || 'webhook error' }) }
})
