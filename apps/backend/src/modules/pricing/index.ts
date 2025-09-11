import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { z } from 'zod';

export const router = Router();

// List prices for a school
router.get('/', requireMembership('DIRECTOR'), async (req, res) => {
  const schoolId = req.schoolId!;
  const prices = await prisma.price.findMany({ where: { schoolId }, orderBy: { createdAt: 'desc' } });
  res.json({ items: prices });
});

// Upsert a price for a product (DIRECTOR)
const upsertSchema = z.object({
  productType: z.enum(['SCHOOL_MEMBERSHIP', 'SUBJECT_COURSE']),
  productRefId: z.string().min(1),
  amountCents: z.coerce.number().int().min(0),
  currency: z.string().default('BRL').optional(),
  interval: z.enum(['ONE_TIME', 'MONTHLY', 'YEARLY']).default('MONTHLY').optional(),
  active: z.boolean().optional(),
});
router.post('/', requireMembership('DIRECTOR'), async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const schoolId = req.schoolId!;

  // Find existing price for same product; if found, update; else create
  const existing = await prisma.price.findFirst({ where: { schoolId, productType: parsed.data.productType, productRefId: parsed.data.productRefId } });
  const data = {
    schoolId,
    productType: parsed.data.productType,
    productRefId: parsed.data.productRefId,
    amountCents: parsed.data.amountCents,
    currency: parsed.data.currency ?? 'BRL',
    interval: parsed.data.interval ?? 'MONTHLY',
    active: parsed.data.active ?? true,
  } as const;
  const price = existing
    ? await prisma.price.update({ where: { id: existing.id }, data })
    : await prisma.price.create({ data });
  res.status(existing ? 200 : 201).json(price);
});

// Update price
const patchSchema = z.object({
  amountCents: z.coerce.number().int().min(0).optional(),
  currency: z.string().optional(),
  interval: z.enum(['ONE_TIME', 'MONTHLY', 'YEARLY']).optional(),
  active: z.boolean().optional(),
});
router.patch('/:priceId', requireMembership('DIRECTOR'), async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const priceId = req.params.priceId;
  const schoolId = req.schoolId!;
  const price = await prisma.price.findUnique({ where: { id: priceId } });
  if (!price || price.schoolId !== schoolId) return res.status(404).json({ error: 'Price not found' });
  const updated = await prisma.price.update({ where: { id: priceId }, data: parsed.data });
  res.json(updated);
});

router.delete('/:priceId', requireMembership('DIRECTOR'), async (req, res) => {
  const priceId = req.params.priceId;
  const schoolId = req.schoolId!;
  const price = await prisma.price.findUnique({ where: { id: priceId } });
  if (!price || price.schoolId !== schoolId) return res.status(404).json({ error: 'Price not found' });
  // soft delete: set active=false
  const updated = await prisma.price.update({ where: { id: priceId }, data: { active: false } });
  res.json(updated);
});

