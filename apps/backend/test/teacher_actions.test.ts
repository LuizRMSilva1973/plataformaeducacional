import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe('Ações do Professor (attendance/grades)', () => {
  let adminToken = ''
  let teacherToken = ''
  let schoolId = ''
  let classId = ''
  let subjectId = ''
  let studentUserId = ''

  beforeAll(async () => {
    // admin
    const adminEmail = `admin+${Date.now()}@local`
    await request(app).post('/auth/dev-register').send({ name: 'Admin', email: adminEmail, password: 'senha', isAdmin: true })
    const loginAdmin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'senha' })
    adminToken = loginAdmin.body.token

    // cria escola
    const school = await request(app)
      .post('/admin/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Escola Professores' })
    expect(school.status).toBe(201)
    schoolId = school.body.id

    // cria professor e aluno
    const teacherEmail = `prof+${Date.now()}@local`
    const studentEmail = `aluno+${Date.now()}@local`
    const tRes = await request(app).post('/auth/dev-register').send({ name: 'Professor', email: teacherEmail, password: 'senha' })
    const sRes = await request(app).post('/auth/dev-register').send({ name: 'Aluno', email: studentEmail, password: 'senha' })

    // vincula papéis
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: tRes.body.id, role: 'TEACHER' })
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: sRes.body.id, role: 'STUDENT' })

    // login professor
    const loginProf = await request(app).post('/auth/login').send({ email: teacherEmail, password: 'senha' })
    teacherToken = loginProf.body.token
    studentUserId = sRes.body.id

    // cria turma e disciplina (via admin)
    const cls = await request(app).post(`/${schoolId}/classes`).set('Authorization', `Bearer ${adminToken}`).send({ name: '1A', year: 2025 })
    const sub = await request(app).post(`/${schoolId}/subjects`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Matemática' })
    classId = cls.body.id
    subjectId = sub.body.id
  })

  it('professor registra presença', async () => {
    const res = await request(app)
      .post(`/${schoolId}/attendance`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ classId, studentUserId, date: new Date().toISOString(), status: 'PRESENT' })
    expect(res.status).toBe(201)
  })

  it('professor lança nota', async () => {
    const res = await request(app)
      .post(`/${schoolId}/grades`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentUserId, classId, subjectId, value: 9.0 })
    expect(res.status).toBe(201)
  })
})

