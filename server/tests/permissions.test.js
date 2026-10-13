import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Permissions & Role-Based Access Control', () => {
  let adminToken;
  let approvedNgoToken;
  let pendingNgoToken;
  let donorToken;
  let createdRequestId;

  beforeAll(async () => {
    // 1. Login Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ngoconnect.org',
      password: 'password123'
    });
    adminToken = adminRes.body.token;

    // 2. Login Approved NGO (Hope Relief Foundation)
    const approvedNgoRes = await request(app).post('/api/auth/login').send({
      email: 'hope@relief.org',
      password: 'password123'
    });
    approvedNgoToken = approvedNgoRes.body.token;

    // 3. Login Pending NGO (Sunshine Animal Sanctuary)
    const pendingNgoRes = await request(app).post('/api/auth/login').send({
      email: 'sunshine@animals.org',
      password: 'password123'
    });
    pendingNgoToken = pendingNgoRes.body.token;

    // 4. Login Donor
    const donorRes = await request(app).post('/api/auth/login').send({
      email: 'donor@example.com',
      password: 'password123'
    });
    donorToken = donorRes.body.token;
  });

  afterAll(async () => {
    if (createdRequestId) {
      await prisma.resourceRequest.deleteMany({ where: { id: createdRequestId } });
    }
  });

  it('allows unauthenticated visitors to view approved NGOs', async () => {
    const res = await request(app).get('/api/ngos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // All listed NGOs must be APPROVED
    res.body.data.forEach((ngo) => {
      expect(ngo.verificationStatus).toBe('APPROVED');
      expect(ngo.verificationDocUrl).toBeUndefined(); // Sensitive fields stripped
    });
  });

  it('prevents a PENDING NGO from creating resource requests', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${pendingNgoToken}`)
      .send({
        title: 'Shelter Bedding for Rescued Pups',
        description: 'Urgent need for bedding materials for stray dogs.',
        category: 'Shelter',
        urgency: 'HIGH',
        quantityNeeded: 20,
        unit: 'beds',
        location: 'Bengaluru'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Only APPROVED NGOs can/i);
  });

  it('allows an APPROVED NGO to create a resource request', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({
        title: 'Hygiene Kits for Flood Relief',
        description: 'Sanitary products, soap, and masks for affected families.',
        category: 'Healthcare',
        urgency: 'HIGH',
        quantityNeeded: 100,
        unit: 'kits',
        location: 'New Delhi'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Hygiene Kits for Flood Relief');
    expect(res.body.data.status).toBe('OPEN');
    createdRequestId = res.body.data.id;
  });

  it('prevents a donor or unrelated NGO from modifying another NGO request (ownership check)', async () => {
    // Donor attempting to modify
    const donorModRes = await request(app)
      .put(`/api/requests/${createdRequestId}`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ title: 'Hacked Title' });
    expect(donorModRes.status).toBe(403);

    // Another NGO attempting to modify
    const otherNgoRes = await request(app)
      .put(`/api/requests/${createdRequestId}`)
      .set('Authorization', `Bearer ${pendingNgoToken}`)
      .send({ title: 'Hijacked Title' });
    expect(otherNgoRes.status).toBe(403);
  });

  it('prevents non-admins from changing NGO verification status', async () => {
    const res = await request(app)
      .patch('/api/ngos/admin/dummy-id/status')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ verificationStatus: 'APPROVED' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/i);
  });

  it('allows Admin to approve a pending NGO', async () => {
    // Find Sunshine Animal Sanctuary
    const pendingNgo = await prisma.ngoProfile.findFirst({
      where: { orgName: 'Sunshine Animal Sanctuary' }
    });

    const res = await request(app)
      .patch(`/api/ngos/admin/${pendingNgo.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        verificationStatus: 'APPROVED',
        verificationNotes: 'Verified registration document via official portal.'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('APPROVED');

    // Revert to PENDING so other tests have expected initial seed state
    await prisma.ngoProfile.update({
      where: { id: pendingNgo.id },
      data: { verificationStatus: 'PENDING' }
    });
  });
});
