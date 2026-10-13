import { z } from 'zod';

export const updateNgoStatusSchema = z
  .object({
    verificationStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'], {
      errorMap: () => ({ message: 'Status must be PENDING, APPROVED, REJECTED, or SUSPENDED' })
    }),
    verificationNotes: z.string().trim().optional(),
    notes: z.string().trim().optional()
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

const optionalEmailSchema = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : (typeof val === 'string' ? val.trim() : val)),
  z
    .string()
    .max(120, 'Public email must not exceed 120 characters')
    .email('Valid email address is required')
    .nullable()
    .optional()
);

const optionalPhoneSchema = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : (typeof val === 'string' ? val.trim() : val)),
  z
    .string()
    .max(20, 'Phone number must not exceed 20 characters')
    .regex(/^[0-9+\s-]+$/, 'Phone number can only contain digits, +, spaces, and dashes')
    .nullable()
    .optional()
);

const optionalUrlSchema = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : (typeof val === 'string' ? val.trim() : val)),
  z
    .string()
    .max(200, 'URL must not exceed 200 characters')
    .refine((val) => /^https?:\/\/.+/i.test(val), {
      message: 'URL must start with http:// or https://'
    })
    .nullable()
    .optional()
);

export const updateNgoProfileSchema = z.object({
  orgName: z.string().trim().min(2).optional(),
  description: z.string().trim().min(5).optional(),
  category: z.string().trim().min(2).optional(),
  categoryId: z.string().trim().optional(),
  contactPhone: z.string().trim().min(5).optional(),
  address: z.string().trim().min(3).optional(),
  city: z.string().trim().min(2).optional(),
  publicEmail: optionalEmailSchema,
  publicPhone: optionalPhoneSchema,
  whatsappNumber: optionalPhoneSchema,
  website: optionalUrlSchema,
  facebookUrl: optionalUrlSchema,
  instagramUrl: optionalUrlSchema,
  showFullAddress: z.boolean().optional(),
  // Urgent Help & Service Category fields
  emergencyAvailable: z.boolean().optional(),
  available24x7: z.boolean().optional(),
  serviceAreaNote: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : typeof val === 'string' ? val.trim() : val),
    z.string().max(200, 'Service area note must not exceed 200 characters').nullable().optional()
  ),
  serviceCategoryIds: z
    .array(z.string().uuid('Category ID must be a valid UUID'))
    .transform((ids) => [...new Set(ids)])
    .refine((ids) => ids.length <= 10, { message: 'At most 10 services allowed' })
    .optional()
});

export const urgentSearchQuerySchema = z.object({
  category: z
    .preprocess((val) => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
      if (typeof val === 'string') return val.split(',').map((v) => v.trim()).filter(Boolean);
      return val;
    }, z.array(z.string().uuid('Category ID must be a valid UUID')).max(10, 'At most 10 categories allowed'))
    .optional(),
  city: z.string().trim().max(60, 'City must not exceed 60 characters').optional(),
  state: z.string().trim().max(60, 'State must not exceed 60 characters').optional(),
  emergency: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
      }
      return val;
    }, z.boolean({ invalid_type_error: 'Emergency must be a boolean string' }))
    .optional(),
  page: z.coerce.number().int().positive('Page must be a positive integer').default(1),
  limit: z.coerce
    .number()
    .int()
    .positive('Limit must be a positive integer')
    .default(12)
    .transform((val) => Math.min(20, val))
});

export const uploadDocumentSchema = z.object({
  docType: z.string().trim().min(2, 'Document type is required')
});

