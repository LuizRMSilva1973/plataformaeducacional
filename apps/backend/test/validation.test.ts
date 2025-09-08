import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../src/server/app';

const app = createServer();

describe('Validation', () => {
  let token = '';
  let schoolId = '';

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`;
    const password = 'senha';
    await request(app).post('/auth/dev-register').send({ name: 'Admin Test', email: adminEmail, password, isAdmin: true });
    const login = await request(app).post('/auth/login').send({ email: adminEmail, password });
    token = login.body.token;
    const school = await request(app)
      .post('/admin/schools')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Escola Validação' });
    schoolId = school.body.id;
  });

  it('returns 400 for invalid order param on classes', async () => {
    const res = await request(app)
      .get(`/${schoolId}/classes?page=1&limit=20&order=invalid`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for invalid role on users', async () => {
    const res = await request(app)
      .get(`/${schoolId}/users?role=MANAGER`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

