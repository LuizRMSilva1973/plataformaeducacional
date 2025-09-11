import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'
import { z } from 'zod'

export const router = Router()

router.get('/', requireMembership('TEACHER'), async (req, res) => {
  const schoolId = req.schoolId!
  const items = await prisma.rubric.findMany({ where: { schoolId }, include: { criteria: true } })
  res.json({ items })
})

const schema = z.object({ name: z.string().min(1), criteria: z.array(z.object({ label: z.string().min(1), maxScore: z.coerce.number().int().min(1), weight: z.coerce.number().optional() })).min(1) })
router.post('/', requireMembership('TEACHER'), async (req, res) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const schoolId = req.schoolId!
  const r = await prisma.rubric.create({ data: { schoolId, name: parsed.data.name, criteria: { create: parsed.data.criteria.map(c=>({ label: c.label, maxScore: c.maxScore, weight: c.weight ?? 1 })) } }, include: { criteria: true } })
  res.status(201).json(r)
})

router.post('/attach', requireMembership('TEACHER'), async (req, res) => {
  const schema2 = z.object({ assignmentId: z.string(), rubricId: z.string() })
  const parsed = schema2.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const schoolId = req.schoolId!
  // Ensure assignment belongs to school and teacher can edit it
  const a = await prisma.assignment.findUnique({ where: { id: parsed.data.assignmentId } })
  if (!a || a.schoolId !== schoolId) return res.status(404).json({ error: 'Assignment not found' })
  const can = await prisma.teachingAssignment.findFirst({ where: { schoolId, teacherUserId: req.user!.id, classId: a.classId, subjectId: a.subjectId } })
  if (!can) return res.status(403).json({ error: 'Not allowed' })
  await prisma.assignmentRubric.upsert({ where: { assignmentId: a.id }, update: { rubricId: parsed.data.rubricId }, create: { assignmentId: a.id, rubricId: parsed.data.rubricId } })
  res.json({ ok: true })
})

router.post('/feedback', requireMembership('TEACHER'), async (req, res) => {
  const schema3 = z.object({ submissionId: z.string(), comment: z.string().optional(), items: z.array(z.object({ criterionId: z.string(), score: z.coerce.number().int().min(0), comment: z.string().optional() })).min(1) })
  const parsed = schema3.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const sub = await prisma.submission.findUnique({ where: { id: parsed.data.submissionId }, include: { assignment: true } })
  if (!sub || sub.assignment == null) return res.status(404).json({ error: 'Submission not found' })
  const schoolId = req.schoolId!
  if (sub.assignment.schoolId !== schoolId) return res.status(403).json({ error: 'Forbidden' })
  const can = await prisma.teachingAssignment.findFirst({ where: { schoolId, teacherUserId: req.user!.id, classId: sub.assignment.classId, subjectId: sub.assignment.subjectId } })
  if (!can) return res.status(403).json({ error: 'Not allowed' })
  const fb = await prisma.submissionFeedback.upsert({ where: { submissionId: sub.id }, update: { comment: parsed.data.comment, items: { deleteMany: {}, create: parsed.data.items.map(i=>({ criterionId: i.criterionId, score: i.score, comment: i.comment })) } }, create: { submissionId: sub.id, teacherUserId: req.user!.id, comment: parsed.data.comment, items: { create: parsed.data.items.map(i=>({ criterionId: i.criterionId, score: i.score, comment: i.comment })) } }, include: { items: true } })
  res.status(201).json(fb)
})

