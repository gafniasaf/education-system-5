// Files management schema v1
// [pkg-03-files]

import { z } from 'zod';
import { idField, urlField, relaxed } from './common';

// File finalization request
export const FileFinalizeRequestSchema = z.object({
  key: z.string().min(1, 'File key is required'),
  size_bytes: z.number().min(0, 'File size must be non-negative')
});

// File finalization response
export const FileFinalizeResponseSchema = z.object({
  ok: z.boolean()
});

// File download URL request
export const FileDownloadRequestSchema = z.object({
  id: z.string().min(1, 'File ID is required')
});

// Base file download URL response
const BaseFileDownloadResponseSchema = z.object({
  url: urlField(),
  filename: z.string().nullable(),
  content_type: z.string().nullable()
});

// Relaxed schema for test mode (allows relative URLs)
export const FileDownloadResponseSchema = relaxed(BaseFileDownloadResponseSchema, {
  url: z.string().min(1, 'URL is required')
});

// Export types
export type FileFinalizeRequest = z.infer<typeof FileFinalizeRequestSchema>;
export type FileFinalizeResponse = z.infer<typeof FileFinalizeResponseSchema>;
export type FileDownloadRequest = z.infer<typeof FileDownloadRequestSchema>;
export type FileDownloadResponse = z.infer<typeof FileDownloadResponseSchema>;

// Schema exports for contract testing
export const schemas = {
  FileFinalizeRequest: FileFinalizeRequestSchema,
  FileFinalizeResponse: FileFinalizeResponseSchema,
  FileDownloadRequest: FileDownloadRequestSchema,
  FileDownloadResponse: FileDownloadResponseSchema
};