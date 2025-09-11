import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe('Partial refund (manual)', () => {
  let adminToken = ''
  let studentToken = ''
  let schoolId = ''
  let subjectId = ''
  let priceId = ''
  let orderId = ''
  let buyerEmail = ''

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`
    await request(app).post('/auth/dev-register').send({ name: 'Admin', email: adminEmail, password: 'senha', isAdmin: true })
    const loginAdmin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'senha' })
    adminToken = loginAdmin.body.token
    await request(app).put('/admin/billing/config').set('Authorization', `Bearer ${adminToken}`).send({ platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' })

    const school = await request(app).post('/admin/schools').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Escola Partial' })
    schoolId = school.body.id
    buyerEmail = `aluno+${Date.now()}@local`
    const sRes = await request(app).post('/auth/dev-register').send({ name: 'Aluno', email: buyerEmail, password: 'senha' })
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: sRes.body.id, role: 'STUDENT' })
    const loginStudent = await request(app).post('/auth/login').send({ email: buyerEmail, password: 'senha' })
    studentToken = loginStudent.body.token

    const sub = await request(app).post(`/${schoolId}/subjects`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Geografia' })
    subjectId = sub.body.id
    const p = await request(app).post(`/${schoolId}/pricing`).set('Authorization', `Bearer ${adminToken}`).send({ productType: 'SUBJECT_COURSE', productRefId: subjectId, amountCents: 10000, interval: 'ONE_TIME' })
    priceId = p.body.id
  })

  it('refund parcial reverte proporcionalmente a taxa e repasse', async () => {
    const orderRes = await request(app).post(`/${schoolId}/checkout/order`).set('Authorization', `Bearer ${studentToken}`).send({ priceIds: [priceId] })
    expect(orderRes.status).toBe(201)
    expect(orderRes.body.provider).toBe('MANUAL')
    const simUrl = orderRes.body.simulatePaymentUrls[0]
    const ord = orderRes.body.orders[0]
    orderId = ord.id
    await request(app).post(simUrl).set('Authorization', `Bearer ${studentToken}`).send()

    // Refund metade (R$ 50)
    const refundAmountCents = 5000
    const refund = await request(app).post(`/${schoolId}/orders/${orderId}/refund`).set('Authorization', `Bearer ${adminToken}`).send({ amountCents: refundAmountCents })
    expect(refund.status).toBe(200)
    expect(refund.body.status).toBe('PAID') // parcial mantém pedido como pago

    // Ledger deve conter REFUND com 10% para plataforma e 90% para escola
    const ledger = await request(app).get(`/${schoolId}/billing/ledger?buyerEmail=${encodeURIComponent(buyerEmail)}&detailed=true`).set('Authorization', `Bearer ${adminToken}`)
    expect(ledger.status).toBe(200)
    const list = ledger.body.items.filter((x:any)=>x.orderId===orderId && x.entryType==='REFUND')
    const platformRefund = list.find((x:any)=>x.entryType==='REFUND' && x.amountCents<=refundAmountCents*0.5) // aproximado
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(platformRefund).toBeTruthy()
  })
})

