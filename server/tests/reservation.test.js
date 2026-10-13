import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Resource Request Quantity Reservation Logic', () => {
  let donorToken;
  let approvedNgoToken;
  let testRequestId;
  let testTransferId;

  beforeAll(async () => {
    // 1. Login Donor
    const donorRes = await request(app).post('/api/auth/login').send({
      email: 'donor@example.com',
      password: 'password123'
    });
    donorToken = donorRes.body.token;

    // 2. Login Approved NGO
    const ngoRes = await request(app).post('/api/auth/login').send({
      email: 'hope@relief.org',
      password: 'password123'
    });
    approvedNgoToken = ngoRes.body.token;

    // 3. Create a fresh request for testing reservation
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .send({
        title: 'Emergency Rations for Flood Victims',
        description: 'Packaged dry ration kits.',
        category: 'Food',
        urgency: 'HIGH',
        quantityNeeded: 50,
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

  it('reserves quantity when donor pledges a valid transfer', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        requestId: testRequestId,
        quantity: 20,
        donorNote: 'Supplying 20 meal kits via courier'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe(20);
    expect(res.body.data.status).toBe('PENDING');
    testTransferId = res.body.data.id;

    // Verify database reflects quantityReserved = 20
    const updatedRequest = await prisma.resourceRequest.findUnique({
      where: { id: testRequestId }
    });
    expect(updatedRequest.quantityReserved).toBe(20);
    expect(updatedRequest.quantityFulfilled).toBe(0);
  });

  it('rejects reservation when pledge exceeds remaining unreserved quantity', async () => {
    // 50 needed - 20 reserved = 30 remaining. Pledging 35 must fail.
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        requestId: testRequestId,
        quantity: 35
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exceeds remaining unreserved quantity/i);

    // Verify quantityReserved did not change
    const checkReq = await prisma.resourceRequest.findUnique({
      where: { id: testRequestId }
    });
    expect(checkReq.quantityReserved).toBe(20);
  });

  it('rejects transfers to unapproved NGOs', async () => {
    // Find Sunshine Animal Sanctuary (PENDING status)
    const pendingNgo = await prisma.ngoProfile.findFirst({
      where: { verificationStatus: 'PENDING' }
    });

    // Create a dummy request directly in DB to simulate an unapproved scenario
    const invalidRequest = await prisma.resourceRequest.create({
      data: {
        ngoProfileId: pendingNgo.id,
        title: 'Unapproved Request',
        description: 'Should not receive donations',
        category: 'Animal Welfare',
        urgency: 'LOW',
        quantityNeeded: 10,
        unit: 'bags',
        location: 'Bengaluru'
      }
    });

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        requestId: invalidRequest.id,
        quantity: 5
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Cannot transfer resources to an NGO with status PENDING/i);

    // Clean up
    await prisma.resourceRequest.delete({ where: { id: invalidRequest.id } });
  });
});
