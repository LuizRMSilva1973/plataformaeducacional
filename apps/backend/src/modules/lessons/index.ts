import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'
import { parsePagination, buildMeta } from '../../utils/pagination.js'
import { z } from 'zod'

export const router = Router()

function sanitizeHtml(html: string): string {
  try {
    let out = html
    // remove script/style blocks
    out = out.replace(/<\/(?:script|style)>/gi, '</removed>')
    out = out.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // remove on* event handlers
    out = out.replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, '')
    // neutralize javascript: in href/src
    out = out.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
    return out
  } catch { return html }
}

router.get('/', requireMembership(), async (req, res) => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().min(1).optional(),
    classId: z.string().trim().min(1).optional(),
    subjectId: z.string().trim().min(1).optional(),
    order: z.enum(['asc','desc']).optional(),
  })
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { q, classId, subjectId, order } = parsed.data
  const p = parsePagination(parsed.data as any)
  const where = {
    schoolId: req.schoolId!,
    ...(classId ? { classId } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
  }
  const [total, items] = await Promise.all([
    prisma.lesson.count({ where }),
    prisma.lesson.findMany({ where, orderBy: { createdAt: order ?? 'desc' }, skip: p.skip, take: p.take })
  ])
  res.json({ items, meta: buildMeta(total, p) })
})

const createSchema = z.object({
  title: z.string().min(1),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  contentType: z.enum(['TEXT','HTML','VIDEO','FILE']),
  body: z.string().optional(),
  fileId: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
})
router.post('/', requireMembership('TEACHER'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const data = parsed.data
  const schoolId = req.schoolId!
  // Validate class/subject belong to this school if provided
  if (data.classId) {
    const cls = await prisma.class.findFirst({ where: { id: data.classId, schoolId } })
    if (!cls) return res.status(404).json({ error: 'Turma não pertence à escola' })
  }
  if (data.subjectId) {
    const sub = await prisma.subject.findFirst({ where: { id: data.subjectId, schoolId } })
    if (!sub) return res.status(404).json({ error: 'Disciplina não pertence à escola' })
  }
  if (data.fileId) {
    const file = await prisma.storedFile.findFirst({ where: { id: data.fileId, schoolId } })
    if (!file) return res.status(404).json({ error: 'Arquivo não pertence à escola' })
  }
  const finalData = { ...data } as any
  if (finalData.contentType === 'HTML' && typeof finalData.body === 'string') {
    finalData.body = sanitizeHtml(finalData.body)
  }
  const lesson = await prisma.lesson.create({ data: { ...finalData, schoolId, createdByUserId: req.user!.id } })
  res.status(201).json(lesson)
})

const patchSchema = createSchema.partial()
router.patch('/:id', requireMembership('TEACHER'), async (req, res) => {
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const id = req.params.id
  const schoolId = req.schoolId!
  // Ensure lesson is in this school
  const exists = await prisma.lesson.findFirst({ where: { id, schoolId }, select: { id: true } })
  if (!exists) return res.status(404).json({ error: 'Aula não encontrada' })
  if (parsed.data.classId) {
    const cls = await prisma.class.findFirst({ where: { id: parsed.data.classId, schoolId } })
    if (!cls) return res.status(404).json({ error: 'Turma não pertence à escola' })
  }
  if (parsed.data.subjectId) {
    const sub = await prisma.subject.findFirst({ where: { id: parsed.data.subjectId, schoolId } })
    if (!sub) return res.status(404).json({ error: 'Disciplina não pertence à escola' })
  }
  if (parsed.data.fileId) {
    const file = await prisma.storedFile.findFirst({ where: { id: parsed.data.fileId, schoolId } })
    if (!file) return res.status(404).json({ error: 'Arquivo não pertence à escola' })
  }
  const patch = { ...parsed.data } as any
  if (patch.contentType === 'HTML' && typeof patch.body === 'string') {
    patch.body = sanitizeHtml(patch.body)
  }
  const lesson = await prisma.lesson.update({ where: { id }, data: patch })
  res.json(lesson)
})

router.delete('/:id', requireMembership('TEACHER'), async (req, res) => {
  const id = req.params.id
  const schoolId = req.schoolId!
  const exists = await prisma.lesson.findFirst({ where: { id, schoolId }, select: { id: true } })
  if (!exists) return res.status(404).json({ error: 'Aula não encontrada' })
  await prisma.lesson.delete({ where: { id } })
  res.status(204).end()
})
