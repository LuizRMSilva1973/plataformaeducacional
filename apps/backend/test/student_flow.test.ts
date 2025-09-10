import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe('Fluxo do Aluno (submissões)', () => {
  let adminToken = ''
  let teacherToken = ''
  let studentToken = ''
  let schoolId = ''
  let classId = ''
  let subjectId = ''
  let assignmentId = ''
  let studentUserId = ''

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`
    await request(app).post('/auth/dev-register').send({ name: 'Admin', email: adminEmail, password: 'senha', isAdmin: true })
    const loginAdmin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'senha' })
    adminToken = loginAdmin.body.token

    // escola
    const school = await request(app).post('/admin/schools').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Escola Alunos' })
    schoolId = school.body.id

    // teacher + student
    const teacherEmail = `prof+${Date.now()}@local`
    const studentEmail = `aluno+${Date.now()}@local`
    const tRes = await request(app).post('/auth/dev-register').send({ name: 'Prof', email: teacherEmail, password: 'senha' })
    const sRes = await request(app).post('/auth/dev-register').send({ name: 'Aluno', email: studentEmail, password: 'senha' })
    studentUserId = sRes.body.id
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: tRes.body.id, role: 'TEACHER' })
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: sRes.body.id, role: 'STUDENT' })

    const loginProf = await request(app).post('/auth/login').send({ email: teacherEmail, password: 'senha' })
    teacherToken = loginProf.body.token
    const loginStudent = await request(app).post('/auth/login').send({ email: studentEmail, password: 'senha' })
    studentToken = loginStudent.body.token

    // class + subject + assignment
    const cls = await request(app).post(`/${schoolId}/classes`).set('Authorization', `Bearer ${adminToken}`).send({ name: '1A', year: 2025 })
    classId = cls.body.id
    const sub = await request(app).post(`/${schoolId}/subjects`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Matemática' })
    subjectId = sub.body.id
    const ass = await request(app)
      .post(`/${schoolId}/assignments`).set('Authorization', `Bearer ${teacherToken}`)
      .send({ classId, subjectId, title: 'Lista 1' })
    assignmentId = ass.body.id
  })

  it('aluno envia submissão e lista suas submissões', async () => {
    const sub = await request(app)
      .post(`/${schoolId}/submissions`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ assignmentId })
    expect(sub.status).toBe(201)

    const list = await request(app)
      .get(`/${schoolId}/submissions?page=1&limit=10&assignmentId=${assignmentId}&studentUserId=${studentUserId}`)
      .set('Authorization', `Bearer ${studentToken}`)
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body.items)).toBe(true)
  })
})

