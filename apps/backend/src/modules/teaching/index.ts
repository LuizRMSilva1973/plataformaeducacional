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
    teacherUserId: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
    subjectId: z.string().trim().min(1).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { teacherUserId, classId, subjectId, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = {
    schoolId: req.schoolId!,
    ...(teacherUserId ? { teacherUserId } : {}),
    ...(classId ? { classId } : {}),
    ...(subjectId ? { subjectId } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.teachingAssignment.count({ where }),
    prisma.teachingAssignment.findMany({ where, skip: p.skip, take: p.take, orderBy: { id: order ?? 'asc' } })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const assignSchema = z.object({ teacherUserId: z.string(), classId: z.string(), subjectId: z.string() });
router.post('/', requireMembership('DIRECTOR'), rateLimit({ windowMs: 60_000, max: 10, keyGenerator: (req:any) => (req.user?.id || req.ip) + req.path }), async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const ta = await prisma.teachingAssignment.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(ta);
});

router.delete('/:id', requireMembership('DIRECTOR'), async (req, res) => {
  await prisma.teachingAssignment.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
