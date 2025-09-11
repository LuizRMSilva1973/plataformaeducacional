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
    assignmentId: z.string().trim().min(1).optional(),
    studentUserId: z.string().trim().min(1).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { assignmentId, studentUserId, order } = parsed.data;
  const p = parsePagination(parsed.data as Record<string, unknown>);
  const where = {
    assignment: { schoolId: req.schoolId! },
    ...(assignmentId ? { assignmentId } : {}),
    ...(studentUserId ? { studentUserId } : {}),
  } as const;
  const [total, items] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.findMany({ where, skip: p.skip, take: p.take, orderBy: { submittedAt: order ?? 'desc' } })
  ]);
  res.json({ items, meta: buildMeta(total, p) });
});

const submitSchema = z.object({ assignmentId: z.string() });
router.post('/', requireMembership('STUDENT'), async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const submission = await prisma.submission.create({ data: { assignmentId: parsed.data.assignmentId, studentUserId: req.user!.id } });
  res.status(201).json(submission);
});

// Fetch single submission with assignment and rubric (if attached)
router.get('/:id', requireMembership(), async (req, res) => {
  const schoolId = req.schoolId!
  const id = req.params.id
  const sub = await prisma.submission.findUnique({ where: { id }, include: { student: { select: { id: true, name: true, email: true } }, assignment: { include: { class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } }, AssignmentRubric: { include: { rubric: { include: { criteria: true } } } } } }, } as any })
  if (!sub) return res.status(404).json({ error: 'Submission not found' })
  // Ensure submission is from same school
  // assignment has schoolId
  const a = sub.assignment as any
  if (!a || a.schoolId !== schoolId) return res.status(403).json({ error: 'Forbidden' })
  res.json(sub)
})
