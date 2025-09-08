import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../middleware/auth.js';
import { parsePagination, buildMeta } from '../../utils/pagination.js';
import { z } from 'zod';
import { rateLimit } from '../../middleware/rateLimit.js';

export const router = Router();

router.get('/', requireMembership(), async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    classId: z.string().trim().min(1).optional(),
    subjectId: z.string().trim().min(1).optional(),
    q: z.string().trim().min(1).optional(),
    sort: z.enum(['dueAt', 'title']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { classId, subjectId, q, sort, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = {
    schoolId: req.schoolId!,
    ...(classId ? { classId } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
  };
  const orderBy = sort === 'title' ? { title: order ?? 'asc' } : { dueAt: order ?? 'asc' };
  const [total, items] = await Promise.all([
    prisma.assignment.count({ where }),
    prisma.assignment.findMany({ where, skip: p.skip, take: p.take, orderBy })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const createSchema = z.object({ classId: z.string(), subjectId: z.string(), title: z.string().min(1), dueAt: z.coerce.date().optional() });
router.post('/', requireMembership('TEACHER'), rateLimit({ windowMs: 60_000, max: 20, keyGenerator: (req:any) => (req.user?.id || req.ip) + req.path }), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const assignment = await prisma.assignment.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(assignment);
});
