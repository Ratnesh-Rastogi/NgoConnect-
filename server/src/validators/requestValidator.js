import { z } from 'zod';

export const createRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  description: z.string().min(5, 'Description must be at least 5 characters long'),
  categoryId: z.string().min(1, 'Category ID is required').optional(),
  category: z.string().min(2, 'Category is required').optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  quantityNeeded: z.number().int().positive('Quantity needed must be a positive integer'),
  unit: z.string().min(1, 'Unit (e.g. boxes, kg, units) is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  location: z.string().optional()
}).refine((data) => data.categoryId || data.category, {
  message: 'Category or categoryId is required',
  path: ['categoryId']
});

export const updateRequestSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  categoryId: z.string().optional(),
  category: z.string().optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  quantityNeeded: z.number().int().positive().optional(),
  unit: z.string().min(1).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  location: z.string().optional(),
  status: z.enum(['OPEN', 'PARTIAL', 'FULFILLED', 'CANCELLED']).optional()
});
