// Files management adapter
// [pkg-04-files]

import { api } from '../fetch-wrapper';
import { config } from '../config';
import { 
  FileFinalizeRequest,
  FileFinalizeResponse,
  FileDownloadRequest,
  FileDownloadResponse,
  FileFinalizeRequestSchema,
  FileFinalizeResponseSchema,
  FileDownloadRequestSchema,
  FileDownloadResponseSchema
} from '../schemas/files.v1';

export class FilesAdapter {
  private getBaseUrl(): string {
    return config.baseUrl || '/api';
  }

  /**
   * Finalize file upload
   */
  async finalizeUpload(request: FileFinalizeRequest): Promise<FileFinalizeResponse> {
    // Validate request
    const validatedRequest = FileFinalizeRequestSchema.safeParse(request);
    if (!validatedRequest.success) {
      throw new Error(`Invalid finalize request: ${validatedRequest.error.message}`);
    }
    
    const url = `${this.getBaseUrl()}/files/finalize`;
    
    const result = await api.post(url, validatedRequest.data);
    
    if (result.error) {
      throw new Error(`Failed to finalize file: ${result.error.message}`);
    }
    
    // Validate response with Zod
    const validated = FileFinalizeResponseSchema.safeParse(result.data);
    if (!validated.success) {
      console.error('Invalid finalize response:', validated.error);
      throw new Error('Invalid response format from finalize API');
    }
    
    return validated.data;
  }

  /**
   * Get download URL for a file
   */
  async getDownloadUrl(request: FileDownloadRequest): Promise<FileDownloadResponse> {
    // Validate request
    const validatedRequest = FileDownloadRequestSchema.safeParse(request);
    if (!validatedRequest.success) {
      throw new Error(`Invalid download request: ${validatedRequest.error.message}`);
    }
    
    const params = new URLSearchParams({ id: validatedRequest.data.id });
    const url = `${this.getBaseUrl()}/files/download-url?${params.toString()}`;
    
    const result = await api.get(url);
    
    if (result.error) {
      throw new Error(`Failed to get download URL: ${result.error.message}`);
    }
    
    // Validate response with Zod
    const validated = FileDownloadResponseSchema.safeParse(result.data);
    if (!validated.success) {
      console.error('Invalid download URL response:', validated.error);
      throw new Error('Invalid response format from download URL API');
    }
    
    return validated.data;
  }
}

// Export singleton instance
export const filesAdapter = new FilesAdapter();