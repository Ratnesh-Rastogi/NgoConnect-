import { z } from 'zod';

export const updateNgoStatusSchema = z.object({
  verificationStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], {
    errorMap: () => ({ message: 'Status must be PENDING, APPROVED, REJECTED, or SUSPENDED' })
  }),
  verificationNotes: z.string().optional()
});

export const updateNgoProfileSchema = z.object({
  orgName: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  category: z.string().min(2).optional(),
  contactPhone: z.string().min(5).optional(),
  address: z.string().min(3).optional(),
  city: z.string().min(2).optional(),
  verificationDocUrl: z.string().optional()
});
