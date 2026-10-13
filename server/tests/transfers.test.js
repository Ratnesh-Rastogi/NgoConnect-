import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Transfer Lifecycle & State Transitions', () => {
  let donorToken;
  let approvedNgoToken;
  let otherNgoToken;
  let testRequestId;
  let testTransferId;

  beforeAll(async () => {
    // 1. Login Donor
    const donorRes = await request(app).post('/api/auth/login').send({
      email: 'donor@example.com',
      password: 'password123'
    });
    donorToken = donorRes.body.token;

    // 2. Login Approved NGO (Hope Relief)
    const ngoRes = await request(app).post('/api/auth/login').send({
      email: 'hope@relief.org',
      password: 'password123'
    });
    approvedNgoToken = ngoRes.body.token;

    // 3. Login other NGO (Clean Water)
    const otherRes = await request(app).post('/api/auth/login').send({
      email: 'cleanwater@health.org',
      password: 'password123'
    });
    otherNgoToken = otherRes.body.token;

    // 4. Create request of 10 items
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({
        title: 'Trauma Burn Kits',
        description: 'Specialized burn care dressings.',
        category: 'Medical',
        urgency: 'CRITICAL',
        quantityNeeded: 10,
        unit: 'kits',
        location: 'New Delhi'
      });
    testRequestId = reqRes.body.data.id;
  });

  afterAll(async () => {
    if (testTransferId) {
      await prisma.transfer.deleteMany({ where: { id: testTransferId } });
    }
    if (testRequestId) {
      await prisma.resourceRequest.deleteMany({ where: { id: testRequestId } });
    }
  });

  it('donor creates transfer in PENDING status', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        requestId: testRequestId,
        quantity: 10,
        donorNote: 'Sending full 10 kits from medical inventory'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    testTransferId = res.body.data.id;

    // Check request quantity reserved
    const req = await prisma.resourceRequest.findUnique({ where: { id: testRequestId } });
    expect(req.quantityReserved).toBe(10);
    expect(req.quantityFulfilled).toBe(0);
  });

  it('prevents unauthorized NGO from marking transfer IN_TRANSIT or RECEIVED', async () => {
    const res = await request(app)
      .patch(`/api/transfers/${testTransferId}/status`)
      .set('Authorization', `Bearer ${otherNgoToken}`)
      .send({ status: 'RECEIVED' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden: Only the receiving NGO/i);
  });

  it('donor transitions transfer to IN_TRANSIT with tracking info', async () => {
    const res = await request(app)
      .patch(`/api/transfers/${testTransferId}/status`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        status: 'IN_TRANSIT',
        trackingInfo: 'BlueDart Air: AWB-98234710'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_TRANSIT');
    expect(res.body.data.trackingInfo).toBe('BlueDart Air: AWB-98234710');
  });

  it('receiving NGO marks transfer as RECEIVED, fulfilling the request', async () => {
    const res = await request(app)
      .patch(`/api/transfers/${testTransferId}/status`)
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({ status: 'RECEIVED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RECEIVED');
    expect(res.body.data.receivedAt).toBeDefined();

    // Verify request fulfilled count and status updated to FULFILLED
    const updatedReq = await prisma.resourceRequest.findUnique({ where: { id: testRequestId } });
    expect(updatedReq.quantityFulfilled).toBe(10);
    expect(updatedReq.quantityReserved).toBe(0);
    expect(updatedReq.status).toBe('FULFILLED');
  });

  it('rejects further status updates on a RECEIVED transfer', async () => {
    const res = await request(app)
      .patch(`/api/transfers/${testTransferId}/status`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot update a transfer that is already RECEIVED/i);
  });

  it('releases reserved quantity when a PENDING transfer is cancelled', async () => {
    // Create new request
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({
        title: 'Temporary Sleeping Mats',
        description: 'Waterproof mats.',
        category: 'Shelter',
        urgency: 'LOW',
        quantityNeeded: 30,
        unit: 'mats',
        location: 'New Delhi'
      });
    const matReqId = reqRes.body.data.id;

    // Create transfer of 15
    const trRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        requestId: matReqId,
        quantity: 15
      });
    const trId = trRes.body.data.id;

    // Verify reserved is 15
    let reqDb = await prisma.resourceRequest.findUnique({ where: { id: matReqId } });
    expect(reqDb.quantityReserved).toBe(15);

    // Cancel transfer
    const cancelRes = await request(app)
      .patch(`/api/transfers/${trId}/status`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ status: 'CANCELLED' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    // Verify reserved returned to 0
    reqDb = await prisma.resourceRequest.findUnique({ where: { id: matReqId } });
    expect(reqDb.quantityReserved).toBe(0);

    // Clean up
    await prisma.transfer.delete({ where: { id: trId } });
    await prisma.resourceRequest.delete({ where: { id: matReqId } });
  });
});
