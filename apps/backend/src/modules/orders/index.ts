import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'
import { z } from 'zod'

export const router = Router()

router.get('/', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const schema = z.object({ status: z.enum(['PENDING','PAID','FAILED','REFUNDED','CANCELED']).optional(), buyer: z.string().optional(), buyerEmail: z.string().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) })
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { status, buyer, buyerEmail, page, limit } = parsed.data as any
  let where: any = { schoolId, ...(status ? { status } : {}) }
  if (buyerEmail) where = { ...where, buyer: { email: { contains: buyerEmail, mode: 'insensitive' } } }
  else if (buyer) where = buyer.includes('@') ? { ...where, buyer: { email: { contains: buyer, mode: 'insensitive' } } } : { ...where, buyerUserId: buyer }
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, include: { items: true, payment: true, buyer: { select: { id: true, email: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page-1)*limit, take: limit })
  ])
  res.json({ items, meta: { page, limit, total } })
})

router.get('/:orderId', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const orderId = req.params.orderId
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true, buyer: { select: { id: true, email: true, name: true } } } })
  if (!order || order.schoolId !== schoolId) return res.status(404).json({ error: 'Order not found' })
  res.json(order)
})

router.post('/:orderId/refund', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const orderId = req.params.orderId
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } })
  if (!order || order.schoolId !== schoolId) return res.status(404).json({ error: 'Order not found' })
  if (order.status !== 'PAID') return res.status(400).json({ error: 'Only paid orders can be refunded' })

  const payload = (req.body || {}) as any
  const amountCents = typeof payload?.amountCents === 'number' && payload.amountCents > 0 ? Math.min(payload.amountCents, order.totalAmountCents) : order.totalAmountCents
  const isFull = amountCents >= order.totalAmountCents

  const pay = order.payment
  const cfg = await prisma.appConfig.upsert({ where: { id: 'config' }, update: {}, create: { id: 'config', platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' } })
  // Try provider refund when configured
  try{
    if (pay?.provider === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      const { default: Stripe } = await import('stripe')
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
      // Refund by payment_intent
      if (pay.providerPaymentId){
        await stripe.refunds.create({ payment_intent: pay.providerPaymentId, amount: isFull ? undefined : amountCents })
      }
    } else if (pay?.provider === 'mercado_pago' && process.env.MP_APP_ACCESS_TOKEN) {
      if (pay.providerPaymentId){
        await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(pay.providerPaymentId)}/refunds`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.MP_APP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: isFull ? undefined : JSON.stringify({ amount: amountCents/100 }) })
      }
    }
  } catch (err: any) {
    return res.status(502).json({ error: 'Provider refund failed', detail: err?.message || String(err) })
  }

  // Compute refund amounts from existing ledger for this order to ensure exact reversal
  const ledger = await prisma.ledgerEntry.findMany({ where: { schoolId, orderId } })
  const feeTotal = ledger.filter((l: typeof ledger[number])=>l.entryType==='PLATFORM_FEE').reduce((s: number,l: typeof ledger[number])=>s+l.amountCents,0)
  const schoolTotal = ledger.filter((l: typeof ledger[number])=>l.entryType==='SCHOOL_EARNING').reduce((s: number,l: typeof ledger[number])=>s+l.amountCents,0)
  const ratio = Math.min(1, Math.max(0, amountCents / order.totalAmountCents))
  const feeRefund = Math.round(feeTotal * ratio)
  const schoolRefund = Math.round(schoolTotal * ratio)

  const updated = await prisma.$transaction(async (tx: typeof prisma)=>{
    const o = await tx.order.update({ where: { id: orderId }, data: { status: isFull ? 'REFUNDED' : 'PAID' } })
    const entries = [] as any[]
    if (feeRefund>0) entries.push({ schoolId, orderId, entryType: 'REFUND', direction: 'DEBIT', amountCents: feeRefund, /* tag refund of platform fee */ meta: { target: 'PLATFORM_FEE' } as any })
    if (schoolRefund>0) entries.push({ schoolId, orderId, entryType: 'REFUND', direction: 'DEBIT', amountCents: schoolRefund, /* tag refund of school earning */ meta: { target: 'SCHOOL_EARNING' } as any })
    if (entries.length) await tx.ledgerEntry.createMany({ data: entries })
    await tx.payment.update({ where: { orderId }, data: { status: isFull ? 'REFUNDED' : 'SUCCEEDED' } })
    return o
  })

  res.json(updated)
})

router.post('/:orderId/cancel', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const orderId = req.params.orderId
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.schoolId !== schoolId) return res.status(404).json({ error: 'Order not found' })
  if (order.status !== 'PENDING') return res.status(400).json({ error: 'Only pending orders can be canceled' })
  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELED' } })
  res.json(updated)
})

// Simple PDF receipt generator (no external deps)
router.get('/:orderId/receipt.pdf', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const orderId = req.params.orderId
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true, buyer: { select: { email: true, name: true } }, school: { select: { name: true } } } })
  if (!order || order.schoolId !== schoolId) return res.status(404).send('Not found')

  function esc(str: string){ return str.replace(/[()\\]/g, s => s === '(' ? '\\(' : s === ')' ? '\\)' : '\\' ) }
  const lines: string[] = [
    `Recibo do Pedido ${order.id}`,
    `Escola: ${order.school?.name || ''}`,
    `Comprador: ${order.buyer?.name || order.buyer?.email || ''}`,
    `Data: ${new Date(order.createdAt).toLocaleString()}`,
    `Status: ${order.status}`,
    `Valor: R$ ${(order.totalAmountCents/100).toFixed(2)}`,
    `Itens:`,
    ...order.items.map((it: any)=>` - ${it.productType}:${it.productRefId}${it.interval!=='ONE_TIME'?'('+it.interval+')':''} — R$ ${(it.priceAmountCents/100).toFixed(2)}`),
  ]
  // Build a tiny PDF
  let y = 780
  const content = [
    'BT',
    '/F1 12 Tf',
    ...lines.flatMap((t)=>{ const arr = [`1 0 0 1 40 ${y} Tm`, `(${esc(t)}) Tj`]; y -= 18; return arr }),
    'ET'
  ].join('\n')
  const pdfParts = [] as string[]
  pdfParts.push('%PDF-1.4')
  pdfParts.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj')
  pdfParts.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj')
  pdfParts.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj')
  const contentLen = Buffer.byteLength(content, 'utf8')
  pdfParts.push(`4 0 obj << /Length ${contentLen} >> stream`) 
  pdfParts.push(content)
  pdfParts.push('endstream endobj')
  pdfParts.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj')
  const xrefPos = pdfParts.join('\n').length + 1
  const body = pdfParts.join('\n')
  const xref = `xref\n0 6\n0000000000 65535 f \n${'0000000010'.padStart(10,'0')} 00000 n \n`.replace(/ /g,' ')
  // For simplicity, do a minimal trailer without exact offsets (readers are lenient). Some viewers may ignore xref.
  const trailer = `trailer << /Root 1 0 R /Size 6 >>\nstartxref\n${xrefPos}\n%%EOF`
  const pdf = body + '\n' + trailer
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${order.id}.pdf`)
  res.send(Buffer.from(pdf, 'utf8'))
})
