import cron from 'node-cron';
import { prisma } from '../config/prisma.js';

// Query and transition all active resources past their expiry date to EXPIRED
export const checkAndExpireResources = async () => {
  try {
    const now = new Date();
    const result = await prisma.resource.updateMany({
      where: {
        status: 'ACTIVE',
        expiryDate: {
          not: null,
          lt: now
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    if (result.count > 0) {
      console.log(`[Cron] Marked ${result.count} past-expiry resources as EXPIRED.`);
    }
    return result.count;
  } catch (error) {
    console.error('[Cron Error] Failed to mark expired resources:', error.message);
    return 0;
  }
};

// Start scheduled job at midnight every day; disabled in test mode
export const initExpireResourcesCron = () => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  return cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Executing daily resource expiration check...');
    await checkAndExpireResources();
  });
};
