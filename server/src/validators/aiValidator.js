import { z } from 'zod';

export const matchOfferSchema = z.object({
  category: z.string().min(2, 'Category is required'),
  itemName: z.string().min(2, 'Item name is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  location: z.string().optional()
});

export const draftRequestSchema = z.object({
  topic: z.string().min(3, 'Topic/Keywords are required'),
  category: z.string().min(2, 'Category is required'),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
});
