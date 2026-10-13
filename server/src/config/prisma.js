import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

// Singleton instance of Prisma Client to avoid multiple active pools
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl
    }
  }
});
