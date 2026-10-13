import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Transfer Events, Notifications & Scoped Dashboards', () => {
  let adminToken;
  let donorAToken, donorAUser;
  let donorBToken, donorBUser;
  let ngoAToken, ngoAUser, ngoAProfile;
  let ngoBToken, ngoBUser, ngoBProfile;
  let testCategory;

  let testRequestId;
  let testResourceId;
  let testTransferId;
  let testClaimTransferId;

  const createdUserIds = [];

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Login seeded Admin
    const adminLoginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ngoconnect.org',
      password: 'password123'
    });
    adminToken = adminLoginRes.body.token;

    // Get any existing category
    testCategory = await prisma.category.findFirst();

    // 2. Register Donor A
    const donorARes = await request(app).post('/api/auth/register').send({
      name: `Donor Alice ${timestamp}`,
      email: `donor-alice-${timestamp}@test.org`,
      password: 'password123',
      role: 'donor'
    });
    donorAToken = donorARes.body.token;
    donorAUser = donorARes.body.user;
    createdUserIds.push(donorAUser.id);

    // 3. Register Donor B
    const donorBRes = await request(app).post('/api/auth/register').send({
      name: `Donor Bob ${timestamp}`,
      email: `donor-bob-${timestamp}@test.org`,
      password: 'password123',
      role: 'donor'
    });
    donorBToken = donorBRes.body.token;
    donorBUser = donorBRes.body.user;
    createdUserIds.push(donorBUser.id);

    // 4. Register NGO A
    const ngoARes = await request(app).post('/api/auth/register').send({
      name: `NGO Alice Rep ${timestamp}`,
      email: `ngo-alice-${timestamp}@test.org`,
      password: 'password123',
      role: 'ngo',
      orgName: `Alpha Relief ${timestamp}`,
      regNumber: `REG-ALPHA-${timestamp}`,
      description: 'Alpha relief organization dedicated to healthcare supplies',
      categoryId: testCategory.id,
      contactPhone: '9876543210',
      address: '123 Care Street',
      city: 'Mumbai'
    });
    ngoAToken = ngoARes.body.token;
    ngoAUser = ngoARes.body.user;
    createdUserIds.push(ngoAUser.id);

    const ngoAProfileRecord = await prisma.ngoProfile.findUnique({
      where: { userId: ngoAUser.id }
    });
    ngoAProfile = ngoAProfileRecord;

    // Upload a valid PDF to NGO A so admin can approve
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    await request(app)
      .post('/api/ngos/my/documents')
      .set('Authorization', `Bearer ${ngoAToken}`)
      .field('docType', 'Registration Certificate')
      .attach('file', validPdfBuffer, 'reg-cert.pdf');

    // Admin approves NGO A
    await request(app)
      .patch(`/api/ngos/admin/${ngoAProfile.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        verificationStatus: 'APPROVED',
        verificationNotes: 'Approved for test execution'
      });

    // 5. Register NGO B
    const ngoBRes = await request(app).post('/api/auth/register').send({
      name: `NGO Bob Rep ${timestamp}`,
      email: `ngo-bob-${timestamp}@test.org`,
      password: 'password123',
      role: 'ngo',
      orgName: `Beta Shelter ${timestamp}`,
      regNumber: `REG-BETA-${timestamp}`,
      description: 'Beta shelter organization dedicated to disaster relief',
      categoryId: testCategory.id,
      contactPhone: '9876543211',
      address: '456 Safe Avenue',
      city: 'Delhi'
    });
    ngoBToken = ngoBRes.body.token;
    ngoBUser = ngoBRes.body.user;
    createdUserIds.push(ngoBUser.id);

    const ngoBProfileRecord = await prisma.ngoProfile.findUnique({
      where: { userId: ngoBUser.id }
    });
    ngoBProfile = ngoBProfileRecord;

    // Upload doc and approve NGO B
    await request(app)
      .post('/api/ngos/my/documents')
      .set('Authorization', `Bearer ${ngoBToken}`)
      .field('docType', 'Registration Certificate')
      .attach('file', validPdfBuffer, 'reg-cert-b.pdf');

    await request(app)
      .patch(`/api/ngos/admin/${ngoBProfile.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        verificationStatus: 'APPROVED',
        verificationNotes: 'Approved for test execution'
      });

    // 6. Create a Resource Request for NGO A
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${ngoAToken}`)
      .send({
        title: `Emergency Medical Supplies ${timestamp}`,
        description: 'First aid kits for clinical relief',
        categoryId: testCategory.id,
        urgency: 'HIGH',
        quantityNeeded: 20,
        unit: 'kits',
        city: 'Mumbai',
        state: 'Maharashtra'
      });
    testRequestId = reqRes.body.data.id;

    // 7. Create a Resource Listing for Donor A
    const resRes = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${donorAToken}`)
      .send({
        title: `Surgical Masks Batch ${timestamp}`,
        description: 'Sterile surgical face masks',
        categoryId: testCategory.id,
        quantityTotal: 50,
        unit: 'boxes',
        city: 'Mumbai',
        state: 'Maharashtra'
      });
    testResourceId = resRes.body.data.id;
  });

  afterAll(async () => {
    // Isolated clean up of only records created during this test
    if (testClaimTransferId) {
      await prisma.transfer.deleteMany({ where: { id: testClaimTransferId } });
    }
    if (testTransferId) {
      await prisma.transfer.deleteMany({ where: { id: testTransferId } });
    }
    if (testResourceId) {
      await prisma.resource.deleteMany({ where: { id: testResourceId } });
    }
    if (testRequestId) {
      await prisma.resourceRequest.deleteMany({ where: { id: testRequestId } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  // ==========================================
  // 1. Transfer Events & Notification Creation
  // ==========================================
  describe('Transfer Events and Notifications on Status Transitions', () => {
    it('creates TransferEvent and Notifications inside same transaction on donation creation', async () => {
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${donorAToken}`)
        .send({
          requestId: testRequestId,
          quantity: 10,
          donorNote: 'Supplying first batch of medical kits'
        });

      expect(res.status).toBe(201);
      testTransferId = res.body.data.id;

      // 1. Verify TransferEvent record
      const events = await prisma.transferEvent.findMany({
        where: { transferId: testTransferId }
      });
      expect(events).toHaveLength(1);
      expect(events[0].fromStatus).toBeNull();
      expect(events[0].toStatus).toBe('PENDING');
      expect(events[0].changedById).toBe(donorAUser.id);
      expect(events[0].note).toMatch(/Supplying first batch/i);

      // 2. Verify Notifications created
      // NGO A notification
      const ngoNotifs = await prisma.notification.findMany({
        where: { userId: ngoAUser.id, type: 'NEW_DONATION' }
      });
      expect(ngoNotifs.length).toBeGreaterThan(0);
      expect(ngoNotifs[0].message).toMatch(/donated 10 kits/i);

      // Donor A notification
      const donorNotifs = await prisma.notification.findMany({
        where: { userId: donorAUser.id, type: 'DONATION_RECORDED' }
      });
      expect(donorNotifs.length).toBeGreaterThan(0);
      expect(donorNotifs[0].message).toMatch(/donated 10 kits/i);
    });

    it('creates TransferEvent and Notification on IN_TRANSIT update', async () => {
      const res = await request(app)
        .patch(`/api/transfers/${testTransferId}/status`)
        .set('Authorization', `Bearer ${donorAToken}`)
        .send({
          status: 'IN_TRANSIT',
          trackingInfo: 'BLUE-DART-TRACK-12345'
        });

      expect(res.status).toBe(200);

      // 1. Verify TransferEvent record
      const events = await prisma.transferEvent.findMany({
        where: { transferId: testTransferId },
        orderBy: { createdAt: 'asc' }
      });
      expect(events).toHaveLength(2);
      expect(events[1].fromStatus).toBe('PENDING');
      expect(events[1].toStatus).toBe('IN_TRANSIT');
      expect(events[1].changedById).toBe(donorAUser.id);
      expect(events[1].note).toMatch(/BLUE-DART-TRACK-12345/);

      // 2. Verify Notification to NGO A
      const notifs = await prisma.notification.findMany({
        where: { userId: ngoAUser.id, type: 'TRANSFER_IN_TRANSIT' }
      });
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs[0].message).toMatch(/BLUE-DART-TRACK-12345/);
    });

    it('creates TransferEvent and Notification on RECEIVED confirmation', async () => {
      const res = await request(app)
        .patch(`/api/transfers/${testTransferId}/status`)
        .set('Authorization', `Bearer ${ngoAToken}`)
        .send({
          status: 'RECEIVED'
        });

      expect(res.status).toBe(200);

      // 1. Verify TransferEvent record
      const events = await prisma.transferEvent.findMany({
        where: { transferId: testTransferId },
        orderBy: { createdAt: 'asc' }
      });
      expect(events).toHaveLength(3);
      expect(events[2].fromStatus).toBe('IN_TRANSIT');
      expect(events[2].toStatus).toBe('RECEIVED');
      expect(events[2].changedById).toBe(ngoAUser.id);

      // 2. Verify Notification to Donor A
      const notifs = await prisma.notification.findMany({
        where: { userId: donorAUser.id, type: 'TRANSFER_RECEIVED' }
      });
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs[0].message).toMatch(/confirmed receipt of 10/i);
    });

    it('creates TransferEvent and Notifications on claimResource', async () => {
      const res = await request(app)
        .post(`/api/resources/${testResourceId}/claim`)
        .set('Authorization', `Bearer ${ngoAToken}`)
        .send({
          quantity: 15,
          claimNote: 'Hospital ward distribution'
        });

      expect(res.status).toBe(201);
      testClaimTransferId = res.body.data.id;

      // 1. Verify TransferEvent
      const events = await prisma.transferEvent.findMany({
        where: { transferId: testClaimTransferId }
      });
      expect(events).toHaveLength(1);
      expect(events[0].fromStatus).toBeNull();
      expect(events[0].toStatus).toBe('PENDING');
      expect(events[0].changedById).toBe(ngoAUser.id);
      expect(events[0].note).toMatch(/Hospital ward distribution/);

      // 2. Verify Notification to Resource Owner (Donor A)
      const ownerNotifs = await prisma.notification.findMany({
        where: { userId: donorAUser.id, type: 'RESOURCE_CLAIMED' }
      });
      expect(ownerNotifs.length).toBeGreaterThan(0);
      expect(ownerNotifs[0].message).toMatch(/claimed 15/i);
    });

    it('creates TransferEvent and notifies the counterparty on CANCELLED', async () => {
      // Donor A cancels the claimed transfer
      const res = await request(app)
        .patch(`/api/transfers/${testClaimTransferId}/status`)
        .set('Authorization', `Bearer ${donorAToken}`)
        .send({
          status: 'CANCELLED'
        });

      expect(res.status).toBe(200);

      // 1. Verify TransferEvent
      const events = await prisma.transferEvent.findMany({
        where: { transferId: testClaimTransferId },
        orderBy: { createdAt: 'asc' }
      });
      expect(events).toHaveLength(2);
      expect(events[1].fromStatus).toBe('PENDING');
      expect(events[1].toStatus).toBe('CANCELLED');

      // 2. Counterparty rule: only NGO A was cancelled upon, so NGO A gets notification
      const ngoCancelNotifs = await prisma.notification.findMany({
        where: { userId: ngoAUser.id, type: 'TRANSFER_CANCELLED' }
      });
      expect(ngoCancelNotifs.length).toBeGreaterThan(0);
      expect(ngoCancelNotifs[0].message).toMatch(/cancelled by the donor/i);
    });

    it('returns events history timeline when fetching transfer details', async () => {
      const res = await request(app)
        .get(`/api/transfers/${testTransferId}`)
        .set('Authorization', `Bearer ${donorAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.events).toBeDefined();
      expect(res.body.data.events.length).toBe(3);
      expect(res.body.data.events[0].toStatus).toBe('PENDING');
      expect(res.body.data.events[1].toStatus).toBe('IN_TRANSIT');
      expect(res.body.data.events[2].toStatus).toBe('RECEIVED');
      expect(res.body.data.events[0].changedBy).toBeDefined();
      expect(res.body.data.events[0].changedBy.name).toBe(donorAUser.name);
    });
  });

  // ==========================================
  // 2. Notification Ownership & Endpoints
  // ==========================================
  describe('Notification Ownership & Access Control', () => {
    let donorANotifId;

    beforeEach(async () => {
      let notifs = await prisma.notification.findMany({
        where: { userId: donorAUser.id }
      });
      if (notifs.length === 0) {
        const n = await prisma.notification.create({
          data: {
            userId: donorAUser.id,
            type: 'TEST_NOTIF',
            title: 'Test Notification',
            message: 'Test notification content'
          }
        });
        donorANotifId = n.id;
      } else {
        donorANotifId = notifs[0].id;
      }
    });

    it('rejects unauthenticated requests to notifications with 401', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('isolates user notifications (Donor B cannot see Donor A notifications)', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${donorBToken}`);

      expect(res.status).toBe(200);
      // Donor B has 0 notifications
      expect(res.body.data).toHaveLength(0);
    });

    it('blocks Donor B from marking Donor A notification as read with 403', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${donorANotifId}/read`)
        .set('Authorization', `Bearer ${donorBToken}`);

      expect(res.status).toBe(403);
    });

    it('returns unread count accurately', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${donorAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBeGreaterThan(0);
    });

    it('allows owner to mark a single notification read', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${donorANotifId}/read`)
        .set('Authorization', `Bearer ${donorAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.readAt).not.toBeNull();
    });

    it('filters unread notifications with ?unread=true', async () => {
      const allRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${donorAToken}`);

      const unreadRes = await request(app)
        .get('/api/notifications?unread=true')
        .set('Authorization', `Bearer ${donorAToken}`);

      expect(unreadRes.status).toBe(200);
      // Because we marked 1 as read, unread count must be exactly 1 less than total
      expect(unreadRes.body.data.length).toBe(allRes.body.data.length - 1);
    });

    it('allows owner to mark all notifications read via PATCH /read-all', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${donorAToken}`);

      expect(res.status).toBe(200);

      // Verify unread count is now 0
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${donorAToken}`);

      expect(countRes.body.data.unreadCount).toBe(0);
    });
  });

  // ==========================================
  // 3. Scoped Dashboard Aggregates
  // ==========================================
  describe('Scoped Dashboard Aggregates', () => {
    it('blocks non-NGO users from accessing /api/dashboard/ngo with 403', async () => {
      const res = await request(app)
        .get('/api/dashboard/ngo')
        .set('Authorization', `Bearer ${donorAToken}`);

      expect(res.status).toBe(403);
    });

    it('returns accurately scoped aggregate metrics for NGO A', async () => {
      const res = await request(app)
        .get('/api/dashboard/ngo')
        .set('Authorization', `Bearer ${ngoAToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.ngoProfile.id).toBe(ngoAProfile.id);
      expect(data.totalRequestsCount).toBe(1);
      expect(data.openRequestsCount).toBe(1); // 10 fulfilled out of 20 needed -> PARTIAL (open)
      expect(data.fulfilmentRate).toBe(50); // 10/20 = 50%
      expect(data.transfersByStatus).toBeDefined();
      expect(data.transfersByStatus.RECEIVED).toBe(1);
      expect(data.transfersByStatus.CANCELLED).toBe(1);
    });

    it('scopes NGO dashboard so NGO B does not see NGO A metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/ngo')
        .set('Authorization', `Bearer ${ngoBToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.ngoProfile.id).toBe(ngoBProfile.id);
      expect(data.totalRequestsCount).toBe(0);
      expect(data.openRequestsCount).toBe(0);
      expect(data.fulfilmentRate).toBe(0);
      expect(data.totalTransfersCount).toBe(0);
    });

    it('blocks non-donor users from accessing /api/dashboard/donor with 403', async () => {
      const res = await request(app)
        .get('/api/dashboard/donor')
        .set('Authorization', `Bearer ${ngoAToken}`);

      expect(res.status).toBe(403);
    });

    it('returns accurately scoped aggregate metrics for Donor A', async () => {
      const res = await request(app)
        .get('/api/dashboard/donor')
        .set('Authorization', `Bearer ${donorAToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.myDonationsCount).toBe(2); // 1 to request + 1 claimed from resource
      expect(data.completedDeliveries).toBe(1); // 1 received
      expect(data.cancelledCount).toBe(1); // 1 cancelled claim
      expect(data.totalQuantityDonated).toBe(10); // non-cancelled units
      expect(data.myResourcesCount).toBe(1);
    });

    it('scopes donor dashboard so Donor B does not see Donor A metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/donor')
        .set('Authorization', `Bearer ${donorBToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.myDonationsCount).toBe(0);
      expect(data.completedDeliveries).toBe(0);
      expect(data.totalQuantityDonated).toBe(0);
    });

    it('blocks non-admins from accessing /api/dashboard/admin with 403', async () => {
      const donorRes = await request(app)
        .get('/api/dashboard/admin')
        .set('Authorization', `Bearer ${donorAToken}`);
      expect(donorRes.status).toBe(403);

      const ngoRes = await request(app)
        .get('/api/dashboard/admin')
        .set('Authorization', `Bearer ${ngoAToken}`);
      expect(ngoRes.status).toBe(403);
    });

    it('returns platform totals and transfers over time for Admin', async () => {
      const res = await request(app)
        .get('/api/dashboard/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.pendingNgosCount).toBeDefined();
      expect(data.platformTotals).toBeDefined();
      expect(data.platformTotals.totalUsers).toBeGreaterThan(0);
      expect(data.platformTotals.approvedNgos).toBeGreaterThan(0);
      expect(data.platformTotals.totalTransfers).toBeGreaterThan(0);
      expect(data.platformTotals.totalQuantityTransferred).toBeGreaterThan(0);

      expect(data.transfersOverTime).toBeDefined();
      expect(Array.isArray(data.transfersOverTime)).toBe(true);
      expect(data.transfersOverTime.length).toBeGreaterThan(0);
      expect(data.transfersOverTime[0]).toHaveProperty('date');
      expect(data.transfersOverTime[0]).toHaveProperty('transfers');
      expect(data.transfersOverTime[0]).toHaveProperty('completed');
    });
  });
});
