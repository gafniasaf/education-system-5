// Files adapter tests
// [pkg-tests-files]

import { filesAdapter } from '../../adapters/files';
import { fileFixtures } from '../../msw/fixtures/files';
import { setTestMode } from '../../config';

describe('FilesAdapter', () => {
  beforeEach(() => {
    setTestMode(true);
  });

  describe('finalizeUpload', () => {
    it('should finalize file upload successfully', async () => {
      const request = {
        key: 'test-file-key',
        size_bytes: 1024
      };
      
      const result = await filesAdapter.finalizeUpload(request);
      
      expect(result).toEqual({ ok: true });
    });

    it('should throw error for invalid request', async () => {
      const invalidRequest = {
        key: '',
        size_bytes: -1
      };
      
      await expect(
        filesAdapter.finalizeUpload(invalidRequest as any)
      ).rejects.toThrow('Invalid finalize request');
    });
  });

  describe('getDownloadUrl', () => {
    it('should get download URL for existing file', async () => {
      const fileId = 'file_001';
      const result = await filesAdapter.getDownloadUrl({ id: fileId });
      
      expect(result).toEqual(fileFixtures[fileId]);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        filesAdapter.getDownloadUrl({ id: 'non_existent_file' })
      ).rejects.toThrow('Failed to get download URL');
    });

    it('should throw error for empty file ID', async () => {
      await expect(
        filesAdapter.getDownloadUrl({ id: '' })
      ).rejects.toThrow('Invalid download request');
    });
  });
});