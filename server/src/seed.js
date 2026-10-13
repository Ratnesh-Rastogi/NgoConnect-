import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './config/prisma.js';
import { resolveCityCoordinates } from './utils/geo.js';
import { saveFile } from './services/storageService.js';

export async function seed(customPrisma) {
  const db = customPrisma || prisma;
  if (process.env.NODE_ENV === 'production') {
    console.error('[Seed Error] Database seeding is strictly forbidden when NODE_ENV=production.');
    process.exit(1);
  }

  console.log('[Seed] Starting database seeding for NGOConnect AI...');

  // Clean existing records in correct foreign key relation order
  await db.notification.deleteMany();
  await db.transferEvent.deleteMany();
  await db.transfer.deleteMany();
  await db.resource.deleteMany();
  await db.resourceRequest.deleteMany();
  await db.ngoVerificationReview.deleteMany();
  await db.ngoDocument.deleteMany();
  await db.ngoService.deleteMany();
  await db.ngoProfile.deleteMany();
  await db.user.deleteMany();
  await db.category.deleteMany();

  // 1. Seed Categories
  const categoryDefs = [
    { name: 'Education', slug: 'education' },
    { name: 'Healthcare', slug: 'healthcare' },
    { name: 'Food Distribution', slug: 'food-distribution' },
    { name: 'Environmental Protection', slug: 'environmental-protection' },
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Shelter', slug: 'shelter' }
  ];

  const categoryMap = {};
  for (const cat of categoryDefs) {
    const created = await db.category.create({ data: cat });
    categoryMap[cat.slug] = created.id;
  }
  console.log('[Seed] Categories seeded successfully.');

  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('password123', salt);

  // 2. Create Admin
  const admin = await db.user.create({
    data: {
      email: 'admin@ngoconnect.org',
      passwordHash: commonPasswordHash,
      name: 'System Administrator',
      role: 'admin'
    }
  });
  console.log(`[Seed] Created admin: ${admin.email}`);

  // Helper to create a seeded valid PDF document
  const seedDocument = async (ngoProfileId, docType, originalName) => {
    const dummyPdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
    );
    const storageKey = await saveFile(dummyPdfContent, originalName, 'application/pdf');
    return db.ngoDocument.create({
      data: {
        ngoProfileId,
        docType,
        originalName,
        storageKey,
        mimeType: 'application/pdf',
        fileSize: dummyPdfContent.length
      }
    });
  };

  // 3. Create Approved NGO 1: Hope Relief Foundation
  const ngoUser1 = await db.user.create({
    data: {
      email: 'hope@relief.org',
      passwordHash: commonPasswordHash,
      name: 'Dr. Anita Roy',
      role: 'ngo'
    }
  });

  const ngoProfile1 = await db.ngoProfile.create({
    data: {
      userId: ngoUser1.id,
      orgName: 'Hope Relief Foundation',
      regNumber: 'NGO-DEL-2022-0941',
      description: 'Dedicated to rapid disaster relief, emergency medical aid, and shelter assistance across northern regions.',
      categoryId: categoryMap['shelter'],
      contactPhone: '+91 98110 12345',
      address: 'Plot 42, Vasant Kunj Sector C',
      city: 'New Delhi',
      publicEmail: 'info@hoperelief-public.org',
      publicPhone: '+91 98110 12345',
      whatsappNumber: '+91 98110 12345',
      website: 'https://hoperelief.org',
      facebookUrl: 'https://facebook.com/hoperelief',
      instagramUrl: 'https://instagram.com/hoperelief',
      showFullAddress: true,
      emergencyAvailable: true,
      available24x7: true,
      serviceAreaNote: '24/7 emergency rescue and disaster shelter across Delhi-NCR',
      verificationStatus: 'APPROVED',
      verificationNotes: 'Registered trust verified with official tax exemption certificate.'
    }
  });
  await db.ngoService.createMany({
    data: [
      { ngoId: ngoProfile1.id, categoryId: categoryMap['shelter'] },
      { ngoId: ngoProfile1.id, categoryId: categoryMap['healthcare'] },
      { ngoId: ngoProfile1.id, categoryId: categoryMap['food-distribution'] }
    ]
  });
  await seedDocument(ngoProfile1.id, 'REGISTRATION_CERTIFICATE', 'hope_relief_trust_deed.pdf');
  await seedDocument(ngoProfile1.id, 'TAX_EXEMPTION_12A_80G', 'hope_relief_80g_exemption.pdf');
  await db.ngoVerificationReview.create({
    data: {
      ngoProfileId: ngoProfile1.id,
      reviewerId: admin.id,
      fromStatus: 'PENDING',
      toStatus: 'APPROVED',
      notes: 'Verified registration document and 80G tax certificate via government portal.'
    }
  });

  // 4. Create Approved NGO 2: Clean Water & Health Initiative (Patna, Bihar)
  const ngoUser2 = await db.user.create({
    data: {
      email: 'cleanwater@health.org',
      passwordHash: commonPasswordHash,
      name: 'Marcus Chen',
      role: 'ngo'
    }
  });

  const ngoProfile2 = await db.ngoProfile.create({
    data: {
      userId: ngoUser2.id,
      orgName: 'Clean Water & Health Initiative',
      regNumber: 'NGO-PAT-2021-4820',
      description: 'Providing clean drinking water access, mobile purification kits, and water sanitation hygiene education.',
      categoryId: categoryMap['healthcare'],
      contactPhone: '+91 98350 54321',
      address: '14 Ganga Road',
      city: 'Patna',
      publicEmail: 'support@cleanwater-public.org',
      publicPhone: '+91 98350 54321',
      whatsappNumber: '+91 98350 54321',
      website: 'https://cleanwaterhealth.org',
      facebookUrl: 'https://facebook.com/cleanwaterhealth',
      instagramUrl: 'https://instagram.com/cleanwaterhealth',
      showFullAddress: false,
      emergencyAvailable: true,
      available24x7: false,
      serviceAreaNote: 'Emergency clean drinking water dispatch in Patna',
      verificationStatus: 'APPROVED',
      verificationNotes: 'Audited annual reports submitted and approved.'
    }
  });
  await db.ngoService.createMany({
    data: [
      { ngoId: ngoProfile2.id, categoryId: categoryMap['healthcare'] },
      { ngoId: ngoProfile2.id, categoryId: categoryMap['environmental-protection'] }
    ]
  });
  await seedDocument(ngoProfile2.id, 'REGISTRATION_CERTIFICATE', 'clean_water_society_reg.pdf');
  await db.ngoVerificationReview.create({
    data: {
      ngoProfileId: ngoProfile2.id,
      reviewerId: admin.id,
      fromStatus: 'PENDING',
      toStatus: 'APPROVED',
      notes: 'Audited annual reports and society registration approved.'
    }
  });

  // 5. Create Approved NGO 3: Mumbai Community Aid (Mumbai, Maharashtra)
  const ngoUser3 = await db.user.create({
    data: {
      email: 'mumbai@aid.org',
      passwordHash: commonPasswordHash,
      name: 'Priya Sharma',
      role: 'ngo'
    }
  });

  const ngoProfile3 = await db.ngoProfile.create({
    data: {
      userId: ngoUser3.id,
      orgName: 'Mumbai Community Aid',
      regNumber: 'NGO-MUM-2023-3310',
      description: 'Emergency food distribution, mobile pantry vans, and essentials for underprivileged families.',
      categoryId: categoryMap['food-distribution'],
      contactPhone: '+91 98200 11223',
      address: '50 Andheri West Link Road',
      city: 'Mumbai',
      publicEmail: 'contact@mumbaiaid-public.org',
      publicPhone: '+91 98200 11223',
      whatsappNumber: '+91 98200 11223',
      website: 'https://mumbaicommunityaid.org',
      facebookUrl: 'https://facebook.com/mumbaicommunityaid',
      instagramUrl: 'https://instagram.com/mumbaicommunityaid',
      showFullAddress: true,
      emergencyAvailable: true,
      available24x7: false,
      serviceAreaNote: 'Emergency community aid across Mumbai',
      verificationStatus: 'APPROVED',
      verificationNotes: 'Registered non-profit verified with tax exemption.'
    }
  });
  await db.ngoService.createMany({
    data: [
      { ngoId: ngoProfile3.id, categoryId: categoryMap['food-distribution'] },
      { ngoId: ngoProfile3.id, categoryId: categoryMap['shelter'] },
      { ngoId: ngoProfile3.id, categoryId: categoryMap['clothing'] }
    ]
  });
  await seedDocument(ngoProfile3.id, 'REGISTRATION_CERTIFICATE', 'mumbai_aid_reg.pdf');
  await db.ngoVerificationReview.create({
    data: {
      ngoProfileId: ngoProfile3.id,
      reviewerId: admin.id,
      fromStatus: 'PENDING',
      toStatus: 'APPROVED',
      notes: 'Verified registration document.'
    }
  });

  // 6. Create Approved NGO 4: Delhi Youth & Education Foundation (Second Delhi NGO WITHOUT emergency flags)
  const ngoUser4 = await db.user.create({
    data: {
      email: 'delhiedu@youth.org',
      passwordHash: commonPasswordHash,
      name: 'Vikram Malhotra',
      role: 'ngo'
    }
  });

  const ngoProfile4 = await db.ngoProfile.create({
    data: {
      userId: ngoUser4.id,
      orgName: 'Delhi Youth & Education Foundation',
      regNumber: 'NGO-DEL-2023-5590',
      description: 'Educational programs, literacy materials, and student mentoring for disadvantaged youth.',
      categoryId: categoryMap['education'],
      contactPhone: '+91 98119 87654',
      address: '88 Connaught Place Outer Circle',
      city: 'New Delhi',
      publicEmail: 'contact@delhiedu-public.org',
      publicPhone: '+91 98119 87654',
      whatsappNumber: '+91 98119 87654',
      website: 'https://delhiyouthfoundation.org',
      facebookUrl: 'https://facebook.com/delhiyouthfoundation',
      instagramUrl: 'https://instagram.com/delhiyouthfoundation',
      showFullAddress: false,
      emergencyAvailable: false,
      available24x7: false,
      serviceAreaNote: null,
      verificationStatus: 'APPROVED',
      verificationNotes: 'Verified registration document.'
    }
  });
  await db.ngoService.createMany({
    data: [
      { ngoId: ngoProfile4.id, categoryId: categoryMap['education'] }
    ]
  });
  await seedDocument(ngoProfile4.id, 'REGISTRATION_CERTIFICATE', 'delhi_youth_reg.pdf');
  await db.ngoVerificationReview.create({
    data: {
      ngoProfileId: ngoProfile4.id,
      reviewerId: admin.id,
      fromStatus: 'PENDING',
      toStatus: 'APPROVED',
      notes: 'Educational foundation credentials verified.'
    }
  });

  // 7. Create PENDING NGO 5: Sunshine Animal Sanctuary (appears in admin queue)
  const ngoUser5 = await db.user.create({
    data: {
      email: 'sunshine@animals.org',
      passwordHash: commonPasswordHash,
      name: 'Rohan Verma',
      role: 'ngo'
    }
  });

  const ngoProfile5 = await db.ngoProfile.create({
    data: {
      userId: ngoUser5.id,
      orgName: 'Sunshine Animal Sanctuary',
      regNumber: 'NGO-BLR-2024-1102',
      description: 'Rescuing and rehabilitating abandoned and injured street animals.',
      categoryId: categoryMap['environmental-protection'],
      contactPhone: '+91 99000 88776',
      address: '22 Whitefield Main Rd',
      city: 'Bengaluru',
      verificationStatus: 'PENDING',
      verificationNotes: null
    }
  });
  await seedDocument(ngoProfile5.id, 'REGISTRATION_CERTIFICATE', 'sunshine_animal_sanctuary_reg.pdf');
  console.log(`[Seed] Seeded pending NGO with document for admin queue: ${ngoProfile5.orgName}`);

  // 6. Create Donor: Sarah Donor
  const donorUser = await db.user.create({
    data: {
      email: 'donor@example.com',
      passwordHash: commonPasswordHash,
      name: 'Sarah Jenkins',
      role: 'donor'
    }
  });
  console.log(`[Seed] Created donor: ${donorUser.email}`);

  // 7. Create Resource Requests with geographic coordinates
  const delhiGeo = resolveCityCoordinates('New Delhi');
  const patnaGeo = resolveCityCoordinates('Patna');

  const request1 = await db.resourceRequest.create({
    data: {
      ngoProfileId: ngoProfile1.id,
      title: 'Emergency Thermal Blankets for Winter Relief',
      description: 'Cold wave relief drive for homeless families and seasonal migrant workers in outer Delhi.',
      categoryId: categoryMap['shelter'],
      urgency: 'CRITICAL',
      quantityNeeded: 200,
      quantityFulfilled: 0,
      quantityReserved: 50,
      unit: 'blankets',
      city: delhiGeo.city,
      state: delhiGeo.state,
      latitude: delhiGeo.latitude,
      longitude: delhiGeo.longitude,
      status: 'OPEN'
    }
  });

  const request2 = await db.resourceRequest.create({
    data: {
      ngoProfileId: ngoProfile1.id,
      title: 'Pediatric First-Aid & Essential Antibiotic Kits',
      description: 'Urgent medical aid kits for flood-affected families in trans-Yamuna settlements.',
      categoryId: categoryMap['healthcare'],
      urgency: 'HIGH',
      quantityNeeded: 80,
      quantityFulfilled: 0,
      quantityReserved: 0,
      unit: 'medical kits',
      city: delhiGeo.city,
      state: delhiGeo.state,
      latitude: delhiGeo.latitude,
      longitude: delhiGeo.longitude,
      status: 'OPEN'
    }
  });

  const request3 = await db.resourceRequest.create({
    data: {
      ngoProfileId: ngoProfile2.id,
      title: 'Water Purification Tablets (Chlorine Tablets)',
      description: 'Chlorine purification tablets to distribute across 12 villages facing contaminated groundwater.',
      categoryId: categoryMap['healthcare'],
      urgency: 'HIGH',
      quantityNeeded: 500,
      quantityFulfilled: 100,
      quantityReserved: 0,
      unit: 'strip packs',
      city: patnaGeo.city,
      state: patnaGeo.state,
      latitude: patnaGeo.latitude,
      longitude: patnaGeo.longitude,
      status: 'PARTIAL'
    }
  });

  // 8. Create sample donor available resources
  const expiryDate1 = new Date();
  expiryDate1.setDate(expiryDate1.getDate() + 45); // 45 days in future

  await db.resource.create({
    data: {
      ownerId: donorUser.id,
      title: 'Dry Ration Food Kits (Rice, Pulses, Oil)',
      description: 'Sealed pre-packaged food relief boxes suitable for family assistance.',
      categoryId: categoryMap['food-distribution'],
      quantityTotal: 120,
      quantityAvailable: 120,
      unit: 'kits',
      expiryDate: expiryDate1,
      city: delhiGeo.city,
      state: delhiGeo.state,
      latitude: delhiGeo.latitude,
      longitude: delhiGeo.longitude,
      status: 'ACTIVE'
    }
  });

  const expiryDate2 = new Date();
  expiryDate2.setDate(expiryDate2.getDate() + 90);

  await db.resource.create({
    data: {
      ownerId: donorUser.id,
      title: 'Sterile Cotton Bandages & Antiseptic Wipes',
      description: 'Surplus clinic inventory donated from certified medical distributor.',
      categoryId: categoryMap['healthcare'],
      quantityTotal: 200,
      quantityAvailable: 200,
      unit: 'boxes',
      expiryDate: expiryDate2,
      city: delhiGeo.city,
      state: delhiGeo.state,
      latitude: delhiGeo.latitude,
      longitude: delhiGeo.longitude,
      status: 'ACTIVE'
    }
  });

  // 9. Create sample transfer donation linked to request1
  await db.transfer.create({
    data: {
      donorId: donorUser.id,
      ngoProfileId: ngoProfile1.id,
      requestId: request1.id,
      quantity: 50,
      status: 'PENDING',
      donorNote: 'Dispatching 50 heavy-duty thermal blankets via local courier.'
    }
  });

  console.log('[Seed] Seeding completed successfully!');
  if (!customPrisma) {
    await prisma.$disconnect();
  }
}

export default seed;

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('seed.js')) {
  seed().catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  });
}

