import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Auth & Security Hardening Tests', () => {
  const testEmailDonor = `test.sec.donor.${Date.now()}@example.com`;
  const testEmailNgo = `test.sec.ngo.${Date.now()}@example.com`;
  let authCookie;

  afterAll(async () => {
    // Clean up test records
    await prisma.ngoProfile.deleteMany({
      where: { user: { email: { in: [testEmailDonor, testEmailNgo] } } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testEmailDonor, testEmailNgo] } }
    });
  });

  it('includes security headers powered by helmet', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options'] || res.headers['content-security-policy']).toBeDefined();
  });

  it('successfully registers a donor and sets httpOnly SameSite=Lax cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmailDonor,
        password: 'password123',
        name: 'Test Secure Donor',
        role: 'donor'
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(testEmailDonor);
    expect(res.body.user.role).toBe('donor');
    expect(res.body.user.passwordHash).toBeUndefined();

    // Verify httpOnly cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toMatch(/HttpOnly/i);
    expect(tokenCookie).toMatch(/SameSite=Lax/i);
  });

  it('rejects duplicate email registration with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmailDonor,
        password: 'password123',
        name: 'Duplicate Donor',
        role: 'donor'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('registers an NGO with initial PENDING verification status', async () => {
    const regNumber = `REG-SEC-${Date.now()}`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmailNgo,
        password: 'password123',
        name: 'NGO Lead',
        role: 'ngo',
        orgName: 'Community Security Hands',
        regNumber,
        description: 'Providing food and shelter to urban poor',
        category: 'Food Relief',
        contactPhone: '+91 99999 11111',
        address: '123 Market Street',
        city: 'Delhi'
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('ngo');
    expect(res.body.user.ngoProfile.verificationStatus).toBe('PENDING');
  });

  it('logs in successfully and returns httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmailDonor,
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmailDonor);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toMatch(/HttpOnly/i);
    expect(tokenCookie).toMatch(/SameSite=Lax/i);

    authCookie = tokenCookie.split(';')[0]; // Save 'token=...'
  });

  it('authenticates /api/auth/me using the httpOnly cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmailDonor);
    expect(res.body.user.name).toBe('Test Secure Donor');
  });

  it('clears httpOnly cookie on /api/auth/logout', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    // Cleared cookie has expired date or max-age=0
    expect(tokenCookie).toMatch(/Expires=|Max-Age=0/i);
  });

  it('rejects invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmailDonor,
        password: 'wrong_password'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  it('enforces 100kb JSON body size limit', async () => {
    // Generate body exceeding 100kb
    const largeString = 'x'.repeat(105 * 1024);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'donor@example.com', password: largeString });

    expect(res.status).toBe(413);
  });
});
