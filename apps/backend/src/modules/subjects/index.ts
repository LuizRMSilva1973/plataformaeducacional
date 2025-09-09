import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { parsePagination, buildMeta } from '../../utils/pagination.js';
import { z } from 'zod';

export const router = Router();

router.get('/', requireMembership(), async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().min(1).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { q, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = { schoolId: req.schoolId!, ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}) };
  const [total, items] = await Promise.all([
    prisma.subject.count({ where }),
    prisma.subject.findMany({ where, orderBy: { name: order ?? 'asc' }, skip: p.skip, take: p.take }),
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const createSubjectSchema = z.object({ name: z.string().min(1) });
router.post('/', requireMembership('DIRECTOR'), async (req, res) => {
  const parsed = createSubjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const subject = await prisma.subject.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(subject);
});

const updateSchema = z.object({ name: z.string().min(1) });
router.patch('/:id', requireMembership('DIRECTOR'), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const subject = await prisma.subject.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(subject);
});

router.delete('/:id', requireMembership('DIRECTOR'), async (req, res) => {
  await prisma.subject.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
