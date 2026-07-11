import { z } from 'zod';

export const adminLoginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const adminApproveSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid entry ID format'),
  }),
});

export const adminRemoveSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid entry ID format'),
  }),
  body: z.object({
    reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
  }),
});

export const adminChangePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
      .min(8, 'New password must be at least 8 characters long')
      .max(100, 'New password cannot exceed 100 characters'),
  }),
});
