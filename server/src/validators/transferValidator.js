import { z } from 'zod';

export const createTransferSchema = z.object({
  requestId: z.string().trim().uuid('A valid request ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  donorNote: z.string().trim().optional()
});

export const updateTransferStatusSchema = z.object({
  status: z.enum(['IN_TRANSIT', 'RECEIVED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Status must be IN_TRANSIT, RECEIVED, or CANCELLED' })
  }),
  trackingInfo: z.string().trim().optional()
});
