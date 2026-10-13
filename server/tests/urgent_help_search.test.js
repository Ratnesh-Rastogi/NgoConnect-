import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('Urgent Help Search & NGO Emergency Services', () => {
  let adminToken;
  let donorToken, donorUser;
  let categories = [];
  const createdUserIds = [];

  // Dedicated test NGOs
  let ngoDelhiEmerg, ngoDelhiEmergUser, ngoDelhiEmergToken;
  let ngoDelhiNonEmerg, ngoDelhiNonEmergUser, ngoDelhiNonEmergToken;
  let ngoMumbCityRank, ngoMumbUser;
  let ngoPuneCityRank, ngoPuneUser;
  let ngoPending, ngoPendingUser;
  let ngoRejected, ngoRejectedUser;
  let ngoSuspended, ngoSuspendedUser;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Admin login
    const adminLoginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ngoconnect.org',
      password: 'password123'
    });
    adminToken = adminLoginRes.body.token;

    // 2. Fetch categories
    categories = await prisma.category.findMany({ take: 5 });
    expect(categories.length).toBeGreaterThanOrEqual(2);

    const cat1 = categories[0];
    const cat2 = categories[1];

    // 3. Register donor
    const donorRes = await request(app).post('/api/auth/register').send({
      name: `Urgent Donor ${timestamp}`,
      email: `donor-urgent-${timestamp}@test.org`,
      password: 'password123',
      role: 'donor'
    });
    donorToken = donorRes.body.token;
    donorUser = donorRes.body.user;
    createdUserIds.push(donorUser.id);

    // Helper to register NGO and optionally approve
    const registerNgo = async (nameSuffix, city, address = '123 Test St') => {
      const email = `ngo-urgent-${nameSuffix}-${timestamp}@test.org`;
      const reg = await request(app).post('/api/auth/register').send({
        name: `Leader ${nameSuffix} ${timestamp}`,
        email,
        password: 'password123',
        role: 'ngo',
        orgName: `Org ${nameSuffix} ${timestamp}`,
        regNumber: `REG-${nameSuffix.toUpperCase()}-${timestamp}`,
        description: `Description for ${nameSuffix}`,
        categoryId: cat1.id,
        contactPhone: '9876543210',
        address,
        city
      });
      createdUserIds.push(reg.body.user.id);
      const profile = await prisma.ngoProfile.findUnique({
        where: { userId: reg.body.user.id }
      });
      return { user: reg.body.user, token: reg.body.token, profile };
    };

    // 4. Create Delhi Approved NGO with Emergency = true
    const d1 = await registerNgo('delhi-emerg', 'New Delhi');
    ngoDelhiEmergUser = d1.user;
    ngoDelhiEmergToken = d1.token;
    ngoDelhiEmerg = await prisma.ngoProfile.update({
      where: { id: d1.profile.id },
      data: {
        verificationStatus: 'APPROVED',
        emergencyAvailable: true,
        available24x7: true,
        serviceAreaNote: 'Central & East Delhi coverage',
        publicEmail: `public-delhi-emerg-${timestamp}@org.org`,
        publicPhone: '+91 99999 11111',
        whatsappNumber: '9999911111',
        services: {
          create: [{ categoryId: cat1.id }, { categoryId: cat2.id }]
        }
      }
    });

    // 5. Create Delhi Approved NGO with Emergency = false
    const d2 = await registerNgo('delhi-nonemerg', 'New Delhi');
    ngoDelhiNonEmergUser = d2.user;
    ngoDelhiNonEmergToken = d2.token;
    ngoDelhiNonEmerg = await prisma.ngoProfile.update({
      where: { id: d2.profile.id },
      data: {
        verificationStatus: 'APPROVED',
        emergencyAvailable: false,
        available24x7: false,
        serviceAreaNote: 'South Delhi routine aid',
        publicEmail: `public-delhi-nonemerg-${timestamp}@org.org`,
        publicPhone: '+91 99999 22222',
        whatsappNumber: '9999922222',
        services: {
          create: [{ categoryId: cat1.id }]
        }
      }
    });

    // 6. Create Maharashtra NGOs for City Ranking test:
    // Mumbai NGO: emergencyAvailable: false
    // Pune NGO: emergencyAvailable: true
    const m1 = await registerNgo('mumbai-test', 'Mumbai');
    ngoMumbUser = m1.user;
    ngoMumbCityRank = await prisma.ngoProfile.update({
      where: { id: m1.profile.id },
      data: {
        verificationStatus: 'APPROVED',
        emergencyAvailable: false,
        available24x7: false,
        services: {
          create: [{ categoryId: cat1.id }]
        }
      }
    });

    const p1 = await registerNgo('pune-test', 'Pune');
    ngoPuneUser = p1.user;
    ngoPuneCityRank = await prisma.ngoProfile.update({
      where: { id: p1.profile.id },
      data: {
        verificationStatus: 'APPROVED',
        emergencyAvailable: true,
        available24x7: true,
        services: {
          create: [{ categoryId: cat1.id }]
        }
      }
    });

    // 7. Non-approved NGOs: Pending, Rejected, Suspended
    const pend = await registerNgo('pending-test', 'New Delhi');
    ngoPendingUser = pend.user;
    ngoPending = pend.profile; // stays PENDING

    const rej = await registerNgo('rejected-test', 'New Delhi');
    ngoRejectedUser = rej.user;
    ngoRejected = await prisma.ngoProfile.update({
      where: { id: rej.profile.id },
      data: { verificationStatus: 'REJECTED', emergencyAvailable: true }
    });

    const susp = await registerNgo('suspended-test', 'New Delhi');
    ngoSuspendedUser = susp.user;
    ngoSuspended = await prisma.ngoProfile.update({
      where: { id: susp.profile.id },
      data: { verificationStatus: 'SUSPENDED', emergencyAvailable: true }
    });
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } }
      });
    }
  });

  // ==============================================================
  // 1. Status Isolation & Privacy Boundary
  // ==============================================================
  describe('Status Isolation & Privacy Boundary', () => {
    it('only returns APPROVED NGOs — pending, rejected, and suspended never appear', async () => {
      const res = await request(app).get('/api/ngos/search');
      expect(res.status).toBe(200);

      const returnedIds = res.body.data.map((n) => n.id);
      expect(returnedIds).not.toContain(ngoPending.id);
      expect(returnedIds).not.toContain(ngoRejected.id);
      expect(returnedIds).not.toContain(ngoSuspended.id);

      // Verify all returned NGOs have status APPROVED
      for (const ngo of res.body.data) {
        expect(ngo.verificationStatus).toBe('APPROVED');
      }
    });

    it('never leaks login email, regNumber, documents or private storage keys', async () => {
      const res = await request(app).get('/api/ngos/search');
      expect(res.status).toBe(200);

      for (const ngo of res.body.data) {
        expect(ngo.user?.email).toBeUndefined();
        expect(ngo.email).toBeUndefined(); // private login email must not leak
        expect(ngo.regNumber).toBeUndefined();
        expect(ngo.documents).toBeUndefined();
        expect(ngo.documentUrl).toBeUndefined();
        expect(ngo.storageKey).toBeUndefined();
        expect(ngo.bankDetails).toBeUndefined();

        // Contact fields are public or sanitized
        if (ngo.showFullAddress === false) {
          expect(ngo.address).toBeUndefined();
          expect(ngo.city).toBeDefined();
          expect(ngo.state).toBeDefined();
        }
      }
    });

    it('removes an NGO immediately when its status is changed to SUSPENDED', async () => {
      // 1. Confirm ngoDelhiEmerg appears
      let res = await request(app).get('/api/ngos/search').query({ state: 'Delhi' });
      expect(res.status).toBe(200);
      let ids = res.body.data.map((n) => n.id);
      expect(ids).toContain(ngoDelhiEmerg.id);

      // 2. Suspend it
      await prisma.ngoProfile.update({
        where: { id: ngoDelhiEmerg.id },
        data: { verificationStatus: 'SUSPENDED' }
      });

      // 3. Confirm it disappeared
      res = await request(app).get('/api/ngos/search').query({ state: 'Delhi' });
      ids = res.body.data.map((n) => n.id);
      expect(ids).not.toContain(ngoDelhiEmerg.id);

      // 4. Restore status to APPROVED
      await prisma.ngoProfile.update({
        where: { id: ngoDelhiEmerg.id },
        data: { verificationStatus: 'APPROVED' }
      });

      // 5. Confirm it reappears
      res = await request(app).get('/api/ngos/search').query({ state: 'Delhi' });
      ids = res.body.data.map((n) => n.id);
      expect(ids).toContain(ngoDelhiEmerg.id);
    });
  });

  // ==============================================================
  // 2. State Strict Filtering & City Ranking Preference
  // ==============================================================
  describe('State Filtering & City Ranking Preference', () => {
    it('strictly filters by state (case-insensitive)', async () => {
      const res = await request(app).get('/api/ngos/search').query({ state: 'delhi' });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      for (const ngo of res.body.data) {
        expect(ngo.state.toLowerCase()).toBe('delhi');
      }

      // Maharashtra NGOs must not appear in Delhi state search
      const ids = res.body.data.map((n) => n.id);
      expect(ids).not.toContain(ngoMumbCityRank.id);
      expect(ids).not.toContain(ngoPuneCityRank.id);
    });

    it('returns empty array when querying a non-existent state', async () => {
      const res = await request(app).get('/api/ngos/search').query({ state: 'NonExistentState999' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('ranks queried city first within the state, followed by emergency availability', async () => {
      // Query Maharashtra with city = Mumbai
      // Note: ngoMumbCityRank is in Mumbai (emergencyAvailable: false)
      //       ngoPuneCityRank is in Pune (emergencyAvailable: true)
      // Since city is a ranking preference, Mumbai NGO MUST come before Pune NGO
      const resMumbaiQuery = await request(app)
        .get('/api/ngos/search')
        .query({ state: 'Maharashtra', city: 'Mumbai' });

      expect(resMumbaiQuery.status).toBe(200);
      const mIdx = resMumbaiQuery.body.data.findIndex((n) => n.id === ngoMumbCityRank.id);
      const pIdx = resMumbaiQuery.body.data.findIndex((n) => n.id === ngoPuneCityRank.id);

      expect(mIdx).toBeGreaterThanOrEqual(0);
      expect(pIdx).toBeGreaterThanOrEqual(0);
      expect(mIdx).toBeLessThan(pIdx); // Mumbai comes FIRST

      // Now query Maharashtra with city = Pune
      // Pune NGO MUST come before Mumbai NGO
      const resPuneQuery = await request(app)
        .get('/api/ngos/search')
        .query({ state: 'Maharashtra', city: 'Pune' });

      expect(resPuneQuery.status).toBe(200);
      const pIdx2 = resPuneQuery.body.data.findIndex((n) => n.id === ngoPuneCityRank.id);
      const mIdx2 = resPuneQuery.body.data.findIndex((n) => n.id === ngoMumbCityRank.id);

      expect(pIdx2).toBeGreaterThanOrEqual(0);
      expect(mIdx2).toBeGreaterThanOrEqual(0);
      expect(pIdx2).toBeLessThan(mIdx2); // Pune comes FIRST
    });
  });

  // ==============================================================
  // 3. Category & Emergency Availability Filters
  // ==============================================================
  describe('Category & Emergency Filters', () => {
    it('filters by emergency=true', async () => {
      const res = await request(app).get('/api/ngos/search').query({
        state: 'Delhi',
        emergency: 'true'
      });
      expect(res.status).toBe(200);

      const ids = res.body.data.map((n) => n.id);
      expect(ids).toContain(ngoDelhiEmerg.id);
      expect(ids).not.toContain(ngoDelhiNonEmerg.id);

      for (const ngo of res.body.data) {
        expect(ngo.emergencyAvailable).toBe(true);
      }
    });

    it('filters by category ID', async () => {
      const cat2 = categories[1];
      // Only ngoDelhiEmerg has cat2
      const res = await request(app).get('/api/ngos/search').query({
        state: 'Delhi',
        category: cat2.id
      });
      expect(res.status).toBe(200);

      const ids = res.body.data.map((n) => n.id);
      expect(ids).toContain(ngoDelhiEmerg.id);
      expect(ids).not.toContain(ngoDelhiNonEmerg.id);

      // Verify returned services include cat2
      const targetNgo = res.body.data.find((n) => n.id === ngoDelhiEmerg.id);
      expect(targetNgo.services.some((s) => s.id === cat2.id)).toBe(true);
    });

    it('matches "any of these" when multiple category IDs are queried', async () => {
      const cat1 = categories[0];
      const cat2 = categories[1];

      const res = await request(app).get('/api/ngos/search').query({
        state: 'Delhi',
        category: [cat1.id, cat2.id]
      });
      expect(res.status).toBe(200);

      const ids = res.body.data.map((n) => n.id);
      expect(ids).toContain(ngoDelhiEmerg.id);
      expect(ids).toContain(ngoDelhiNonEmerg.id);
    });
  });

  // ==============================================================
  // 4. Query Validation & Pagination Limits
  // ==============================================================
  describe('Query Validation & Page Size Cap', () => {
    it('caps limit=1000 to max 20 without failing', async () => {
      const res = await request(app).get('/api/ngos/search').query({ limit: 1000 });
      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(20);
      expect(res.body.data.length).toBeLessThanOrEqual(20);
    });

    it('returns 400 for non-UUID category query parameter', async () => {
      const res = await request(app).get('/api/ngos/search').query({ category: 'not-a-uuid' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Category ID must be a valid UUID/i);
    });

    it('returns 400 if state or city exceeds 60 characters', async () => {
      const tooLong = 'A'.repeat(61);
      const resState = await request(app).get('/api/ngos/search').query({ state: tooLong });
      expect(resState.status).toBe(400);

      const resCity = await request(app).get('/api/ngos/search').query({ city: tooLong });
      expect(resCity.status).toBe(400);
    });

    it('returns 400 if page is less than 1', async () => {
      const res = await request(app).get('/api/ngos/search').query({ page: 0 });
      expect(res.status).toBe(400);
    });
  });

  // ==============================================================
  // 5. Owner NGO Profile & Service Management (PUT /api/ngos/my/profile)
  // ==============================================================
  describe('Owner NGO Profile & Service Management', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).put('/api/ngos/my/profile').send({
        emergencyAvailable: true
      });
      expect(res.status).toBe(401);
    });

    it('rejects non-NGO role (donor) with 403', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          emergencyAvailable: true
        });
      expect(res.status).toBe(403);
    });

    it('returns 400 when serviceCategoryIds contains an unknown UUID', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${ngoDelhiNonEmergToken}`)
        .send({
          serviceCategoryIds: [fakeUuid]
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/One or more category IDs do not exist/i);
    });

    it('returns 400 when serviceAreaNote exceeds 200 characters', async () => {
      const longNote = 'A'.repeat(201);
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${ngoDelhiNonEmergToken}`)
        .send({
          serviceAreaNote: longNote
        });

      expect(res.status).toBe(400);
    });

    it('deduplicates category IDs and successfully updates services & emergency flags', async () => {
      const cat1 = categories[0];
      const cat2 = categories[1];

      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${ngoDelhiNonEmergToken}`)
        .send({
          emergencyAvailable: true,
          available24x7: true,
          serviceAreaNote: 'Updated 24x7 rapid emergency response unit',
          // Send duplicate cat1.id to test deduplication
          serviceCategoryIds: [cat1.id, cat1.id, cat2.id]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.emergencyAvailable).toBe(true);
      expect(res.body.data.available24x7).toBe(true);
      expect(res.body.data.serviceAreaNote).toBe('Updated 24x7 rapid emergency response unit');

      // Verify services
      const serviceIds = res.body.data.services.map((s) => s.id);
      expect(serviceIds.length).toBe(2);
      expect(serviceIds).toContain(cat1.id);
      expect(serviceIds).toContain(cat2.id);

      // Verify the update reflects in public search
      const searchRes = await request(app)
        .get('/api/ngos/search')
        .query({ state: 'Delhi', emergency: 'true' });
      expect(searchRes.status).toBe(200);

      const updatedNgo = searchRes.body.data.find((n) => n.id === ngoDelhiNonEmerg.id);
      expect(updatedNgo).toBeDefined();
      expect(updatedNgo.emergencyAvailable).toBe(true);
      expect(updatedNgo.available24x7).toBe(true);
      expect(updatedNgo.serviceAreaNote).toBe('Updated 24x7 rapid emergency response unit');
    });
  });
});
