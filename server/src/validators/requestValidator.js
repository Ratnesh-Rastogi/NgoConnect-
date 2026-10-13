import { z } from 'zod';

export const createRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  description: z.string().min(5, 'Description must be at least 5 characters long'),
  category: z.string().min(2, 'Category is required'),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  quantityNeeded: z.number().int().positive('Quantity needed must be a positive integer'),
  unit: z.string().min(1, 'Unit (e.g. boxes, kg, units) is required'),
  location: z.string().min(2, 'Location is required')
});

export const updateRequestSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  category: z.string().min(2).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  quantityNeeded: z.number().int().positive().optional(),
  unit: z.string().min(1).optional(),
  location: z.string().min(2).optional(),
  status: z.enum(['OPEN', 'PARTIAL', 'FULFILLED', 'CANCELLED']).optional()
});
