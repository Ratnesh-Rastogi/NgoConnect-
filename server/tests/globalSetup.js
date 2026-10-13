import dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { seed } from '../src/seed.js';

export async function setup() {
  const testDbUrl =
    process.env.DATABASE_URL_TEST ||
    'postgresql://postgres:1ca7de40aaa91f5a993bd8e637663595517207c53ec159ff@localhost:5433/ngoconnect_ai_test';

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testDbUrl;

  console.log('[Global Test Setup] Resetting test database at:', testDbUrl.split('@')[1] || testDbUrl);

  try {
    // Ensure test database schema matches current Prisma schema
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe'
    });
  } catch (err) {
    console.warn('[Global Test Setup] Warning during prisma db push:', err.message);
  }

  const testPrisma = new PrismaClient({
    datasources: {
      db: { url: testDbUrl }
    }
  });

  // Clean and seed the test database before running test suites
  console.log('[Global Test Setup] Seeding pristine test baseline data...');
  await seed(testPrisma);
  await testPrisma.$disconnect();
  console.log('[Global Test Setup] Test database initialized and isolated from demo data.');
}
