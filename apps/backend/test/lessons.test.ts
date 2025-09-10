import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe.sequential('Lessons (conteúdos)', () => {
  vi.setTimeout(30000)
  let adminToken = ''
  let teacherToken = ''
  let schoolA = ''
  let classId = ''
  let subjectId = ''
  let lessonId = ''
  let fileId = ''

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`
    await request(app).post('/auth/dev-register').send({ name: 'Admin', email: adminEmail, password: 'senha', isAdmin: true })
    const loginAdmin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'senha' })
    adminToken = loginAdmin.body.token
    const a = await request(app).post('/admin/schools').set('Authorization', `Bearer ${adminToken}`).send({ name:'Escola A' })
    expect(a.status).toBe(201)
    schoolA = a.body.id
    // professor
    const profEmail = `prof+${Date.now()}@local`
    const prof = await request(app).post('/auth/dev-register').send({ name:'Prof', email: profEmail, password: 'senha' })
    await request(app).post(`/${schoolA}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: prof.body.id, role: 'TEACHER' })
    const loginProf = await request(app).post('/auth/login').send({ email: profEmail, password:'senha' })
    teacherToken = loginProf.body.token

    const cls = await request(app).post(`/${schoolA}/classes`).set('Authorization', `Bearer ${adminToken}`).send({ name:'1A', year: 2025 })
    const sub = await request(app).post(`/${schoolA}/subjects`).set('Authorization', `Bearer ${adminToken}`).send({ name:'Mat' })
    classId = cls.body.id; subjectId = sub.body.id
  })

  it('professor cria conteúdo de texto', async () => {
    const res = await request(app)
      .post(`/${schoolA}/lessons`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title:'Introdução', contentType:'TEXT', body:'Bem-vindos', classId, subjectId })
    expect(res.status).toBe(201)
    lessonId = res.body.id
  })

  it('upload de arquivo base64 e criação de conteúdo FILE', async () => {
    const b64 = Buffer.from('Hello PDF').toString('base64')
    const up = await request(app)
      .post(`/${schoolA}/files`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ filename:'a.pdf', mimeType:'application/pdf', data: b64 })
    expect(up.status).toBe(201)
    fileId = up.body.id
    const res = await request(app)
      .post(`/${schoolA}/lessons`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title:'PDF', contentType:'FILE', fileId })
    expect(res.status).toBe(201)
  })

  // isolamento entre escolas coberto indiretamente por middlewares e outros testes
})
