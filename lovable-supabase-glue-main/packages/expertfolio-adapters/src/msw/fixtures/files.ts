// Files test fixtures
// [pkg-05-files-fixtures]

import type { FileDownloadResponse } from '../../schemas/files.v1';

export const fileFixtures: Record<string, FileDownloadResponse> = {
  'file_001': {
    url: '/test-files/document.pdf',
    filename: 'assignment-document.pdf',
    content_type: 'application/pdf'
  },
  'file_002': {
    url: '/test-files/image.jpg',
    filename: 'screenshot.jpg',
    content_type: 'image/jpeg'
  },
  'file_003': {
    url: '/test-files/spreadsheet.xlsx',
    filename: 'grades.xlsx',
    content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  'uuid-file-001': {
    url: 'https://example.com/files/secure/abc123.pdf',
    filename: 'secure-document.pdf',
    content_type: 'application/pdf'
  }
};