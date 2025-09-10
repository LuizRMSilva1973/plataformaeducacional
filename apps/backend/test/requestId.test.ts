import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createServer } from '../src/server/app'

const app = createServer()

describe('Request ID propagation', () => {
  it('propaga x-request-id do cliente para a resposta', async () => {
    const rid = `test-${Date.now()}`
    const res = await request(app)
      .get('/health')
      .set('x-request-id', rid)
      .send()
    expect(res.status).toBe(200)
    expect(res.headers['x-request-id']).toBe(rid)
  })
})

