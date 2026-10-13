import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('NGO Public Contact Details & Privacy Boundary', () => {
  let adminToken;
  let donorToken, donorUser;
  let testNgo1Token, testNgo1User, testNgo1Profile;
  let testNgo2Token, testNgo2User, testNgo2Profile;
  let testCategory;

  const createdUserIds = [];

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Login seeded Admin
    const adminLoginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ngoconnect.org',
      password: 'password123'
    });
    adminToken = adminLoginRes.body.token;

    // 2. Fetch category
    testCategory = await prisma.category.findFirst();

    // 3. Register a test donor
    const donorRes = await request(app).post('/api/auth/register').send({
      name: `Donor Contact Tester ${timestamp}`,
      email: `donor-contact-${timestamp}@test.org`,
      password: 'password123',
      role: 'donor'
    });
    donorToken = donorRes.body.token;
    donorUser = donorRes.body.user;
    createdUserIds.push(donorUser.id);

    // 4. Register NGO 1 (starts PENDING)
    const ngo1Res = await request(app).post('/api/auth/register').send({
      name: `NGO Leader One ${timestamp}`,
      email: `ngo1-login-${timestamp}@test.org`,
      password: 'password123',
      role: 'ngo',
      orgName: `Alpha Relief Foundation ${timestamp}`,
      regNumber: `REG-ALPHA-${timestamp}`,
      description: 'Alpha relief organization dedicated to healthcare aid',
      categoryId: testCategory.id,
      contactPhone: '9876543210',
      address: '100 Alpha Lane, Sector 5',
      city: 'Pune'
    });
    testNgo1Token = ngo1Res.body.token;
    testNgo1User = ngo1Res.body.user;
    createdUserIds.push(testNgo1User.id);

    testNgo1Profile = await prisma.ngoProfile.findUnique({
      where: { userId: testNgo1User.id }
    });

    // 5. Register NGO 2
    const ngo2Res = await request(app).post('/api/auth/register').send({
      name: `NGO Leader Two ${timestamp}`,
      email: `ngo2-login-${timestamp}@test.org`,
      password: 'password123',
      role: 'ngo',
      orgName: `Beta Hope Care ${timestamp}`,
      regNumber: `REG-BETA-${timestamp}`,
      description: 'Beta care organization supporting homeless children',
      categoryId: testCategory.id,
      contactPhone: '9876543211',
      address: '200 Beta Road, Sector 8',
      city: 'Mumbai'
    });
    testNgo2Token = ngo2Res.body.token;
    testNgo2User = ngo2Res.body.user;
    createdUserIds.push(testNgo2User.id);

    testNgo2Profile = await prisma.ngoProfile.findUnique({
      where: { userId: testNgo2User.id }
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
  // 1. Role and Ownership Enforcement for Editing Contact Details
  // ==============================================================
  describe('Authorization & Ownership on PUT /api/ngos/my/profile', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .send({
          publicEmail: 'contact@alpha-relief.org'
        });
      expect(res.status).toBe(401);
    });

    it('rejects donor role with 403 Forbidden', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          publicEmail: 'donor-trying-to-edit@test.org'
        });
      expect(res.status).toBe(403);
    });

    it('allows owner NGO to edit contact details in PENDING status', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          publicEmail: 'contact@alpha-relief.org',
          publicPhone: '+91 98765 43210',
          whatsappNumber: '9876543210',
          website: 'https://alpha-relief.org',
          facebookUrl: 'https://facebook.com/alpharelief',
          instagramUrl: 'https://instagram.com/alpharelief',
          showFullAddress: true
        });

      expect(res.status).toBe(200);
      expect(res.body.data.publicEmail).toBe('contact@alpha-relief.org');
      expect(res.body.data.publicPhone).toBe('+91 98765 43210');
      expect(res.body.data.whatsappNumber).toBe('9876543210');
      expect(res.body.data.website).toBe('https://alpha-relief.org');
      expect(res.body.data.showFullAddress).toBe(true);
    });

    it('allows owner NGO to edit contact details even when SUSPENDED', async () => {
      // Suspend NGO 1 temporarily in database
      await prisma.ngoProfile.update({
        where: { id: testNgo1Profile.id },
        data: { verificationStatus: 'SUSPENDED' }
      });

      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          publicEmail: 'updated-while-suspended@alpha-relief.org'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.publicEmail).toBe('updated-while-suspended@alpha-relief.org');

      // Restore to APPROVED for further tests
      await prisma.ngoProfile.update({
        where: { id: testNgo1Profile.id },
        data: { verificationStatus: 'APPROVED' }
      });
    });

    it('modifies only the authenticated NGO profile and cannot modify other NGOs', async () => {
      // NGO 2 updates their own profile
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo2Token}`)
        .send({
          publicEmail: 'info@beta-care.org',
          publicPhone: '+91 98765 11111',
          showFullAddress: false
        });

      expect(res.status).toBe(200);
      expect(res.body.data.publicEmail).toBe('info@beta-care.org');

      // Verify NGO 1 profile was untouched
      const ngo1Db = await prisma.ngoProfile.findUnique({
        where: { id: testNgo1Profile.id }
      });
      expect(ngo1Db.publicEmail).toBe('updated-while-suspended@alpha-relief.org');
    });
  });

  // ==============================================================
  // 2. Strict Zod Validation & Input Constraints
  // ==============================================================
  describe('Zod Validation for NGO Contact Fields', () => {
    it('rejects invalid publicEmail format with 400', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          publicEmail: 'not-a-valid-email'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it('rejects over-long publicEmail (> 120 chars) with 400', async () => {
      const longEmail = `${'a'.repeat(115)}@example.com`; // 127 chars
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          publicEmail: longEmail
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/120|email/i);
    });

    it('rejects invalid publicPhone with illegal characters with 400', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          publicPhone: '+91 98765<script>'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/phone/i);
    });

    it('rejects over-long publicPhone (> 20 chars) with 400', async () => {
      const longPhone = '+123456789012345678901'; // 22 chars
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          publicPhone: longPhone
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/20|phone/i);
    });

    it('rejects javascript: scheme URL with 400', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          website: 'javascript:alert("xss")'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/http|url/i);
    });

    it('rejects data: scheme URL with 400', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          facebookUrl: 'data:text/html,<script>alert(1)</script>'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/http|url/i);
    });

    it('rejects over-long website URL (> 200 chars) with 400', async () => {
      const longUrl = `https://example.org/${'x'.repeat(190)}`; // 210 chars
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          website: longUrl
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/200|url/i);
    });

    it('accepts valid http:// and https:// URLs and trims whitespace', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          website: '  http://alpha-relief.org  ',
          facebookUrl: '  https://facebook.com/alpharelief  ',
          instagramUrl: '  https://instagram.com/alpharelief  '
        });

      expect(res.status).toBe(200);
      expect(res.body.data.website).toBe('http://alpha-relief.org');
      expect(res.body.data.facebookUrl).toBe('https://facebook.com/alpharelief');
      expect(res.body.data.instagramUrl).toBe('https://instagram.com/alpharelief');
    });

    it('transforms empty strings to null for contact fields', async () => {
      const res = await request(app)
        .put('/api/ngos/my/profile')
        .set('Authorization', `Bearer ${testNgo1Token}`)
        .send({
          publicEmail: '   ',
          publicPhone: '   ',
          whatsappNumber: '   ',
          website: '   '
        });

      expect(res.status).toBe(200);
      expect(res.body.data.publicEmail).toBeNull();
      expect(res.body.data.publicPhone).toBeNull();
      expect(res.body.data.whatsappNumber).toBeNull();
      expect(res.body.data.website).toBeNull();
    });
  });

  // ==============================================================
  // 3. Privacy Boundary & Public Endpoints
  // ==============================================================
  describe('Public Endpoints (GET /api/ngos & GET /api/ngos/:id)', () => {
    beforeAll(async () => {
      // Set NGO 1 with full contact details and showFullAddress: true, APPROVED
      await prisma.ngoProfile.update({
        where: { id: testNgo1Profile.id },
        data: {
          verificationStatus: 'APPROVED',
          publicEmail: 'public-alpha@relief.org',
          publicPhone: '+91 98765 43210',
          whatsappNumber: '9876543210',
          website: 'https://alpha-relief.org',
          showFullAddress: true
        }
      });

      // Keep NGO 2 PENDING with some contact details
      await prisma.ngoProfile.update({
        where: { id: testNgo2Profile.id },
        data: {
          verificationStatus: 'PENDING',
          publicEmail: 'hidden-pending@beta.org',
          publicPhone: '+91 99999 88888',
          whatsappNumber: '9999988888',
          website: 'https://beta.org',
          showFullAddress: false
        }
      });
    });

    it('never leaks login email, private phone, regNumber, or verification notes in GET /api/ngos', async () => {
      const res = await request(app).get('/api/ngos');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      res.body.data.forEach((ngo) => {
        // Never leak private fields
        expect(ngo.user?.email).toBeUndefined();
        expect(ngo.email).toBeUndefined();
        expect(ngo.regNumber).toBeUndefined();
        expect(ngo.verificationNotes).toBeUndefined();
        expect(ngo.storageKey).toBeUndefined();
        expect(ngo.documents).toBeUndefined();

        // Private phone must not leak
        expect(ngo.phone).toBeUndefined();
      });
    });

    it('does NOT include PENDING NGOs in GET /api/ngos', async () => {
      const res = await request(app).get('/api/ngos');
      expect(res.status).toBe(200);

      const pendingFound = res.body.data.find((n) => n.id === testNgo2Profile.id);
      expect(pendingFound).toBeUndefined();
    });

    it('reveals full address only when showFullAddress is true', async () => {
      const res = await request(app).get('/api/ngos');
      expect(res.status).toBe(200);

      // Seeded Hope Relief has showFullAddress: true
      const hopeRelief = res.body.data.find((n) => n.orgName === 'Hope Relief Foundation');
      expect(hopeRelief).toBeDefined();
      expect(hopeRelief.showFullAddress).toBe(true);
      expect(hopeRelief.address).toBeDefined();
      expect(hopeRelief.address).not.toBeNull();
      expect(hopeRelief.publicEmail).toBe('info@hoperelief-public.org');

      // Seeded Clean Water Initiative has showFullAddress: false
      const cleanWater = res.body.data.find(
        (n) => n.orgName === 'Clean Water & Health Initiative'
      );
      expect(cleanWater).toBeDefined();
      expect(cleanWater.showFullAddress).toBe(false);
      // address must NOT be exposed
      expect(cleanWater.address).toBeUndefined();
      // city and state are exposed
      expect(cleanWater.city).toBe('Patna');
      expect(cleanWater.state).toBe('Bihar');
    });

    it('shows NO public contact details for PENDING NGO when queried via GET /api/ngos/:id by visitor', async () => {
      const res = await request(app).get(`/api/ngos/${testNgo2Profile.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.verificationStatus).toBe('PENDING');

      // Public contact fields must be completely hidden/undefined
      expect(res.body.data.publicEmail).toBeUndefined();
      expect(res.body.data.publicPhone).toBeUndefined();
      expect(res.body.data.whatsappNumber).toBeUndefined();
      expect(res.body.data.website).toBeUndefined();
      expect(res.body.data.facebookUrl).toBeUndefined();
      expect(res.body.data.instagramUrl).toBeUndefined();
      expect(res.body.data.address).toBeUndefined();

      // Sensitive fields must never leak
      expect(res.body.data.user?.email).toBeUndefined();
      expect(res.body.data.regNumber).toBeUndefined();
      expect(res.body.data.verificationNotes).toBeUndefined();
    });

    it('returns contact details for APPROVED NGO via GET /api/ngos/:id without leaking private fields', async () => {
      const res = await request(app).get(`/api/ngos/${testNgo1Profile.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.publicEmail).toBe('public-alpha@relief.org');
      expect(res.body.data.publicPhone).toBe('+91 98765 43210');
      expect(res.body.data.whatsappNumber).toBe('9876543210');
      expect(res.body.data.website).toBe('https://alpha-relief.org');
      expect(res.body.data.showFullAddress).toBe(true);
      expect(res.body.data.address).toBe('100 Alpha Lane, Sector 5');

      // Check no sensitive fields
      expect(res.body.data.user?.email).toBeUndefined();
      expect(res.body.data.regNumber).toBeUndefined();
      expect(res.body.data.verificationNotes).toBeUndefined();
    });
  });

  // ==============================================================
  // 4. WhatsApp Formatter Logic Unit Test
  // ==============================================================
  describe('WhatsApp Link Generation Logic', () => {
    const buildWhatsAppLink = (number) => {
      if (!number) return null;
      let digits = number.replace(/[\s+-]/g, '');
      if (/^\d{10}$/.test(digits)) {
        digits = `91${digits}`;
      }
      return `https://wa.me/${digits}`;
    };

    it('strips spaces, dashes and plus signs', () => {
      expect(buildWhatsAppLink('+91 98765-43210')).toBe('https://wa.me/919876543210');
      expect(buildWhatsAppLink('+1-800-555-0199')).toBe('https://wa.me/18005550199');
    });

    it('prefixes 91 when the input has exactly 10 digits', () => {
      expect(buildWhatsAppLink('9876543210')).toBe('https://wa.me/919876543210');
      expect(buildWhatsAppLink('98765-43210')).toBe('https://wa.me/919876543210');
      expect(buildWhatsAppLink(' 98765 43210 ')).toBe('https://wa.me/919876543210');
    });

    it('does not prefix 91 if the number is already international or not 10 digits', () => {
      expect(buildWhatsAppLink('919876543210')).toBe('https://wa.me/919876543210');
      expect(buildWhatsAppLink('+447911123456')).toBe('https://wa.me/447911123456');
    });

    it('returns null for empty input', () => {
      expect(buildWhatsAppLink('')).toBeNull();
      expect(buildWhatsAppLink(null)).toBeNull();
    });
  });
});
