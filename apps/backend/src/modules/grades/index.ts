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
    studentUserId: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
    subjectId: z.string().trim().min(1).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { studentUserId, classId, subjectId, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = {
    schoolId: req.schoolId!,
    ...(studentUserId ? { studentUserId } : {}),
    ...(classId ? { classId } : {}),
    ...(subjectId ? { subjectId } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.grade.count({ where }),
    prisma.grade.findMany({ where, skip: p.skip, take: p.take, orderBy: { gradedAt: order ?? 'desc' } })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const gradeSchema = z.object({ studentUserId: z.string(), classId: z.string(), subjectId: z.string(), value: z.number(), assignmentId: z.string().optional() });
router.post('/', requireMembership('TEACHER'), async (req, res) => {
  const parsed = gradeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const grade = await prisma.grade.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(grade);
});
