import { PrismaClient } from '@prisma/client';

// Singleton instance of Prisma Client to avoid multiple active pools
export const prisma = new PrismaClient();
