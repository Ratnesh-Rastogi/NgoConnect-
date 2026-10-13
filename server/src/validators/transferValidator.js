import { z } from 'zod';

export const createTransferSchema = z.object({
  requestId: z.string().uuid('A valid request ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  donorNote: z.string().optional()
});

export const updateTransferStatusSchema = z.object({
  status: z.enum(['IN_TRANSIT', 'RECEIVED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Status must be IN_TRANSIT, RECEIVED, or CANCELLED' })
  }),
  trackingInfo: z.string().optional()
});
