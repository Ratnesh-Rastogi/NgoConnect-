import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Resource Listings, Atomic Claims & Lifecycle Tests', () => {
  let donorToken;
  let approvedNgo1Token; // Hope Relief
  let approvedNgo2Token; // Clean Water
  let pendingNgoToken;   // Sunshine Animal
  let adminToken;
  let testCategoryId;

  // Track created resource and transfer IDs for cleanup
  const createdResourceIds = [];
  const createdTransferIds = [];

  beforeAll(async () => {
    // 1. Fetch category ID
    const cat = await prisma.category.findFirst({ where: { slug: 'food-distribution' } });
    testCategoryId = cat.id;

    // 2. Login Donor
    const donorRes = await request(app).post('/api/auth/login').send({
      email: 'donor@example.com',
      password: 'password123'
    });
    donorToken = donorRes.body.token;

    // 3. Login Approved NGO 1 (Hope Relief)
    const ngo1Res = await request(app).post('/api/auth/login').send({
      email: 'hope@relief.org',
      password: 'password123'
    });
    approvedNgo1Token = ngo1Res.body.token;

    // 4. Login Approved NGO 2 (Clean Water)
    const ngo2Res = await request(app).post('/api/auth/login').send({
      email: 'cleanwater@health.org',
      password: 'password123'
    });
    approvedNgo2Token = ngo2Res.body.token;

    // 5. Login Pending NGO (Sunshine Animal)
    const pendingRes = await request(app).post('/api/auth/login').send({
      email: 'sunshine@animals.org',
      password: 'password123'
    });
    pendingNgoToken = pendingRes.body.token;

    // 6. Login Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ngoconnect.org',
      password: 'password123'
    });
    adminToken = adminRes.body.token;
  });

  afterAll(async () => {
    if (createdTransferIds.length > 0) {
      await prisma.transfer.deleteMany({
        where: { id: { in: createdTransferIds } }
      });
    }
    if (createdResourceIds.length > 0) {
      await prisma.resource.deleteMany({
        where: { id: { in: createdResourceIds } }
      });
    }
  });

  // --- 1. Role & Approval Rules for Resource Creation ---
  it('prevents unauthenticated visitor from creating a resource', async () => {
    const res = await request(app)
      .post('/api/resources')
      .send({
        title: 'Emergency Blankets',
        description: 'Warm fleece blankets',
        categoryId: testCategoryId,
        quantityTotal: 50,
        unit: 'blankets',
        city: 'Delhi'
      });
    expect(res.status).toBe(401);
  });

  it('prevents a PENDING NGO from creating a resource listing', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${pendingNgoToken}`)
      .send({
        title: 'Pet Food Bags',
        description: 'High protein dog food',
        categoryId: testCategoryId,
        quantityTotal: 20,
        unit: 'bags',
        city: 'Bengaluru'
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Only donors and APPROVED NGOs/i);
  });

  it('allows a donor to create a resource listing', async () => {
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Rice & Dal Rations',
        description: 'Sealed 10kg grain bags in good condition',
        categoryId: testCategoryId,
        quantityTotal: 25,
        unit: 'bags',
        expiryDate: nextMonth,
        city: 'New Delhi'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Rice & Dal Rations');
    expect(res.body.data.quantityAvailable).toBe(25);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.latitude).toBeDefined();
    expect(res.body.data.longitude).toBeDefined();

    createdResourceIds.push(res.body.data.id);
  });

  it('allows an APPROVED NGO to create a resource listing', async () => {
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${approvedNgo1Token}`)
      .send({
        title: 'Excess First Aid Kits',
        description: 'Surplus bandages and antiseptic solutions',
        categoryId: testCategoryId,
        quantityTotal: 15,
        unit: 'kits',
        city: 'Bengaluru'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.quantityAvailable).toBe(15);
    createdResourceIds.push(res.body.data.id);
  });

  // --- 2. Expiry Validation ---
  it('rejects resource creation with an expiry date in the past', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Expired Milk Powder',
        description: 'Powder packs',
        categoryId: testCategoryId,
        quantityTotal: 10,
        unit: 'packs',
        expiryDate: pastDate,
        city: 'Delhi'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Expiry date cannot be in the past/i);
  });

  // --- 3. Ownership & Edit / Withdraw Rules ---
  it('prevents non-owner from editing or withdrawing another user resource', async () => {
    // Create a donor resource
    const createRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Sanitizer Bottles',
        description: '500ml bottles',
        categoryId: testCategoryId,
        quantityTotal: 40,
        unit: 'bottles',
        city: 'Mumbai'
      });
    const resId = createRes.body.data.id;
    createdResourceIds.push(resId);

    // Another NGO tries to edit
    const editRes = await request(app)
      .put(`/api/resources/${resId}`)
      .set('Authorization', `Bearer ${approvedNgo1Token}`)
      .send({ title: 'Hijacked Sanitizers' });

    expect(editRes.status).toBe(403);
    expect(editRes.body.error).toMatch(/Forbidden/i);

    // Another NGO tries to withdraw
    const withdrawRes = await request(app)
      .patch(`/api/resources/${resId}/withdraw`)
      .set('Authorization', `Bearer ${approvedNgo1Token}`);

    expect(withdrawRes.status).toBe(403);
  });

  it('allows owner to edit and withdraw resource, transitioning to WITHDRAWN status', async () => {
    const createRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Tarpaulins for Roofing',
        description: 'Heavy duty sheets',
        categoryId: testCategoryId,
        quantityTotal: 12,
        unit: 'sheets',
        city: 'Patna'
      });
    const resId = createRes.body.data.id;
    createdResourceIds.push(resId);

    // Edit
    const editRes = await request(app)
      .put(`/api/resources/${resId}`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ title: 'Updated Heavy Duty Tarpaulins' });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.title).toBe('Updated Heavy Duty Tarpaulins');

    // Withdraw
    const withdrawRes = await request(app)
      .patch(`/api/resources/${resId}/withdraw`)
      .set('Authorization', `Bearer ${donorToken}`);
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.status).toBe('WITHDRAWN');
  });

  // --- 4. Point 4: Block an NGO from claiming a resource it owns ---
  it('blocks an NGO from claiming a resource it owns', async () => {
    // NGO 1 lists a resource
    const createRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${approvedNgo1Token}`)
      .send({
        title: 'Surplus Tents',
        description: 'Camping tents for displaced families',
        categoryId: testCategoryId,
        quantityTotal: 5,
        unit: 'tents',
        city: 'Delhi'
      });
    const tentResourceId = createRes.body.data.id;
    createdResourceIds.push(tentResourceId);

    // NGO 1 tries to claim its own resource
    const selfClaimRes = await request(app)
      .post(`/api/resources/${tentResourceId}/claim`)
      .set('Authorization', `Bearer ${approvedNgo1Token}`)
      .send({
        quantity: 2,
        claimNote: 'Self-claiming our own tents'
      });

    expect(selfClaimRes.status).toBe(403);
    expect(selfClaimRes.body.error).toMatch(/cannot claim a resource it owns/i);
  });

  // --- 5. Atomic Claim & Concurrency: Two NGOs claiming last units at the same time ---
  it('handles race conditions: two NGOs claiming the last units at the same time', async () => {
    // Create donor resource with 10 units
    const createRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Solar Lanterns',
        description: 'Rechargeable lanterns for relief camps',
        categoryId: testCategoryId,
        quantityTotal: 10,
        unit: 'lanterns',
        city: 'Kolkata'
      });
    const lanternId = createRes.body.data.id;
    createdResourceIds.push(lanternId);

    // Both Approved NGOs attempt to claim all 10 units concurrently
    const [claim1Res, claim2Res] = await Promise.all([
      request(app)
        .post(`/api/resources/${lanternId}/claim`)
        .set('Authorization', `Bearer ${approvedNgo1Token}`)
        .send({ quantity: 10, claimNote: 'Hope Relief claiming lanterns' }),
      request(app)
        .post(`/api/resources/${lanternId}/claim`)
        .set('Authorization', `Bearer ${approvedNgo2Token}`)
        .send({ quantity: 10, claimNote: 'Clean Water claiming lanterns' })
    ]);

    const statuses = [claim1Res.status, claim2Res.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    const successfulRes = claim1Res.status === 201 ? claim1Res : claim2Res;
    const failedRes = claim1Res.status === 201 ? claim2Res : claim1Res;

    expect(successfulRes.body.data.quantity).toBe(10);
    expect(failedRes.body.error).toMatch(/Insufficient available quantity|Cannot claim a resource with status/i);
    createdTransferIds.push(successfulRes.body.data.id);

    // Verify DB state: quantityAvailable = 0, status = EXHAUSTED
    const dbLantern = await prisma.resource.findUnique({ where: { id: lanternId } });
    expect(dbLantern.quantityAvailable).toBe(0);
    expect(dbLantern.status).toBe('EXHAUSTED');
  });

  // --- 6. Point 3: Transfer status transitions when requestId is null ---
  it('progresses transfer status (IN_TRANSIT -> RECEIVED) when requestId is null', async () => {
    // Create resource with 8 units
    const createRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Water Purification Tablets',
        description: 'Chlorine purification strips',
        categoryId: testCategoryId,
        quantityTotal: 8,
        unit: 'packs',
        city: 'Chennai'
      });
    const resId = createRes.body.data.id;
    createdResourceIds.push(resId);

    // NGO 1 claims 4 units
    const claimRes = await request(app)
      .post(`/api/resources/${resId}/claim`)
      .set('Authorization', `Bearer ${approvedNgo1Token}`)
      .send({ quantity: 4, claimNote: 'Disaster response team' });

    expect(claimRes.status).toBe(201);
    const transferId = claimRes.body.data.id;
    createdTransferIds.push(transferId);
    expect(claimRes.body.data.requestId).toBeNull();
    expect(claimRes.body.data.status).toBe('PENDING');

    // Donor transitions to IN_TRANSIT with tracking info
    const transitRes = await request(app)
      .patch(`/api/transfers/${transferId}/status`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        status: 'IN_TRANSIT',
        trackingInfo: 'Delhivery AWB 90123'
      });

    expect(transitRes.status).toBe(200);
    expect(transitRes.body.data.status).toBe('IN_TRANSIT');
    expect(transitRes.body.data.trackingInfo).toBe('Delhivery AWB 90123');

    // Receiving NGO confirms receipt
    const receivedRes = await request(app)
      .patch(`/api/transfers/${transferId}/status`)
      .set('Authorization', `Bearer ${approvedNgo1Token}`)
      .send({ status: 'RECEIVED' });

    expect(receivedRes.status).toBe(200);
    expect(receivedRes.body.data.status).toBe('RECEIVED');
    expect(receivedRes.body.data.receivedAt).toBeDefined();
  });

  // --- 7. Point 2: Transfer cancellation adds quantity back and reactivates EXHAUSTED resource ---
  it('refunds quantityAvailable and restores ACTIVE status upon transfer cancellation', async () => {
    // Create resource of 6 units
    const createRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: 'Infant Nutrition Formula',
        description: 'Fortified milk formula for babies',
        categoryId: testCategoryId,
        quantityTotal: 6,
        unit: 'cans',
        city: 'Pune'
      });
    const formulaId = createRes.body.data.id;
    createdResourceIds.push(formulaId);

    // Claim all 6 units so resource becomes EXHAUSTED
    const claimRes = await request(app)
      .post(`/api/resources/${formulaId}/claim`)
      .set('Authorization', `Bearer ${approvedNgo1Token}`)
      .send({ quantity: 6, claimNote: 'Infant clinic urgent need' });

    expect(claimRes.status).toBe(201);
    const transferId = claimRes.body.data.id;
    createdTransferIds.push(transferId);

    let dbRes = await prisma.resource.findUnique({ where: { id: formulaId } });
    expect(dbRes.quantityAvailable).toBe(0);
    expect(dbRes.status).toBe('EXHAUSTED');

    // Cancel the transfer
    const cancelRes = await request(app)
      .patch(`/api/transfers/${transferId}/status`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ status: 'CANCELLED' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    // Verify resource has quantity restored and status returned to ACTIVE
    dbRes = await prisma.resource.findUnique({ where: { id: formulaId } });
    expect(dbRes.quantityAvailable).toBe(6);
    expect(dbRes.status).toBe('ACTIVE');
  });
});
