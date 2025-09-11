import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe('Orders filters (manual)', () => {
  let adminToken = ''
  let directorToken = ''
  let studentToken = ''
  let schoolId = ''
  let subjId = ''
  let priceId = ''

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`
    await request(app).post('/auth/dev-register').send({ name: 'Admin', email: adminEmail, password: 'senha', isAdmin: true })
    const loginAdmin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'senha' })
    adminToken = loginAdmin.body.token
    await request(app).put('/admin/billing/config').set('Authorization', `Bearer ${adminToken}`).send({ platformFeePercent: 10, defaultPaymentProvider: 'MANUAL' })

    const school = await request(app).post('/admin/schools').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Escola Orders' })
    schoolId = school.body.id
    const dirEmail = `diretor+${Date.now()}@local`
    const studEmail = `aluno+${Date.now()}@local`
    const dirRes = await request(app).post('/auth/dev-register').send({ name: 'Dir', email: dirEmail, password: 'senha' })
    const stuRes = await request(app).post('/auth/dev-register').send({ name: 'Stu', email: studEmail, password: 'senha' })
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: dirRes.body.id, role: 'DIRECTOR' })
    await request(app).post(`/${schoolId}/members`).set('Authorization', `Bearer ${adminToken}`).send({ userId: stuRes.body.id, role: 'STUDENT' })
    directorToken = (await request(app).post('/auth/login').send({ email: dirEmail, password: 'senha' })).body.token
    studentToken = (await request(app).post('/auth/login').send({ email: studEmail, password: 'senha' })).body.token

    const sub = await request(app).post(`/${schoolId}/subjects`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Ciências' })
    subjId = sub.body.id
    const p = await request(app).post(`/${schoolId}/pricing`).set('Authorization', `Bearer ${adminToken}`).send({ productType: 'SUBJECT_COURSE', productRefId: subjId, amountCents: 1234, interval: 'ONE_TIME' })
    priceId = p.body.id

    const ord = await request(app).post(`/${schoolId}/checkout/order`).set('Authorization', `Bearer ${studentToken}`).send({ priceIds: [priceId] })
    await request(app).post(ord.body.simulatePaymentUrls[0]).set('Authorization', `Bearer ${studentToken}`).send()
  })

  it('lists orders filtered by buyerEmail and status', async () => {
    const list = await request(app).get(`/${schoolId}/orders?status=PAID&buyerEmail=aluno%40local`).set('Authorization', `Bearer ${directorToken}`)
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body.items)).toBe(true)
    expect(list.body.items.length).toBeGreaterThan(0)
    expect(list.body.items[0].status).toBe('PAID')
  })
})

