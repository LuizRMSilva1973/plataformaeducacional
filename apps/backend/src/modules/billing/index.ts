import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'
import { z } from 'zod'
import { parsePagination, buildMeta } from '../../utils/pagination.js'
import { computeTotals } from './metrics.js'

export const router = Router()

router.get('/ledger', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const schema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    type: z.enum(['PLATFORM_FEE','SCHOOL_EARNING','REFUND','ADJUSTMENT']).optional(),
    direction: z.enum(['DEBIT','CREDIT']).optional(),
    buyer: z.string().optional(),
    buyerEmail: z.string().optional(),
    productType: z.enum(['SCHOOL_MEMBERSHIP','SUBJECT_COURSE']).optional(),
    detailed: z.coerce.boolean().optional(),
    format: z.enum(['json','csv']).optional()
  })
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { from, to, type, direction, buyer, buyerEmail, productType, format, detailed } = parsed.data as any
  const where: any = { schoolId }
  if (type) where.entryType = type
  if (direction) where.direction = direction
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }

  const buyerFilter = buyerEmail
    ? { order: { buyer: { email: { contains: buyerEmail, mode: 'insensitive' } } } }
    : (buyer ? (buyer.includes('@') ? { order: { buyer: { email: { contains: buyer, mode: 'insensitive' } } } } : { order: { buyerUserId: buyer } }) : {})

  const productFilter = productType ? {
    OR: [
      { order: { items: { some: { productType } } } },
      { subscription: { productType } }
    ]
  } : {}
  const p = parsePagination(req.query as any)
  const [totalCount, itemsRaw] = await Promise.all([
    prisma.ledgerEntry.count({ where: { ...where, ...buyerFilter, ...productFilter } }),
    prisma.ledgerEntry.findMany({ where: { ...where, ...buyerFilter, ...productFilter }, include: detailed ? { order: { include: { items: true, buyer: { select: { email: true, name: true } } } }, subscription: { select: { productType: true, productRefId: true } } } : undefined, orderBy: { createdAt: 'desc' } as any, skip: p.skip, take: p.take })
  ])

  // Enrich with friendly title when detailed
  let items = itemsRaw as any[]
  if (detailed) {
    const subjectIds = new Set<string>()
    for (const it of itemsRaw as any[]) {
      const orderItems: any[] = it?.order?.items || []
      for (const oi of orderItems) if (oi.productType === 'SUBJECT_COURSE') subjectIds.add(oi.productRefId)
      const sub = it?.subscription
      if (sub && sub.productType === 'SUBJECT_COURSE') subjectIds.add(sub.productRefId)
    }
    const subjects = subjectIds.size ? await prisma.subject.findMany({ where: { schoolId, id: { in: Array.from(subjectIds) } }, select: { id: true, name: true } }) : []
    const subjectMap = new Map(subjects.map((s: { id: string; name: string })=>[s.id, s.name] as const))
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } })
    const friendly = (pt: string, pref: string) => pt === 'SCHOOL_MEMBERSHIP' ? `Assinatura ${school?.name || ''}` : `Curso: ${subjectMap.get(pref) || pref}`
    items = itemsRaw.map((it: any) => {
      let title = ''
      let primaryProduct: { productType: string, productRefId: string } | undefined
      if (it?.order?.items?.length) {
        const arr = (it.order.items as any[])
        title = arr.map(oi => friendly(oi.productType, oi.productRefId)).join(', ')
        const fp = arr[0]
        if (fp) primaryProduct = { productType: fp.productType, productRefId: fp.productRefId }
      } else if (it?.subscription) {
        title = friendly(it.subscription.productType, it.subscription.productRefId)
        primaryProduct = { productType: it.subscription.productType, productRefId: it.subscription.productRefId }
      }
      return { ...it, title, primaryProduct }
    })
  }
  const { totals, nets } = computeTotals(items as any)

  if (format === 'csv'){
    // If all=true, export full dataset ignoring pagination
    const exportAll = String((req.query as any).all || '').toLowerCase() === 'true'
    const exportWhere = { ...where, ...buyerFilter, ...productFilter } as any
    const exportInclude = detailed ? { order: { include: { items: true, buyer: { select: { email: true, name: true } } } }, subscription: { select: { productType: true, productRefId: true } } } : undefined
    const exportItems = exportAll ? await prisma.ledgerEntry.findMany({ where: exportWhere, include: exportInclude, orderBy: { createdAt: 'desc' } as any }) : items
    const lines = ['id,entryType,direction,amountCents,createdAt,orderId,subscriptionId,buyerEmail,buyerName,orderTotal']
    for (const it of exportItems as any){ lines.push([it.id, it.entryType, it.direction, it.amountCents, it.createdAt.toISOString(), it.orderId||'', it.subscriptionId||'', it.order?.buyer?.email||'', it.order?.buyer?.name||'', it.order?.totalAmountCents||''].join(',')) }
    const csv = lines.join('\n')
    res.setHeader('Content-Type','text/csv; charset=utf-8')
    res.setHeader('Content-Disposition','attachment; filename="ledger.csv"')
    return res.send(csv)
  }
  res.json({ items, totals, nets, meta: buildMeta(totalCount, p) })
})

