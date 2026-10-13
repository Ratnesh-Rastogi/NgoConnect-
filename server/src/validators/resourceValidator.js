import { z } from 'zod';

export const createResourceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  description: z.string().min(5, 'Description must be at least 5 characters long'),
  categoryId: z.string().uuid('Valid Category ID is required'),
  quantityTotal: z.number().int().positive('Total quantity must be a positive integer'),
  unit: z.string().min(1, 'Unit (e.g. boxes, kg, kits) is required'),
  expiryDate: z
    .string()
    .optional()
    .refine((val) => !val || new Date(val) > new Date(), {
      message: 'Expiry date cannot be in the past'
    }),
  city: z.string().min(2, 'City is required'),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

export const updateResourceSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  categoryId: z.string().uuid().optional(),
  quantityTotal: z.number().int().positive().optional(),
  unit: z.string().min(1).optional(),
  expiryDate: z
    .string()
    .optional()
    .refine((val) => !val || new Date(val) > new Date(), {
      message: 'Expiry date cannot be in the past'
    }),
  city: z.string().min(2).optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.enum(['ACTIVE', 'EXHAUSTED', 'EXPIRED', 'WITHDRAWN']).optional()
});

export const claimResourceSchema = z.object({
  quantity: z.number().int().positive('Claim quantity must be a positive integer'),
  claimNote: z.string().optional()
});
