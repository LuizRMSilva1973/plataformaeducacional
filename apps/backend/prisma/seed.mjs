import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@local',
      passwordHash: await bcrypt.hash('senha', 10),
      isAdmin: true,
    },
  })

  const school = await prisma.school.upsert({
    where: { id: 'seed-school' },
    update: {},
    create: { id: 'seed-school', name: 'Escola Central' },
  })

  const [director, teacher, student] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'diretor@local' },
      update: {},
      create: {
        name: 'Diretor(a) Exemplo',
        email: 'diretor@local',
        passwordHash: await bcrypt.hash('secret', 10),
      },
    }),
    prisma.user.upsert({
      where: { email: 'professor@local' },
      update: {},
      create: {
        name: 'Professor(a) Exemplo',
        email: 'professor@local',
        passwordHash: await bcrypt.hash('secret', 10),
      },
    }),
    prisma.user.upsert({
      where: { email: 'aluno@local' },
      update: {},
      create: {
        name: 'Aluno(a) Exemplo',
        email: 'aluno@local',
        passwordHash: await bcrypt.hash('secret', 10),
      },
    }),
  ])

  await Promise.all([
    prisma.membership.upsert({
      where: { userId_schoolId_role: { userId: director.id, schoolId: school.id, role: 'DIRECTOR' } },
      update: { status: 'ACTIVE' },
      create: { userId: director.id, schoolId: school.id, role: 'DIRECTOR', status: 'ACTIVE' },
    }),
    prisma.membership.upsert({
      where: { userId_schoolId_role: { userId: teacher.id, schoolId: school.id, role: 'TEACHER' } },
      update: { status: 'ACTIVE' },
      create: { userId: teacher.id, schoolId: school.id, role: 'TEACHER', status: 'ACTIVE' },
    }),
    prisma.membership.upsert({
      where: { userId_schoolId_role: { userId: student.id, schoolId: school.id, role: 'STUDENT' } },
      update: { status: 'ACTIVE' },
      create: { userId: student.id, schoolId: school.id, role: 'STUDENT', status: 'ACTIVE' },
    }),
  ])

  const year = new Date().getFullYear()
  const turma = await prisma.class.upsert({
    where: { id: 'seed-class-1A' },
    update: {},
    create: { id: 'seed-class-1A', name: '1A', year, schoolId: school.id },
  })
  const math = await prisma.subject.upsert({
    where: { id: 'seed-subject-math' },
    update: {},
    create: { id: 'seed-subject-math', name: 'Matemática', schoolId: school.id },
  })

  await prisma.teachingAssignment.upsert({
    where: { teacherUserId_classId_subjectId: { teacherUserId: teacher.id, classId: turma.id, subjectId: math.id } },
    update: {},
    create: { teacherUserId: teacher.id, classId: turma.id, subjectId: math.id, schoolId: school.id },
  })

  await prisma.enrollment.upsert({
    where: { studentUserId_classId: { studentUserId: student.id, classId: turma.id } },
    update: {},
    create: { studentUserId: student.id, classId: turma.id, schoolId: school.id },
  })

  const trabalho1 = await prisma.assignment.upsert({
    where: { id: 'seed-assignment-1' },
    update: {},
    create: {
      id: 'seed-assignment-1',
      schoolId: school.id,
      classId: turma.id,
      subjectId: math.id,
      title: 'Trabalho 1 — Frações',
      dueAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
  })

  await prisma.announcement.create({
    data: { schoolId: school.id, classId: turma.id, title: 'Boas-vindas', content: 'Bem-vindos ao ano letivo!' },
  }).catch(() => {})

  await prisma.attendance.create({
    data: { schoolId: school.id, classId: turma.id, studentUserId: student.id, date: new Date(), status: 'PRESENT' },
  }).catch(() => {})

  await prisma.submission.create({
    data: { assignmentId: trabalho1.id, studentUserId: student.id },
  }).catch(() => {})

  await prisma.grade.create({
    data: { schoolId: school.id, studentUserId: student.id, classId: turma.id, subjectId: math.id, assignmentId: trabalho1.id, value: 9.0 },
  }).catch(() => {})

  console.log('Seed concluído:')
  console.log({
    admin: { email: 'admin@local', password: 'senha' },
    director: { email: 'diretor@local', password: 'secret' },
    teacher: { email: 'professor@local', password: 'secret' },
    student: { email: 'aluno@local', password: 'secret' },
    schoolId: school.id,
  })

  // Demo: preços (assinatura mensal da escola e curso avulso)
  await prisma.price.upsert({
    where: { id: 'seed-price-subscription' },
    update: {},
    create: {
      id: 'seed-price-subscription', schoolId: school.id, productType: 'SCHOOL_MEMBERSHIP', productRefId: 'school', amountCents: 2990, currency: 'BRL', interval: 'MONTHLY', active: true
    },
  }).catch(()=>{})
  await prisma.price.upsert({
    where: { id: 'seed-price-course-math' },
    update: {},
    create: {
      id: 'seed-price-course-math', schoolId: school.id, productType: 'SUBJECT_COURSE', productRefId: math.id, amountCents: 1990, currency: 'BRL', interval: 'ONE_TIME', active: true
    },
  }).catch(()=>{})
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
