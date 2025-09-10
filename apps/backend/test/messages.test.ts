import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe('Mensagens (communications)', () => {
  let adminToken = ''
  let memberToken = ''
  let schoolId = ''
  let classId = ''

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`
    await request(app).post('/auth/dev-register').send({ name: 'Admin', email: adminEmail, password: 'senha', isAdmin: true })
    const loginAdmin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'senha' })
    adminToken = loginAdmin.body.token

    const school = await request(app)
      .post('/admin/schools')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Escola Mensagens' })
    schoolId = school.body.id

    const userEmail = `user+${Date.now()}@local`
    const user = await request(app).post('/auth/dev-register').send({ name: 'User', email: userEmail, password: 'senha' })
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: user.body.id, role: 'STUDENT' })
    const loginUser = await request(app).post('/auth/login').send({ email: userEmail, password: 'senha' })
    memberToken = loginUser.body.token

    const cls = await request(app).post(`/${schoolId}/classes`).set('Authorization', `Bearer ${adminToken}`).send({ name: '1A', year: 2025 })
    classId = cls.body.id
  })

  it('membro envia mensagem e lista', async () => {
    const sent = await request(app)
      .post(`/${schoolId}/communications/messages`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ content: 'Olá turma!', classId })
    expect(sent.status).toBe(201)

    const list = await request(app)
      .get(`/${schoolId}/communications/messages?page=1&limit=10&q=Olá`)
      .set('Authorization', `Bearer ${memberToken}`)
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body.items)).toBe(true)
  })
})

