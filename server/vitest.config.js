import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
dotenv.config();

// Ensure test environment uses test database
process.env.NODE_ENV = 'test';
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false, // Run test suites sequentially to avoid database race conditions
    globalSetup: ['./tests/globalSetup.js']
  }
});

