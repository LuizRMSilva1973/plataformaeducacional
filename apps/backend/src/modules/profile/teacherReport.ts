import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'

export const router = Router()

router.get('/report', requireMembership('TEACHER'), async (req, res) => {
  const schoolId = req.schoolId!
  const teacherUserId = req.user!.id
  // Classes/subjects do professor
  const teach = await prisma.teachingAssignment.findMany({ where: { schoolId, teacherUserId }, select: { classId: true, subjectId: true, class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } } })
  const pairs = teach.map((t: { classId: string; subjectId: string })=>({ classId: t.classId, subjectId: t.subjectId }))
  if (!pairs.length) return res.json({ items: [] })
  // Médias de notas por turma/disciplina
  const grades = await prisma.grade.groupBy({ by: ['classId','subjectId'], where: { schoolId, OR: pairs }, _avg: { value: true }, _count: { _all: true } })
  // Taxa de presença por turma (PRESENT / total)
  const attTotal = await prisma.attendance.groupBy({ by: ['classId'], where: { schoolId, classId: { in: Array.from(new Set(pairs.map((p:any)=>p.classId))) } }, _count: { _all: true } })
  const attPresent = await prisma.attendance.groupBy({ by: ['classId'], where: { schoolId, status: 'PRESENT', classId: { in: Array.from(new Set(pairs.map((p:any)=>p.classId))) } }, _count: { _all: true } })
  const mapTotal = new Map(attTotal.map((r:any)=>[r.classId, r._count._all]))
  const mapPres = new Map(attPresent.map((r:any)=>[r.classId, r._count._all]))
  const items = teach.map((t: any) => {
    const g = grades.find((x:any)=>x.classId===t.classId && x.subjectId===t.subjectId)
    const total = mapTotal.get(t.classId) || 0
    const pres = mapPres.get(t.classId) || 0
    const attendanceRate = total ? (pres as number)/(total as number) : null
    return { class: t.class, subject: t.subject, avgGrade: (g?._avg?.value as number) || null, gradesCount: (g?._count?._all as number) || 0, attendanceRate }
  })
  res.json({ items })
})
