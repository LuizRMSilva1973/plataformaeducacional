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
