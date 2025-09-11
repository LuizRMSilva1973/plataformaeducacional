import type { Request, Response } from 'express'
import { confirmPaidOrder } from './confirm.js'
import { prisma } from '../../lib/prisma.js'

export async function stripeWebhookHandler(req: Request, res: Response){
  const sig = req.headers['stripe-signature'] as string | undefined
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY) return res.status(501).json({ error: 'Stripe webhook não configurado' })
  try{
    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
    const event = stripe.webhooks.constructEvent((req as any).rawBody || (req as any).body, sig!, secret)

    if (event.type === 'checkout.session.completed'){
      const session: any = event.data.object
      const orderId = session?.metadata?.orderId
      if (orderId) {
        const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session?.payment_intent?.id
        const updated = await confirmPaidOrder(orderId, { provider: 'STRIPE', providerPaymentId: piId })
        ;(req as any).log?.info('stripe_checkout_completed', { orderId, paymentIntent: piId })
        // If subscription mode, align period end with Stripe subscription
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription))
          const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end * 1000) : undefined
          if (periodEnd) {
            const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
            if (order) {
              for (const it of order.items) {
                if (it.interval !== 'ONE_TIME') {
                  await prisma.subscription.update({
                    where: { schoolId_userId_productType_productRefId: { schoolId: order.schoolId, userId: order.buyerUserId, productType: it.productType, productRefId: it.productRefId } },
                    data: { currentPeriodEnd: periodEnd, status: 'ACTIVE' }
                  }).catch(()=>{})
                }
              }
            }
          }
        }
      }
    }
    if (event.type === 'payment_intent.succeeded'){
      const pi: any = event.data.object
      const orderId = pi?.metadata?.orderId
      if (orderId) {
        await confirmPaidOrder(orderId, { provider: 'STRIPE', providerPaymentId: String(pi?.id || '') })
        ;(req as any).log?.info('stripe_payment_succeeded', { orderId, paymentIntent: pi?.id })
      }
    }
    if (event.type === 'invoice.payment_succeeded'){
      const invoice: any = event.data.object
      try{
        const email: string | undefined = invoice?.customer_email
        const lines: any[] = invoice?.lines?.data || []
        const periodEndSec: number | undefined = lines[0]?.period?.end || invoice?.period_end
        const periodEnd = periodEndSec ? new Date(periodEndSec * 1000) : undefined
        // Expand products if needed
        for (const line of lines){
          // Try metadata from product
          let schoolId: string | undefined
          let productType: string | undefined
          let productRefId: string | undefined
          const price = line?.price
          const productId = typeof price?.product === 'string' ? price.product : price?.product?.id
          if (productId){
            try{
              const prod: any = await stripe.products.retrieve(String(productId))
              schoolId = prod?.metadata?.sid
              productType = prod?.metadata?.pt
              productRefId = prod?.metadata?.pref
            }catch{}
          }
          // Fallback to parse old name format
          if (!schoolId || !productType || !productRefId){
            const name: string = line?.price?.product?.name || line?.description || ''
            const parts = String(name).split('|')
            if (parts.length >= 3){ schoolId = parts[0]; productType = parts[1]; productRefId = parts[2] }
          }
          if (!schoolId || !productType || !productRefId) continue
          if (!email) continue
          // Find user by email
          const user = await prisma.user.findUnique({ where: { email } })
          if (!user) continue
          // Update subscription period
          await prisma.subscription.upsert({
            where: { schoolId_userId_productType_productRefId: { schoolId, userId: user.id, productType, productRefId } },
            update: { status: 'ACTIVE', currentPeriodEnd: periodEnd || undefined },
            create: { schoolId, userId: user.id, productType, productRefId, status: 'ACTIVE', currentPeriodEnd: periodEnd || undefined },
          })
          // Ledger entries for renewal if amount available
          const amountCents: number | undefined = typeof line?.amount === 'number' ? line.amount : (typeof line?.amount_excluding_tax === 'number' ? line.amount_excluding_tax : undefined)
          if (typeof amountCents === 'number'){
            const cfg = await prisma.appConfig.upsert({ where: { id: 'config' }, update: {}, create: { id: 'config', platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' } })
            const fee = Math.round(amountCents * (cfg.platformFeePercent/100))
            const net = amountCents - fee
            const subRec = await prisma.subscription.findUnique({ where: { schoolId_userId_productType_productRefId: { schoolId, userId: user.id, productType, productRefId } } })
            await prisma.ledgerEntry.createMany({ data: [
              { schoolId, subscriptionId: subRec?.id, entryType: 'PLATFORM_FEE', direction: 'CREDIT', amountCents: fee },
              { schoolId, subscriptionId: subRec?.id, entryType: 'SCHOOL_EARNING', direction: 'CREDIT', amountCents: net },
            ] })
          }
        }
        ;(req as any).log?.info('stripe_invoice_payment_succeeded', { customer_email: email, lines: lines.length })
      }catch{}
    }
    // audit
    try { await (await import('../../lib/prisma.js')).prisma.auditLog.create({ data: { action: 'STRIPE_EVENT', entity: 'stripe', entityId: event.type, meta: { id: event.id } as any } }) } catch {}
    res.json({ received: true })
  }catch(err:any){
    return res.status(400).json({ error: err?.message || 'Webhook error' })
  }
}
