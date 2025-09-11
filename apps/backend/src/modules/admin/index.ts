import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin } from '../../middleware/auth.js';
import { z } from 'zod';
import { parsePagination, buildMeta } from '../../utils/pagination.js';

export const router = Router();

router.get('/schools', requireAdmin, async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().min(1).optional(),
    sort: z.enum(['name', 'createdAt']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { q, sort, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const orderBy = sort === 'createdAt' ? { createdAt: order ?? 'asc' } : { name: order ?? 'asc' };
  const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};

  const [total, items] = await Promise.all([
    prisma.school.count({ where }),
    prisma.school.findMany({ where, orderBy, skip: p.skip, take: p.take })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const createSchoolSchema = z.object({ name: z.string().min(2) });
router.post('/schools', requireAdmin, async (req, res) => {
  const parsed = createSchoolSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const school = await prisma.school.create({ data: { name: parsed.data.name } });
  res.status(201).json(school);
});

// Billing: platform fee config and overview
router.get('/billing/config', requireAdmin, async (_req, res) => {
  const config = await prisma.appConfig.upsert({
    where: { id: 'config' },
    update: {},
    create: { id: 'config', platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' },
  });
  res.json(config);
});

router.put('/billing/config', requireAdmin, async (req, res) => {
  const schema = z.object({ platformFeePercent: z.coerce.number().min(0).max(100), defaultPaymentProvider: z.enum(['MANUAL','STRIPE','MERCADO_PAGO']).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const config = await prisma.appConfig.upsert({
    where: { id: 'config' },
    update: { platformFeePercent: parsed.data.platformFeePercent, ...(parsed.data.defaultPaymentProvider ? { defaultPaymentProvider: parsed.data.defaultPaymentProvider } : {}) },
    create: { id: 'config', platformFeePercent: parsed.data.platformFeePercent, defaultPaymentProvider: parsed.data.defaultPaymentProvider || 'MANUAL' },
  });
  res.json(config);
});

router.get('/billing/overview', requireAdmin, async (_req, res) => {
  const [orders, fees, earnings] = await Promise.all([
    prisma.order.findMany({ where: { status: 'PAID' }, select: { totalAmountCents: true } }),
    prisma.ledgerEntry.findMany({ where: { entryType: 'PLATFORM_FEE' }, select: { amountCents: true } }),
    prisma.ledgerEntry.findMany({ where: { entryType: 'SCHOOL_EARNING' }, select: { amountCents: true } }),
  ]);
  const sum = (arr: { amountCents?: number; totalAmountCents?: number }[], key: 'amountCents'|'totalAmountCents') => arr.reduce((a,b)=>a+(b[key]||0),0);
  const gmv = sum(orders as any, 'totalAmountCents');
  const platformRevenue = sum(fees as any, 'amountCents');
  const schoolsRevenue = sum(earnings as any, 'amountCents');
  res.json({ gmv, platformRevenue, schoolsRevenue });
});
