import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { z } from 'zod';
import { parsePagination, buildMeta } from '../../utils/pagination.js';

export const router = Router();

router.get('/', requireMembership(), async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().min(1).optional(),
    year: z.coerce.number().int().optional(),
    sort: z.enum(['name', 'year']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { q, year, sort, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = {
    schoolId: req.schoolId!,
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(year ? { year } : {}),
  };
  const orderBy = sort === 'year' ? { year: order ?? 'asc' } : { name: order ?? 'asc' };
  const [total, items] = await Promise.all([
    prisma.class.count({ where }),
    prisma.class.findMany({ where, orderBy, skip: p.skip, take: p.take }),
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const createClassSchema = z.object({ name: z.string().min(1), year: z.number().int() });
router.post('/', requireMembership('DIRECTOR'), async (req, res) => {
  const parsed = createClassSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const cls = await prisma.class.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(cls);
});
