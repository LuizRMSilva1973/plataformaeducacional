import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'
import { z } from 'zod'

export const router = Router()

router.get('/export', requireMembership('TEACHER'), async (req, res) => {
  const schoolId = req.schoolId!
  const schema = z.object({ assignmentId: z.string(), classId: z.string().optional(), studentUserId: z.string().optional(), format: z.enum(['json','csv','xlsx']).optional() })
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { assignmentId, format, classId, studentUserId } = parsed.data
  const a = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { class: true, subject: true, AssignmentRubric: { include: { rubric: { include: { criteria: true } } } } } })
  if (!a || a.schoolId !== schoolId) return res.status(404).json({ error: 'Assignment not found' })
  const can = await prisma.teachingAssignment.findFirst({ where: { schoolId, teacherUserId: req.user!.id, classId: a.classId, subjectId: a.subjectId } })
  if (!can) return res.status(403).json({ error: 'Not allowed' })

  const subs = await prisma.submission.findMany({ where: { assignmentId, ...(studentUserId ? { studentUserId } : {}) }, include: { student: { select: { id: true, name: true, email: true } }, SubmissionFeedback: { include: { items: true } }, assignment: { select: { classId: true } } } })
  const filteredSubs = classId ? subs.filter((s:any)=>s.assignment?.classId===classId) : subs
  const criteria = (a.AssignmentRubric?.rubric?.criteria || []) as any[]
  const header = ['submissionId','studentName','studentEmail', ...criteria.map((c:any)=>`c:${c.label}`), 'comment']
  const rows = filteredSubs.map((s:any) => {
    const fb = (s as any).SubmissionFeedback
    const map = new Map<string, number>()
    for (const it of (fb?.items||[])) map.set(it.criterionId, it.score)
    const cols = criteria.map((c:any)=> String(map.get(c.id) ?? ''))
    return [s.id, s.student?.name||'', s.student?.email||'', ...cols, fb?.comment||'']
  })

  if (format === 'csv'){
    const lines = [header.join(','), ...rows.map((r:any)=>r.join(','))]
    const csv = lines.join('\n')
    res.setHeader('Content-Type','text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="feedback-${assignmentId}.csv"`)
    return res.send(csv)
  }
  if (format === 'xlsx'){
    function cell(v: string){ return `<Cell><Data ss:Type=\"String\">${v}</Data></Cell>` }
    const rowsXml = ['<Row>'+header.map(cell).join('')+'</Row>', ...rows.map((r:any)=>'<Row>'+r.map(cell).join('')+'</Row>')].join('')
    const xml = `<?xml version=\"1.0\"?>\n<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\"><Worksheet ss:Name=\"Feedback\"><Table>${rowsXml}</Table></Worksheet></Workbook>`
    res.setHeader('Content-Type','application/vnd.ms-excel')
    res.setHeader('Content-Disposition', `attachment; filename="feedback-${assignmentId}.xls"`)
    return res.send(xml)
  }
  return res.json({ header, rows })
})
