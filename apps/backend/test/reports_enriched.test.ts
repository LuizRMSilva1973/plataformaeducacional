import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe('Relatórios enriquecidos (attendance/grades com nomes)', () => {
  let adminToken = ''
  let teacherToken = ''
  let schoolId = ''
  let classId = ''
  let subjectId = ''
  let studentUserId = ''

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`
    await request(app).post('/auth/dev-register').send({ name: 'Admin', email: adminEmail, password: 'senha', isAdmin: true })
    const loginAdmin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'senha' })
    adminToken = loginAdmin.body.token

    const school = await request(app).post('/admin/schools').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Escola Reports' })
    schoolId = school.body.id

    const teacherEmail = `prof+${Date.now()}@local`
    const studentEmail = `aluno+${Date.now()}@local`
    const tRes = await request(app).post('/auth/dev-register').send({ name: 'Prof', email: teacherEmail, password: 'senha' })
    const sRes = await request(app).post('/auth/dev-register').send({ name: 'Aluno', email: studentEmail, password: 'senha' })
    studentUserId = sRes.body.id
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: tRes.body.id, role: 'TEACHER' })
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: sRes.body.id, role: 'STUDENT' })
    const loginProf = await request(app).post('/auth/login').send({ email: teacherEmail, password: 'senha' })
    teacherToken = loginProf.body.token

    const cls = await request(app).post(`/${schoolId}/classes`).set('Authorization', `Bearer ${adminToken}`).send({ name: '1A', year: 2025 })
    classId = cls.body.id
    const sub = await request(app).post(`/${schoolId}/subjects`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Matemática' })
    subjectId = sub.body.id
  })

  it('attendance retorna student e class com nomes', async () => {
    await request(app)
      .post(`/${schoolId}/attendance`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ classId, studentUserId, date: new Date().toISOString(), status: 'PRESENT' })

    const res = await request(app)
      .get(`/${schoolId}/attendance?page=1&limit=10`)
      .set('Authorization', `Bearer ${teacherToken}`)

    expect(res.status).toBe(200)
    const item = res.body.items[0]
    expect(item).toHaveProperty('student')
    expect(item.student).toHaveProperty('name')
    expect(item).toHaveProperty('class')
    expect(item.class).toHaveProperty('name')
  })

  it('grades retorna student, class e subject com nomes', async () => {
    await request(app)
      .post(`/${schoolId}/grades`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentUserId, classId, subjectId, value: 8.7 })

    const res = await request(app)
      .get(`/${schoolId}/grades?page=1&limit=10`)
      .set('Authorization', `Bearer ${teacherToken}`)

    expect(res.status).toBe(200)
    const item = res.body.items[0]
    expect(item).toHaveProperty('student')
    expect(item.student).toHaveProperty('name')
    expect(item).toHaveProperty('class')
    expect(item.class).toHaveProperty('name')
    expect(item).toHaveProperty('subject')
    expect(item.subject).toHaveProperty('name')
  })
})

