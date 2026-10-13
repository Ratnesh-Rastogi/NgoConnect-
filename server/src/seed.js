import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './config/prisma.js';

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Seed Error] Database seeding is strictly forbidden when NODE_ENV=production.');
    process.exit(1);
  }

  console.log('[Seed] Starting database seeding for NGOConnect AI...');

  // Clean existing records in correct relation order
  await prisma.transfer.deleteMany();
  await prisma.resourceRequest.deleteMany();
  await prisma.ngoProfile.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('password123', salt);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ngoconnect.org',
      passwordHash: commonPasswordHash,
      name: 'System Administrator',
      role: 'admin'
    }
  });
  console.log(`[Seed] Created admin: ${admin.email}`);

  // 2. Create Approved NGO 1: Hope Relief Foundation
  const ngoUser1 = await prisma.user.create({
    data: {
      email: 'hope@relief.org',
      passwordHash: commonPasswordHash,
      name: 'Dr. Anita Roy',
      role: 'ngo'
    }
  });

  const ngoProfile1 = await prisma.ngoProfile.create({
    data: {
      userId: ngoUser1.id,
      orgName: 'Hope Relief Foundation',
      regNumber: 'NGO-DEL-2022-0941',
      description: 'Dedicated to rapid disaster relief, emergency medical aid, and shelter assistance across northern regions.',
      category: 'Disaster Relief',
      contactPhone: '+91 98110 12345',
      address: 'Plot 42, Vasant Kunj Sector C',
      city: 'New Delhi',
      verificationStatus: 'APPROVED',
      verificationNotes: 'Registered trust verified with official tax exemption certificate.'
    }
  });

  // 3. Create Approved NGO 2: Clean Water & Health Initiative
  const ngoUser2 = await prisma.user.create({
    data: {
      email: 'cleanwater@health.org',
      passwordHash: commonPasswordHash,
      name: 'Marcus Chen',
      role: 'ngo'
    }
  });

  const ngoProfile2 = await prisma.ngoProfile.create({
    data: {
      userId: ngoUser2.id,
      orgName: 'Clean Water & Health Initiative',
      regNumber: 'NGO-PAT-2021-4820',
      description: 'Providing clean drinking water access, mobile purification kits, and water sanitation hygiene education.',
      category: 'Healthcare',
      contactPhone: '+91 98350 54321',
      address: '14 Ganga Road',
      city: 'Patna',
      verificationStatus: 'APPROVED',
      verificationNotes: 'Audited annual reports submitted and approved.'
    }
  });

  // 4. Create PENDING NGO 3: Sunshine Animal Sanctuary (For testing admin approval)
  const ngoUser3 = await prisma.user.create({
    data: {
      email: 'sunshine@animals.org',
      passwordHash: commonPasswordHash,
      name: 'Rohan Verma',
      role: 'ngo'
    }
  });

  await prisma.ngoProfile.create({
    data: {
      userId: ngoUser3.id,
      orgName: 'Sunshine Animal Sanctuary',
      regNumber: 'NGO-BLR-2024-1102',
      description: 'Rescuing and rehabilitating abandoned and injured street animals.',
      category: 'Animal Welfare',
      contactPhone: '+91 99000 88776',
      address: '22 Whitefield Main Rd',
      city: 'Bengaluru',
      verificationStatus: 'PENDING',
      verificationNotes: 'Awaiting government registration certificate scan.'
    }
  });

  // 5. Create Donor: Sarah Donor
  const donorUser = await prisma.user.create({
    data: {
      email: 'donor@example.com',
      passwordHash: commonPasswordHash,
      name: 'Sarah Jenkins',
      role: 'donor'
    }
  });
  console.log(`[Seed] Created donor: ${donorUser.email}`);

  // 6. Create Resource Requests for Approved NGOs
  const request1 = await prisma.resourceRequest.create({
    data: {
      ngoProfileId: ngoProfile1.id,
      title: 'Emergency Thermal Blankets for Winter Relief',
      description: 'Cold wave relief drive for homeless families and seasonal migrant workers in outer Delhi.',
      category: 'Shelter',
      urgency: 'CRITICAL',
      quantityNeeded: 200,
      quantityFulfilled: 0,
      quantityReserved: 50,
      unit: 'blankets',
      location: 'New Delhi',
      status: 'OPEN'
    }
  });

  const request2 = await prisma.resourceRequest.create({
    data: {
      ngoProfileId: ngoProfile1.id,
      title: 'Pediatric First-Aid & Essential Antibiotic Kits',
      description: 'Urgent medical supplies required for flood-affected primary health clinics.',
      category: 'Medical',
      urgency: 'HIGH',
      quantityNeeded: 60,
      quantityFulfilled: 0,
      quantityReserved: 0,
      unit: 'medical kits',
      location: 'New Delhi',
      status: 'OPEN'
    }
  });

  const request3 = await prisma.resourceRequest.create({
    data: {
      ngoProfileId: ngoProfile2.id,
      title: 'Water Purification Tablets (Chlorine Tablets)',
      description: 'Chlorine purification tablets to distribute across 12 villages facing contaminated groundwater.',
      category: 'Healthcare',
      urgency: 'HIGH',
      quantityNeeded: 500,
      quantityFulfilled: 100,
      quantityReserved: 0,
      unit: 'strip packs',
      location: 'Patna',
      status: 'PARTIAL'
    }
  });

  // 7. Create a sample initial transfer
  await prisma.transfer.create({
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
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('[Seed] Error during seeding:', e);
  process.exit(1);
});
