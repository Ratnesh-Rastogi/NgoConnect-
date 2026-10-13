import { z } from 'zod';

export const updateNgoStatusSchema = z
  .object({
    verificationStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], {
      errorMap: () => ({ message: 'Status must be PENDING, APPROVED, REJECTED, or SUSPENDED' })
    }),
    verificationNotes: z.string().optional(),
    notes: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const note = (data.verificationNotes || data.notes || '').trim();
    if (data.verificationStatus === 'REJECTED' && !note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A rejection reason is required',
        path: ['verificationNotes']
      });
    }
  });

export const updateNgoProfileSchema = z.object({
  orgName: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  category: z.string().min(2).optional(),
  categoryId: z.string().optional(),
  contactPhone: z.string().min(5).optional(),
  address: z.string().min(3).optional(),
  city: z.string().min(2).optional()
});

export const uploadDocumentSchema = z.object({
  docType: z.string().min(2, 'Document type is required')
});
