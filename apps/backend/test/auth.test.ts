import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../src/server/app';

const app = createServer();

describe('Auth', () => {
  let email = `tester+${Date.now()}@local`;
  let password = 'senha';

  it('dev-register creates a user', async () => {
    const res = await request(app)
      .post('/auth/dev-register')
      .send({ name: 'Tester', email, password, isAdmin: true });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('login returns a JWT', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});

