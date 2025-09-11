import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe('Checkout split (manual provider)', () => {
  let adminToken = ''
  let studentToken = ''
  let schoolId = ''
  let subjectId = ''
  let recurringPriceId = ''
  let oneTimePriceId = ''

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`
    await request(app).post('/auth/dev-register').send({ name: 'Admin', email: adminEmail, password: 'senha', isAdmin: true })
    const loginAdmin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'senha' })
    adminToken = loginAdmin.body.token
    await request(app).put('/admin/billing/config').set('Authorization', `Bearer ${adminToken}`).send({ platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' })

    // escola e aluno
    const school = await request(app).post('/admin/schools').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Escola Checkout' })
    schoolId = school.body.id
    const studentEmail = `aluno+${Date.now()}@local`
    const sRes = await request(app).post('/auth/dev-register').send({ name: 'Aluno', email: studentEmail, password: 'senha' })
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: sRes.body.id, role: 'STUDENT' })
    const loginStudent = await request(app).post('/auth/login').send({ email: studentEmail, password: 'senha' })
    studentToken = loginStudent.body.token

    // disciplina e preços
    const sub = await request(app).post(`/${schoolId}/subjects`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Matemática' })
    subjectId = sub.body.id
    const p1 = await request(app).post(`/${schoolId}/pricing`).set('Authorization', `Bearer ${adminToken}`).send({ productType: 'SCHOOL_MEMBERSHIP', productRefId: 'school', amountCents: 5000, interval: 'MONTHLY' })
    recurringPriceId = p1.body.id
    const p2 = await request(app).post(`/${schoolId}/pricing`).set('Authorization', `Bearer ${adminToken}`).send({ productType: 'SUBJECT_COURSE', productRefId: subjectId, amountCents: 3000, interval: 'ONE_TIME' })
    oneTimePriceId = p2.body.id
  })

  it('cria dois pedidos com simulate urls quando MANUAL', async () => {
    const res = await request(app)
      .post(`/${schoolId}/checkout/order`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ priceIds: [recurringPriceId, oneTimePriceId] })
    expect(res.status).toBe(201)
    expect(res.body.provider).toBe('MANUAL')
    expect(Array.isArray(res.body.simulatePaymentUrls)).toBe(true)
    expect(res.body.simulatePaymentUrls.length).toBe(2)

    for (const url of res.body.simulatePaymentUrls){
      const sim = await request(app).post(url).set('Authorization', `Bearer ${studentToken}`).send()
      expect(sim.status).toBe(200)
    }
  })
})

