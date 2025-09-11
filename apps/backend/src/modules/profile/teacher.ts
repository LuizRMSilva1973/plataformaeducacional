import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'

export const router = Router()

router.get('/overview', requireMembership('TEACHER'), async (req, res) => {
  const schoolId = req.schoolId!
  const teacherUserId = req.user!.id

  const teaching = await prisma.teachingAssignment.findMany({
    where: { schoolId, teacherUserId },
    select: { classId: true, subjectId: true, class: { select: { id: true, name: true } }, subject: { select: { id: true, name: true } } }
  })

  const pairs = teaching.map((t: { classId: string; subjectId: string }) => ({ classId: t.classId, subjectId: t.subjectId }))
  let assignments: { id: string }[] = []
  if (pairs.length){
    assignments = await prisma.assignment.findMany({
      where: { schoolId, OR: pairs }, select: { id: true, classId: true, subjectId: true, title: true, dueAt: true }
    }) as any
  }
  const assignmentIds = assignments.map(a=>a.id)
  const pendingCount = assignmentIds.length ? await prisma.submission.count({ where: { assignmentId: { in: assignmentIds }, AND: [ { grade: null } ] } }) : 0
  const recentUngraded = assignmentIds.length ? await prisma.submission.findMany({ where: { assignmentId: { in: assignmentIds }, grade: null }, orderBy: { submittedAt: 'desc' }, take: 5, include: { student: { select: { id: true, name: true, email: true } }, assignment: { select: { id: true, title: true, classId: true, subjectId: true } } } }) : []
  const upcomingAssignments = assignmentIds.length ? await prisma.assignment.findMany({ where: { id: { in: assignmentIds }, dueAt: { gt: new Date() } }, orderBy: { dueAt: 'asc' }, take: 5 }) : []

  res.json({
    classes: teaching.map((t: any)=>({ class: t.class, subject: t.subject })),
    pendingUngraded: pendingCount,
    recentUngraded,
    upcomingAssignments,
  })
})