// Summary endpoint: aggregates without returning items
router.get('/summary', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const schema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    productType: z.enum(['SCHOOL_MEMBERSHIP','SUBJECT_COURSE']).optional(),
    buyerEmail: z.string().optional(),
  })
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { from, to, productType, buyerEmail } = parsed.data as any
  const where: any = { schoolId }
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
  const productFilter = productType ? { OR: [ { order: { items: { some: { productType } } } }, { subscription: { productType } } ] } : {}
  const buyerFilter = buyerEmail ? { order: { buyer: { email: { contains: buyerEmail, mode: 'insensitive' } } } } : {}
  const items = await prisma.ledgerEntry.findMany({ where: { ...where, ...productFilter, ...buyerFilter }, select: { entryType: true, direction: true, amountCents: true, meta: true } })
  const { totals, nets } = computeTotals(items as any)
  res.json({ totals, nets })
})

// Reconciliation endpoint: breakdown by productType with totals/nets
router.get('/reconcile', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!
  const schema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), format: z.enum(['json','csv']).optional() })
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { from, to, format } = parsed.data as any
  const where: any = { schoolId }
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }

  // Pull enriched items to infer productType from order items or subscription
  const items = await prisma.ledgerEntry.findMany({ where, include: { order: { include: { items: true } }, subscription: { select: { productType: true, productRefId: true } } } })
  type Group = { productType: string, entries: any[] }
  const groups = new Map<string, Group>()
  for (const it of items as any[]) {
    let pt = it?.subscription?.productType || (it?.order?.items?.[0]?.productType) || 'UNKNOWN'
    if (!groups.has(pt)) groups.set(pt, { productType: pt, entries: [] })
    groups.get(pt)!.entries.push({ entryType: it.entryType, direction: it.direction, amountCents: it.amountCents, meta: it.meta })
  }
  // GMV by paid orders in period
  const orderWhere: any = { schoolId, status: 'PAID', ...(from || to ? { paidAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }
  const paidOrders = await prisma.order.findMany({ where: orderWhere, include: { items: true } })
  const overallGMV = paidOrders.reduce((s: number, o: typeof paidOrders[number])=>s+o.totalAmountCents,0)
  const gmvByProduct = new Map<string, number>()
  for (const o of paidOrders){
    for (const it of o.items){
      const curr = gmvByProduct.get(it.productType) || 0
      gmvByProduct.set(it.productType, curr + it.priceAmountCents * (it.quantity || 1))
    }
  }
  const result = Array.from(groups.values()).map(g => ({ productType: g.productType, gmvCents: gmvByProduct.get(g.productType) || 0, ...computeTotals(g.entries) }))
  const overall = computeTotals(items.map((it: any)=>({ entryType: it.entryType, direction: it.direction, amountCents: it.amountCents, meta: it.meta })))

  if (format === 'csv'){
    const lines = ['productType,gmvCents,schoolEarningCents,platformFeeCents,refundCents,schoolNetCents,platformNetCents']
    const schoolEarning = (overall.totals['SCHOOL_EARNING']||0)
    const platformFee = (overall.totals['PLATFORM_FEE']||0)
    const refunds = (overall.totals['REFUND']||0)
    lines.push(['ALL', overallGMV, schoolEarning, platformFee, refunds, overall.nets.schoolNet, overall.nets.platformNet].join(','))
    for (const row of result){
      lines.push([row.productType, row.gmvCents, row.totals['SCHOOL_EARNING']||0, row.totals['PLATFORM_FEE']||0, row.totals['REFUND']||0, row.nets.schoolNet, row.nets.platformNet].join(','))
    }
    const csv = lines.join('\n')
    res.setHeader('Content-Type','text/csv; charset=utf-8')
    res.setHeader('Content-Disposition','attachment; filename="reconcile.csv"')
    return res.send(csv)
  }

  res.json({ overall: { ...overall, gmvCents: overallGMV }, byProductType: result })
})
