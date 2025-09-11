import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { z } from 'zod';
import { confirmPaidOrder } from '../payments/confirm.js';

export const router = Router();

// List available store items for a school (public to members)
router.get('/store', requireMembership(), async (req, res) => {
  const schoolId = req.schoolId!;
  const [prices, subjects, school] = await Promise.all([
    prisma.price.findMany({ where: { schoolId, active: true } }),
    prisma.subject.findMany({ where: { schoolId }, select: { id: true, name: true } }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } }),
  ]);
  const subjectMap = new Map(subjects.map((s: { id: string; name: string }) => [s.id, s.name]));
  const items = prices.map((p: typeof prices[number]) => ({
    id: p.id,
    productType: p.productType,
    productRefId: p.productRefId,
    title: p.productType === 'SCHOOL_MEMBERSHIP' ? `Assinatura ${school?.name}` : `Curso: ${subjectMap.get(p.productRefId) || p.productRefId}`,
    amountCents: p.amountCents,
    currency: p.currency,
    interval: p.interval,
  }));
  res.json({ items });
});

// Create order from priceIds
const orderSchema = z.object({ priceIds: z.array(z.string().min(1)).min(1) });
router.post('/order', requireMembership(), async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const schoolId = req.schoolId!;
  const userId = req.user!.id;
  const prices = await prisma.price.findMany({ where: { schoolId, id: { in: parsed.data.priceIds } } });
  if (prices.length === 0) return res.status(400).json({ error: 'No valid prices' });
  const recurring = prices.filter((p: typeof prices[number]) => p.interval !== 'ONE_TIME');
  const oneTime = prices.filter((p: typeof prices[number]) => p.interval === 'ONE_TIME');
  const createdOrders: any[] = [];
  async function createOrderWith(arr: typeof prices) {
    if (arr.length === 0) return null;
    const totalX = arr.reduce((sum: number, p: typeof prices[number]) => sum + p.amountCents, 0);
    const ord = await prisma.order.create({ data: {
      schoolId,
      buyerUserId: userId,
      status: 'PENDING',
      totalAmountCents: totalX,
      currency: arr[0].currency,
      items: { create: arr.map((p: typeof prices[number]) => ({ productType: p.productType, productRefId: p.productRefId, priceAmountCents: p.amountCents, interval: p.interval })) },
      payment: { create: { provider: 'manual', status: 'PENDING' } },
    }, include: { items: true, payment: true } });
    createdOrders.push(ord);
    return ord;
  }
  const orderRecurring = await createOrderWith(recurring);
  const orderOneTime = await createOrderWith(oneTime);
  // Choose provider
  const [config, school, subjects] = await Promise.all([
    prisma.appConfig.upsert({ where: { id: 'config' }, update: {}, create: { id: 'config', platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' } }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, stripeAccountId: true, mpUserId: true } }),
    prisma.subject.findMany({ where: { schoolId, id: { in: prices.filter((p: typeof prices[number])=>p.productType==='SUBJECT_COURSE').map((p: typeof prices[number])=>p.productRefId) } }, select: { id: true, name: true } })
  ]);
  const subjMap = new Map(subjects.map((s: { id: string; name: string }) => [s.id, s.name] as const));
  const friendlyName = (it: any) => it.productType === 'SCHOOL_MEMBERSHIP' ? `Assinatura ${school?.name || ''}` : `Curso: ${subjMap.get(it.productRefId) || it.productRefId}`;

  // Stripe Checkout
  if (config.defaultPaymentProvider === 'STRIPE' && process.env.STRIPE_SECRET_KEY && school?.stripeAccountId) {
    try{
      const { default: Stripe } = await import('stripe')
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
      const success = process.env.CHECKOUT_SUCCESS_URL || 'http://localhost:5173/payments/return?status=success'
      const cancel = process.env.CHECKOUT_CANCEL_URL || 'http://localhost:5173/payments/cancel?status=cancel'
      const urls: string[] = []
      if (orderRecurring){
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer_email: req.user!.email,
          line_items: orderRecurring.items.map((it: any) => ({ price_data: { currency: orderRecurring.currency.toLowerCase(), product_data: { name: friendlyName(it), metadata: { sid: schoolId, pt: it.productType, pref: it.productRefId } }, unit_amount: it.priceAmountCents, recurring: { interval: it.interval === 'MONTHLY' ? 'month' : 'year' } }, quantity: it.quantity })),
          success_url: success,
          cancel_url: cancel,
          subscription_data: {
            application_fee_percent: config.platformFeePercent,
            transfer_data: { destination: school.stripeAccountId },
            metadata: { orderId: orderRecurring.id, schoolId },
          } as any,
          metadata: { orderId: orderRecurring.id, schoolId },
        })
        if (session.url) urls.push(session.url as string)
      }
      if (orderOneTime){
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          customer_email: req.user!.email,
          line_items: orderOneTime.items.map((it: any) => ({ price_data: { currency: orderOneTime.currency.toLowerCase(), product_data: { name: friendlyName(it), metadata: { sid: schoolId, pt: it.productType, pref: it.productRefId } }, unit_amount: it.priceAmountCents }, quantity: it.quantity })),
          success_url: success,
          cancel_url: cancel,
          payment_intent_data: {
            application_fee_amount: Math.round(orderOneTime.totalAmountCents * (config.platformFeePercent/100)),
            transfer_data: { destination: school.stripeAccountId },
          },
          metadata: { orderId: orderOneTime.id, schoolId },
        })
        if (session.url) urls.push(session.url as string)
      }
      ;(req as any).log?.info('checkout_created', { provider: 'STRIPE', schoolId, orders: createdOrders.map(o=>o.id), urls: urls.length })
      return res.status(201).json({ provider: 'STRIPE', multi: urls.length>1, checkoutUrls: urls, orders: createdOrders })
    }catch(err:any){
      // fallback to simulate
    }
  }

  // Mercado Pago Preference (Marketplace)
  if (config.defaultPaymentProvider === 'MERCADO_PAGO' && process.env.MP_APP_ACCESS_TOKEN && school?.mpUserId) {
    try{
      const urls: string[] = []
      const success = process.env.CHECKOUT_SUCCESS_URL || 'http://localhost:5173/payments/return?status=success'
      const cancel = process.env.CHECKOUT_CANCEL_URL || 'http://localhost:5173/payments/cancel?status=cancel'

      // If only recurring, try Preapproval (assinatura)
      if (orderRecurring && !orderOneTime){
        const total = orderRecurring.totalAmountCents/100
        const freq = orderRecurring.items[0]?.interval === 'YEARLY' ? { frequency: 1, frequency_type: 'years' } : { frequency: 1, frequency_type: 'months' }
        const pre = await fetch('https://api.mercadopago.com/preapproval', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MP_APP_ACCESS_TOKEN}` },
          body: JSON.stringify({
            reason: friendlyName(orderRecurring.items[0]),
            auto_recurring: { ...freq, transaction_amount: total, currency_id: createdOrders[0].currency },
            back_url: success,
            payer_email: req.user!.email,
            external_reference: orderRecurring.id,
          })
        })
        const pdata = await pre.json() as any
        if (pre.ok && pdata?.init_point) urls.push(pdata.init_point)
      }

      // Create preference for one-time
      if (orderOneTime){
        const pref = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MP_APP_ACCESS_TOKEN}` },
          body: JSON.stringify({
            items: orderOneTime.items.map((it: any)=>({ title: friendlyName(it), quantity: it.quantity, unit_price: it.priceAmountCents/100, currency_id: orderOneTime.currency })),
            marketplace: 'MP-MKT-EDU',
            marketplace_fee: Math.round(orderOneTime.totalAmountCents * (config.platformFeePercent/100))/100,
            back_urls: { success, failure: cancel, pending: success },
            external_reference: orderOneTime.id,
          })
        })
        const pdata = await pref.json() as any
        if (pref.ok && pdata?.init_point) urls.push(pdata.init_point)
      }

      if (urls.length){
        ;(req as any).log?.info('checkout_created', { provider: 'MERCADO_PAGO', schoolId, orders: createdOrders.map(o=>o.id), urls: urls.length })
        return res.status(201).json({ provider: 'MERCADO_PAGO', multi: urls.length>1, checkoutUrls: urls, orders: createdOrders })
      }
    }catch(err:any){
      // fallback to simulate
    }
  }

  // Simulação em desenvolvimento
  const simulatePaymentUrls = createdOrders.map((o) => `/${schoolId}/checkout/simulate-pay/${o.id}`)
  ;(req as any).log?.info('checkout_created', { provider: 'MANUAL', schoolId, orders: createdOrders.map(o=>o.id), urls: simulatePaymentUrls.length })
  res.status(201).json({ provider: 'MANUAL', multi: simulatePaymentUrls.length > 1, simulatePaymentUrls, orders: createdOrders });
});

// Simulate payment success (DEV ONLY)
router.post('/simulate-pay/:orderId', requireMembership(), async (req, res) => {
  const schoolId = req.schoolId!;
  const orderId = req.params.orderId;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true } });
  if (!order || order.schoolId !== schoolId) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'PENDING') return res.status(400).json({ error: 'Order not pending' });

  const updated = await confirmPaidOrder(order.id);
  res.json({ ok: true, order: updated });
});
