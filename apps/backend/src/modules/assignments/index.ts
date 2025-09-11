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
  // Restrição: professor só pode criar para turmas/disciplinas onde leciona
  const can = await prisma.teachingAssignment.findFirst({ where: { schoolId: req.schoolId!, teacherUserId: req.user!.id, classId: parsed.data.classId, subjectId: parsed.data.subjectId } })
  if (!can) return res.status(403).json({ error: 'Somente para suas turmas/disciplinas' })
  const assignment = await prisma.assignment.create({ data: { ...parsed.data, schoolId: req.schoolId! } });
  res.status(201).json(assignment);
});

const patchSchema = z.object({ title: z.string().min(1).optional(), dueAt: z.coerce.date().optional() });
router.patch('/:id', requireMembership('TEACHER'), async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const a = await prisma.assignment.findUnique({ where: { id: req.params.id } })
  if (!a || a.schoolId !== req.schoolId) return res.status(404).json({ error: 'Tarefa não encontrada' })
  const can = await prisma.teachingAssignment.findFirst({ where: { schoolId: req.schoolId!, teacherUserId: req.user!.id, classId: a.classId, subjectId: a.subjectId } })
  if (!can) return res.status(403).json({ error: 'Somente para suas turmas/disciplinas' })
  const updated = await prisma.assignment.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(updated);
});

router.delete('/:id', requireMembership('TEACHER'), async (req, res) => {
  const a = await prisma.assignment.findUnique({ where: { id: req.params.id } })
  if (!a || a.schoolId !== req.schoolId) return res.status(404).json({ error: 'Tarefa não encontrada' })
  const can = await prisma.teachingAssignment.findFirst({ where: { schoolId: req.schoolId!, teacherUserId: req.user!.id, classId: a.classId, subjectId: a.subjectId } })
  if (!can) return res.status(403).json({ error: 'Somente para suas turmas/disciplinas' })
  await prisma.assignment.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
