import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../src/server/app';

const app = createServer();

describe('Memberships', () => {
  let token = '';
  let schoolId = '';
  let userId = '';

  beforeAll(async () => {
    const adminEmail = `admin+${Date.now()}@local`;
    const password = 'senha';
    await request(app).post('/auth/dev-register').send({ name: 'Admin Test', email: adminEmail, password, isAdmin: true });
    const login = await request(app).post('/auth/login').send({ email: adminEmail, password });
    token = login.body.token;

    const school = await request(app)
      .post('/admin/schools')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Escola Teste' });
    expect(school.status).toBe(201);
    schoolId = school.body.id;

    const userRes = await request(app).post('/auth/dev-register').send({ name: 'Professor Teste', email: `prof+${Date.now()}@local`, password: 'secret' });
    userId = userRes.body.id;
  });

  it('admin can add membership to school', async () => {
    const res = await request(app)
      .post(`/${schoolId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId, role: 'TEACHER' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.role).toBe('TEACHER');
  });

  it('lists memberships with pagination and filters', async () => {
    const res = await request(app)
      .get(`/${schoolId}/members?page=1&limit=10&role=TEACHER&sort=name&order=asc`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('meta');
  });
});

