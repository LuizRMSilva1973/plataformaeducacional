import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe('Refund flow (manual)', () => {
  let adminToken = ''
  let studentToken = ''
  let schoolId = ''
  let subjectId = ''
  let recurringPriceId = ''
  let oneTimePriceId = ''
  let orderIds: string[] = []

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`
    await request(app).post('/auth/dev-register').send({ name: 'Admin', email: adminEmail, password: 'senha', isAdmin: true })
    const loginAdmin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'senha' })
    adminToken = loginAdmin.body.token
    await request(app).put('/admin/billing/config').set('Authorization', `Bearer ${adminToken}`).send({ platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' })

    const school = await request(app).post('/admin/schools').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Escola Refund' })
    schoolId = school.body.id
    const studentEmail = `aluno+${Date.now()}@local`
    const sRes = await request(app).post('/auth/dev-register').send({ name: 'Aluno', email: studentEmail, password: 'senha' })
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: sRes.body.id, role: 'STUDENT' })
    const loginStudent = await request(app).post('/auth/login').send({ email: studentEmail, password: 'senha' })
    studentToken = loginStudent.body.token

    const sub = await request(app).post(`/${schoolId}/subjects`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'História' })
    subjectId = sub.body.id
    const p1 = await request(app).post(`/${schoolId}/pricing`).set('Authorization', `Bearer ${adminToken}`).send({ productType: 'SCHOOL_MEMBERSHIP', productRefId: 'school', amountCents: 4000, interval: 'MONTHLY' })
    recurringPriceId = p1.body.id
    const p2 = await request(app).post(`/${schoolId}/pricing`).set('Authorization', `Bearer ${adminToken}`).send({ productType: 'SUBJECT_COURSE', productRefId: subjectId, amountCents: 2000, interval: 'ONE_TIME' })
    oneTimePriceId = p2.body.id
  })

  it('paga (simulado) e reembolsa pedidos', async () => {
    const orderRes = await request(app)
      .post(`/${schoolId}/checkout/order`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ priceIds: [recurringPriceId, oneTimePriceId] })
    expect(orderRes.status).toBe(201)
    expect(orderRes.body.provider).toBe('MANUAL')
    expect(Array.isArray(orderRes.body.simulatePaymentUrls)).toBe(true)
    orderIds = orderRes.body.orders.map((o:any)=>o.id)
    for (const url of orderRes.body.simulatePaymentUrls){
      const sim = await request(app).post(url).set('Authorization', `Bearer ${studentToken}`).send()
      expect(sim.status).toBe(200)
    }

    // Refund the one-time order
    const oneTimeOrder = orderRes.body.orders.find((o:any)=> o.items.some((it:any)=>it.interval==='ONE_TIME'))
    const refund = await request(app).post(`/${schoolId}/orders/${oneTimeOrder.id}/refund`).set('Authorization', `Bearer ${adminToken}`).send()
    expect(refund.status).toBe(200)
    expect(refund.body.status).toBe('REFUNDED')
  })
})

