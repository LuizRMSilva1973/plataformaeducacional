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
    studentUserId: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { studentUserId, classId, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = { schoolId: req.schoolId!, ...(studentUserId ? { studentUserId } : {}), ...(classId ? { classId } : {}) };
  const [total, items] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({ where, skip: p.skip, take: p.take, orderBy: { id: order ?? 'asc' } })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const enrollSchema = z.object({ studentUserId: z.string(), classId: z.string() });
router.post('/', requireMembership('DIRECTOR'), rateLimit({ windowMs: 60_000, max: 30, keyGenerator: (req:any) => (req.user?.id || req.ip) + req.path }), async (req, res) => {
  const parsed = enrollSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const enrollment = await prisma.enrollment.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(enrollment);
});
