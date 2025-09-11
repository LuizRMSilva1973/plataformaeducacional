import { prisma } from '../../lib/prisma.js'

export async function confirmPaidOrder(orderId: string, opts?: { provider?: 'STRIPE'|'MERCADO_PAGO'|'MANUAL', providerPaymentId?: string }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order) throw new Error('Order not found')
  if (order.status !== 'PENDING') return order

  const config = await prisma.appConfig.upsert({ where: { id: 'config' }, update: {}, create: { id: 'config', platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' } })
  const feePercent = config.platformFeePercent
  const fee = Math.round(order.totalAmountCents * (feePercent / 100))
  const net = order.totalAmountCents - fee

  const now = new Date()
  const updated = await prisma.$transaction(async (tx: typeof prisma) => {
    const o = await tx.order.update({ where: { id: order.id }, data: { status: 'PAID', paidAt: now, payment: { update: { status: 'SUCCEEDED', ...(opts?.provider ? { provider: opts.provider.toLowerCase() } : {}), ...(opts?.providerPaymentId ? { providerPaymentId: opts.providerPaymentId } : {}) } } } })
    await tx.ledgerEntry.createMany({ data: [
      { schoolId: order.schoolId, orderId: order.id, entryType: 'PLATFORM_FEE', direction: 'CREDIT', amountCents: fee },
      { schoolId: order.schoolId, orderId: order.id, entryType: 'SCHOOL_EARNING', direction: 'CREDIT', amountCents: net },
    ]})
    for (const it of order.items) {
      if (it.interval !== 'ONE_TIME') {
        const end = new Date()
        if (it.interval === 'MONTHLY') end.setMonth(end.getMonth() + 1)
        if (it.interval === 'YEARLY') end.setFullYear(end.getFullYear() + 1)
        await tx.subscription.upsert({
          where: { schoolId_userId_productType_productRefId: { schoolId: order.schoolId, userId: order.buyerUserId, productType: it.productType, productRefId: it.productRefId } },
          update: { status: 'ACTIVE', currentPeriodEnd: end },
          create: { schoolId: order.schoolId, userId: order.buyerUserId, productType: it.productType, productRefId: it.productRefId, status: 'ACTIVE', currentPeriodEnd: end },
        })
      }
    }
    return o
  })
  return updated
}
