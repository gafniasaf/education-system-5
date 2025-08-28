// Files management page - route agnostic
// [pkg-09-files-page]

import React, { useState } from 'react';
import { filesAdapter } from '@lovable/expertfolio-adapters';
import { ErrorBanner, EmptyState, FileInput, LoadingState } from '../components';
import { Upload, Download, File, AlertCircle } from 'lucide-react';

export interface FilesPageProps {
  onFileUploaded?: (fileKey: string) => void;
  className?: string;
}

interface UploadedFile {
  key: string;
  name: string;
  size: number;
  status: 'uploading' | 'finalizing' | 'complete' | 'error';
  progress?: number;
  error?: string;
}

export const FilesPage: React.FC<FilesPageProps> = ({
  onFileUploaded,
  className = ''
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<any>(null);

  const handleFilesSelected = async (files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      key: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      status: 'uploading' as const,
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setError(null);

    // Simulate upload process and finalization
    for (const uploadFile of newFiles) {
      try {
        // Update status to finalizing
        setUploadedFiles(prev => 
          prev.map(f => 
            f.key === uploadFile.key 
              ? { ...f, status: 'finalizing', progress: 100 }
              : f
          )
        );

        // Finalize the upload
        const result = await filesAdapter.finalizeUpload({
          key: uploadFile.key,
          size_bytes: uploadFile.size
        });

        if (result.ok) {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.key === uploadFile.key 
                ? { ...f, status: 'complete' }
                : f
            )
          );
          onFileUploaded?.(uploadFile.key);
        } else {
          throw new Error('Upload finalization failed');
        }
      } catch (err) {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.key === uploadFile.key 
              ? { 
                  ...f, 
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Upload failed'
                }
              : f
          )
        );
      }
    }
  };

  const handleFileUploadError = (errors: any[]) => {
    setError({
      message: `${errors.length} file(s) failed validation`,
      details: errors.map(e => e.error).join(', ')
    });
  };

  const handleRemoveFile = (fileKey: string) => {
    setUploadedFiles(prev => prev.filter(f => f.key !== fileKey));
  };

  const handleDownloadFile = async (fileId: string) => {
    try {
      const result = await filesAdapter.getDownloadUrl({ id: fileId });
      
      // Create download link
      const link = document.createElement('a');
      link.href = result.url;
      if (result.filename) {
        link.download = result.filename;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError({
        message: 'Failed to download file',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'finalizing':
        return <LoadingState variant="spinner" size="sm" />;
      case 'complete':
        return <File className="h-4 w-4 text-primary" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'complete':
        return 'text-primary';
      case 'error':
        return 'text-destructive';
      case 'uploading':
      case 'finalizing':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">File Management</h1>
        <p className="text-muted-foreground">Upload and manage your files</p>
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          error={{
            message: error.message,
            code: error.code
          }}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Upload Area */}
      <div className="mb-8">
        <FileInput
          accept="*/*"
          multiple
          maxSizeBytes={50 * 1024 * 1024} // 50MB
          maxFiles={10}
          onFilesChange={handleFilesSelected}
          onError={handleFileUploadError}
        />
      </div>

      {/* Files List */}
      {uploadedFiles.length === 0 ? (
        <EmptyState
          title="No files uploaded"
          description="Upload your first file to get started"
          icon={<Upload className="h-12 w-12" />}
        />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Uploaded Files</h3>
          </div>
          
          <div className="divide-y divide-border">
            {uploadedFiles.map((file) => (
              <div key={file.key} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getStatusIcon(file.status)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className={getStatusColor(file.status)}>
                        {file.status === 'uploading' && 'Uploading...'}
                        {file.status === 'finalizing' && 'Finalizing...'}
                        {file.status === 'complete' && 'Complete'}
                        {file.status === 'error' && (file.error || 'Error')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {file.status === 'complete' && (
                    <button
                      onClick={() => handleDownloadFile(file.key)}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleRemoveFile(file.key)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove file"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesPage;