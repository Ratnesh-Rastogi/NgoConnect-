import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

describe('NGO Document Verification & Admin Oversight Tests', () => {
  let adminToken;
  let pendingNgoToken;   // sunshine@animals.org (PENDING)
  let approvedNgoToken;  // hope@relief.org (APPROVED)
  let otherNgoToken;     // cleanwater@health.org (APPROVED)
  let donorToken;

  let pendingNgoProfile;
  let uploadedDocId;

  const validPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
  );
  const fakePdfBuffer = Buffer.from('This is a text file claiming to be a PDF');

  beforeAll(async () => {
    // 1. Login Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ngoconnect.org',
      password: 'password123'
    });
    adminToken = adminRes.body.token;

    // 2. Login Pending NGO
    const pendingRes = await request(app).post('/api/auth/login').send({
      email: 'sunshine@animals.org',
      password: 'password123'
    });
    pendingNgoToken = pendingRes.body.token;
    pendingNgoProfile = pendingRes.body.user.ngoProfile;

    // 3. Login Approved NGO
    const approvedRes = await request(app).post('/api/auth/login').send({
      email: 'hope@relief.org',
      password: 'password123'
    });
    approvedNgoToken = approvedRes.body.token;

    // 4. Login Other NGO
    const otherRes = await request(app).post('/api/auth/login').send({
      email: 'cleanwater@health.org',
      password: 'password123'
    });
    otherNgoToken = otherRes.body.token;

    // 5. Login Donor
    const donorRes = await request(app).post('/api/auth/login').send({
      email: 'donor@example.com',
      password: 'password123'
    });
    donorToken = donorRes.body.token;
  });

  afterAll(async () => {
    // Reset Sunshine Animal Sanctuary status back to PENDING if changed
    if (pendingNgoProfile?.id) {
      await prisma.ngoProfile.update({
        where: { id: pendingNgoProfile.id },
        data: { verificationStatus: 'PENDING' }
      });
    }
  });

  // --- Point 1: File magic byte verification ---
  it('rejects wrong file type (mime or extension mismatch) with 400', async () => {
    const res = await request(app)
      .post('/api/ngos/my/documents')
      .set('Authorization', `Bearer ${pendingNgoToken}`)
      .field('docType', 'REGISTRATION_CERTIFICATE')
      .attach('file', Buffer.from('console.log("hello")'), 'script.js');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Only PDF, JPG, and PNG/i);
  });

  it('rejects file when first bytes do not match declared signature with 400', async () => {
    const res = await request(app)
      .post('/api/ngos/my/documents')
      .set('Authorization', `Bearer ${pendingNgoToken}`)
      .field('docType', 'REGISTRATION_CERTIFICATE')
      .attach('file', fakePdfBuffer, 'fake.pdf');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature does not match/i);
  });

  it('accepts valid PDF with proper magic bytes (%PDF) and creates document', async () => {
    const res = await request(app)
      .post('/api/ngos/my/documents')
      .set('Authorization', `Bearer ${pendingNgoToken}`)
      .field('docType', 'TAX_EXEMPTION_12A_80G')
      .attach('file', validPdfBuffer, 'tax_exemption_valid.pdf');

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.originalName).toBe('tax_exemption_valid.pdf');
    expect(res.body.data.storageKey).toBeUndefined(); // Storage key never exposed
    uploadedDocId = res.body.data.id;
  });

  // --- Point 7 & Point 8: Non-admin cannot stream documents & Cross-NGO isolation ---
  it('prevents non-admins (visitors, donors, NGOs) from streaming documents', async () => {
    // Unauthenticated
    const visitorRes = await request(app).get(`/api/ngos/admin/documents/${uploadedDocId}/stream`);
    expect(visitorRes.status).toBe(401);

    // Donor
    const donorStreamRes = await request(app)
      .get(`/api/ngos/admin/documents/${uploadedDocId}/stream`)
      .set('Authorization', `Bearer ${donorToken}`);
    expect(donorStreamRes.status).toBe(403);

    // NGO
    const ngoStreamRes = await request(app)
      .get(`/api/ngos/admin/documents/${uploadedDocId}/stream`)
      .set('Authorization', `Bearer ${pendingNgoToken}`);
    expect(ngoStreamRes.status).toBe(403);
  });

  it('allows Admin to stream document with proper Content-Type', async () => {
    const res = await request(app)
      .get(`/api/ngos/admin/documents/${uploadedDocId}/stream`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/i);
  });

  it('ensures one NGO cannot see another NGOs documents in /my/documents', async () => {
    const otherNgoDocs = await request(app)
      .get('/api/ngos/my/documents')
      .set('Authorization', `Bearer ${otherNgoToken}`);

    expect(otherNgoDocs.status).toBe(200);
    const docIds = otherNgoDocs.body.data.map((d) => d.id);
    expect(docIds).not.toContain(uploadedDocId);
  });

  // --- Point 3: Uploading or deleting allowed only while PENDING or REJECTED ---
  it('blocks APPROVED NGO from uploading new documents with 403', async () => {
    const res = await request(app)
      .post('/api/ngos/my/documents')
      .set('Authorization', `Bearer ${approvedNgoToken}`)
      .field('docType', 'ANNUAL_REPORT')
      .attach('file', validPdfBuffer, 'annual_report.pdf');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Cannot upload documents while NGO verification status is APPROVED/i);
  });

  // --- Point 2 & Point 8: Deleting documents ---
  it('blocks another NGO from deleting a document it does not own with 403', async () => {
    const res = await request(app)
      .delete(`/api/ngos/my/documents/${uploadedDocId}`)
      .set('Authorization', `Bearer ${otherNgoToken}`);

    expect(res.status).toBe(403);
  });

  it('allows owner NGO to delete its document while status is PENDING or REJECTED', async () => {
    const res = await request(app)
      .delete(`/api/ngos/my/documents/${uploadedDocId}`)
      .set('Authorization', `Bearer ${pendingNgoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted successfully/i);

    // Verify document deleted in database
    const dbDoc = await prisma.ngoDocument.findUnique({ where: { id: uploadedDocId } });
    expect(dbDoc).toBeNull();
  });

  // --- Point 5: Admin APPROVED blocked if NGO has no documents ---
  it('blocks admin from setting status to APPROVED if NGO has no documents', async () => {
    // Create a temporary NGO without any documents
    const tempCategory = await prisma.category.findFirst();
    const tempUser = await prisma.user.create({
      data: {
        email: `nodocs.${Date.now()}@ngo.org`,
        passwordHash: 'dummy',
        name: 'No Docs NGO',
        role: 'ngo'
      }
    });
    const tempNgo = await prisma.ngoProfile.create({
      data: {
        userId: tempUser.id,
        orgName: 'Empty Docs Initiative',
        regNumber: `REG-NODOCS-${Date.now()}`,
        description: 'NGO with no documents',
        categoryId: tempCategory.id,
        contactPhone: '+91 99999 88888',
        address: 'Test Addr',
        city: 'Delhi',
        verificationStatus: 'PENDING'
      }
    });

    const res = await request(app)
      .patch(`/api/ngos/admin/${tempNgo.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ verificationStatus: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot approve an NGO without verification documents/i);

    // Clean up temp records
    await prisma.ngoProfile.delete({ where: { id: tempNgo.id } });
    await prisma.user.delete({ where: { id: tempUser.id } });
  });

  // --- Point 6 & Reason on Rejection: Admin reject needs a reason, creates review row ---
  it('rejects admin status update to REJECTED if reason is missing with 400', async () => {
    const res = await request(app)
      .patch(`/api/ngos/admin/${pendingNgoProfile.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ verificationStatus: 'REJECTED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reason is required/i);
  });

  it('allows admin to REJECT an NGO with a reason and creates an NgoVerificationReview row', async () => {
    const res = await request(app)
      .patch(`/api/ngos/admin/${pendingNgoProfile.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        verificationStatus: 'REJECTED',
        verificationNotes: 'Registration certificate is blurry and missing seal'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('REJECTED');
    expect(res.body.data.verificationNotes).toBe('Registration certificate is blurry and missing seal');

    // Verify review history row created
    const latestReview = await prisma.ngoVerificationReview.findFirst({
      where: { ngoProfileId: pendingNgoProfile.id },
      orderBy: { createdAt: 'desc' }
    });
    expect(latestReview).toBeDefined();
    expect(latestReview.fromStatus).toBe('PENDING');
    expect(latestReview.toStatus).toBe('REJECTED');
    expect(latestReview.notes).toMatch(/blurry/i);
  });

  // --- Point 4 & Point 6: Resubmit rules ---
  it('blocks resubmit if NGO has no uploaded documents', async () => {
    // Sunshine currently has the seeded doc, let's delete all its docs temporarily to test
    const existingDocs = await prisma.ngoDocument.findMany({
      where: { ngoProfileId: pendingNgoProfile.id }
    });
    await prisma.ngoDocument.deleteMany({
      where: { ngoProfileId: pendingNgoProfile.id }
    });

    const res = await request(app)
      .post('/api/ngos/my/resubmit')
      .set('Authorization', `Bearer ${pendingNgoToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one uploaded document/i);

    // Restore a valid document
    const uploadRes = await request(app)
      .post('/api/ngos/my/documents')
      .set('Authorization', `Bearer ${pendingNgoToken}`)
      .field('docType', 'REGISTRATION_CERTIFICATE')
      .attach('file', validPdfBuffer, 'clear_registration_cert.pdf');

    expect(uploadRes.status).toBe(201);
  });

  it('allows REJECTED NGO with documents to resubmit, transitioning status to PENDING and writing review row', async () => {
    const res = await request(app)
      .post('/api/ngos/my/resubmit')
      .set('Authorization', `Bearer ${pendingNgoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('PENDING');

    // Check review row written
    const review = await prisma.ngoVerificationReview.findFirst({
      where: {
        ngoProfileId: pendingNgoProfile.id,
        toStatus: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(review).toBeDefined();
    expect(review.fromStatus).toBe('REJECTED');
    expect(review.toStatus).toBe('PENDING');
    expect(review.notes).toBe('Resubmitted by NGO');
  });

  it('blocks resubmit when status is already PENDING with 400', async () => {
    const res = await request(app)
      .post('/api/ngos/my/resubmit')
      .set('Authorization', `Bearer ${pendingNgoToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only allowed for REJECTED NGOs/i);
  });
});
