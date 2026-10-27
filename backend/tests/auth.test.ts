/**
 * Integration tests - Authentication & role authorization.
 *
 * These tests hit a real Postgres database through Prisma, exactly like the
 * running application. Set DATABASE_URL to a disposable TEST database before
 * running (see README "Testing" section) - never point this at production data,
 * since the suite creates and deletes rows.
 */
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

describe('Auth & role authorization', () => {
  let adminEmail: string;
  let nurseEmail: string;
  const password = 'TestPassword123!';

  beforeAll(async () => {
    adminEmail = `test-admin-${Date.now()}@rams.com`;
    nurseEmail = `test-nurse-${Date.now()}@rams.com`;
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { userId: `TADM-${Date.now()}`, name: 'Test Admin', email: adminEmail, passwordHash, role: 'ADMIN' }
    });
    await prisma.user.create({
      data: { userId: `TNUR-${Date.now()}`, name: 'Test Nurse', email: nurseEmail, passwordHash, role: 'NURSE' }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, nurseEmail] } } });
    await prisma.$disconnect();
  });

  it('rejects login with an invalid password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('logs in successfully with valid credentials and returns a JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: adminEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('rejects unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(401);
  });

  it('enforces backend role authorization on an admin-only endpoint even with a valid token', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: nurseEmail, password });
    const token = loginRes.body.data.token;

    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows an admin to access the admin-only endpoint', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: adminEmail, password });
    const token = loginRes.body.data.token;

    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
