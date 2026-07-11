import { z } from 'zod';
import { ENTRY_LIMITS } from './entries.constants';
import { getCachedCategories, getCachedReportReasons } from '../config/config.service';

export const createEntrySchema = z.object({
  body: z.object({
    text: z
      .string()
      .min(ENTRY_LIMITS.TEXT_MIN_LENGTH, 'Text cannot be empty')
      .max(
        ENTRY_LIMITS.TEXT_MAX_LENGTH,
        `Text cannot exceed ${ENTRY_LIMITS.TEXT_MAX_LENGTH} characters`,
      ),
    author: z
      .string()
      .max(
        ENTRY_LIMITS.TEXT_MAX_LENGTH,
        `Author cannot exceed ${ENTRY_LIMITS.TEXT_MAX_LENGTH} characters`,
      )
      .optional(),
    source: z
      .string()
      .max(
        ENTRY_LIMITS.SOURCE_MAX_LENGTH,
        `Source cannot exceed ${ENTRY_LIMITS.SOURCE_MAX_LENGTH} characters`,
      )
      .optional(),
    category: z.string().refine(
      (val) => getCachedCategories().includes(val),
      { message: 'Invalid category' }
    ),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
  }),
});

export const updateEntryStatusSchema = z.object({
  body: z.object({
    status: z.enum(['published', 'shadow_hidden', 'removed'], {
      message: 'Invalid status',
    }),
    moderationReason: z.string().optional(),
    moderatedBy: z.string().min(1, 'Moderator identifier is required'),
  }),
});

export const queryEntriesSchema = z.object({
  query: z.object({
    category: z.string().optional().refine(
      (val) => !val || getCachedCategories().includes(val),
      { message: 'Invalid category' }
    ),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const searchEntriesSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1, 'Search query is required'),
    category: z.string().optional().refine(
      (val) => !val || getCachedCategories().includes(val),
      { message: 'Invalid category' }
    ),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const getEntryStatusSchema = z.object({
  params: z.object({
    submissionId: z
      .string()
      .regex(/^ECH-[A-Z2-9]{4}-[A-Z2-9]{4}$/, 'Invalid submission ID format'),
  }),
});

export const randomEntriesSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(10).default(1).optional(),
  }),
});

export const markHelpfulSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid entry ID format'),
  }),
});

export const reportEntrySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid entry ID format'),
  }),
  body: z.object({
    reason: z.string().refine(
      (val) => getCachedReportReasons().includes(val),
      { message: 'Invalid report reason' }
    ),
  }),
});
