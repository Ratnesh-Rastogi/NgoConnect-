import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    role: z.enum(['donor', 'ngo'], {
      errorMap: () => ({ message: "Role must be either 'donor' or 'ngo'" })
    }),
    // NGO specific fields (required if role === 'ngo')
    orgName: z.string().min(2, 'Organization name is required for NGOs').optional(),
    regNumber: z.string().min(2, 'Registration number is required for NGOs').optional(),
    description: z.string().min(5, 'Organization description is required for NGOs').optional(),
    categoryId: z.string().optional(),
    category: z.string().optional(),
    contactPhone: z.string().min(5, 'Contact phone is required for NGOs').optional(),
    address: z.string().min(3, 'Address is required for NGOs').optional(),
    city: z.string().min(2, 'City is required for NGOs').optional(),
    verificationDocUrl: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.role === 'ngo') {
      if (!data.categoryId && !data.category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'category or categoryId is required for NGO registration',
          path: ['category']
        });
      }
      const requiredNgoFields = [
        'orgName',
        'regNumber',
        'description',
        'contactPhone',
        'address',
        'city'
      ];
      for (const field of requiredNgoFields) {
        if (!data[field] || typeof data[field] !== 'string' || !data[field].trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${field} is required for NGO registration`,
            path: [field]
          });
        }
      }
    }
  });

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});
