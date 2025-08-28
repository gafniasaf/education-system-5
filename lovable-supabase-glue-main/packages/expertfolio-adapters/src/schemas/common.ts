// Common schema utilities and relaxation helpers
// [pkg-03-common-schemas]

import { z } from 'zod';
import { config } from '../config';

// Create relaxed version of strict schemas for test mode
export const relaxed = <T extends z.ZodTypeAny>(schema: T, relaxations: Record<string, z.ZodTypeAny>) => {
  return config.testMode 
    ? schema.extend ? schema.extend(relaxations) 
    : schema.or(z.object(relaxations))
    : schema;
};

// Common field types
export const idField = () => config.testMode 
  ? z.string().min(1, 'ID is required')
  : z.string().uuid('Invalid UUID format');

export const urlField = () => config.testMode 
  ? z.string().min(1, 'URL is required')
  : z.string().url('Invalid URL format');

export const emailField = () => z.string().email('Invalid email format');

export const timestampField = () => z.string().datetime('Invalid datetime format');

// Base API response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  data: dataSchema,
  meta: z.object({
    requestId: z.string(),
    totalCount: z.number().optional(),
    rateLimitInfo: z.object({
      limit: z.number(),
      remaining: z.number(),
      reset: z.number(),
      retryAfter: z.number().optional()
    }).optional(),
    retryCount: z.number().optional()
  }).optional()
});

// Error response schema
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    statusCode: z.number().optional()
  }),
  meta: z.object({
    requestId: z.string(),
    rateLimitInfo: z.object({
      limit: z.number(),
      remaining: z.number(),
      reset: z.number(),
      retryAfter: z.number().optional()
    }).optional(),
    retryCount: z.number().optional()
  }).optional()
});

// Pagination query schema
export const PaginationQuerySchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

// Sort query schema
export const SortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<z.ZodType<T>>>>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type SortQuery = z.infer<typeof SortQuerySchema>;