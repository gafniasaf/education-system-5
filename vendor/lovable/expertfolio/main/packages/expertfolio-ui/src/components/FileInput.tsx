// File input with progress, validation, and error handling
// [pkg-07-file-input]

import React, { useCallback, useState } from 'react';

export interface FileUploadError {
  file: File;
  error: string;
}

export interface FileInputProps {
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  maxFiles?: number;
  onFilesChange?: (files: File[]) => void;
  onError?: (errors: FileUploadError[]) => void;
  onRemove?: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export const FileInput: React.FC<FileInputProps> = ({
  accept,
  multiple = false,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  onFilesChange,
  onError,
  onRemove,
  disabled = false,
  className = ''
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: FileUploadError[] } => {
    const valid: File[] = [];
    const errors: FileUploadError[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > maxSizeBytes) {
        errors.push({
          file,
          error: `File size exceeds ${Math.round(maxSizeBytes / 1024 / 1024)}MB limit`
        });
        continue;
      }

      // Check file count limit
      if (valid.length + selectedFiles.length >= maxFiles) {
        errors.push({
          file,
          error: `Maximum ${maxFiles} files allowed`
        });
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  }, [maxSizeBytes, maxFiles, selectedFiles.length]);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const { valid, errors } = validateFiles(fileArray);

    if (errors.length > 0) {
      onError?.(errors);
    }

    if (valid.length > 0) {
      const newFiles = multiple ? [...selectedFiles, ...valid] : valid;
      setSelectedFiles(newFiles);
      onFilesChange?.(newFiles);
    }
  }, [validateFiles, multiple, selectedFiles, onFilesChange, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (disabled) return;
    
    handleFileChange(e.dataTransfer.files);
  }, [handleFileChange, disabled]);

  const handleRemove = useCallback((fileToRemove: File) => {
    const newFiles = selectedFiles.filter(file => file !== fileToRemove);
    setSelectedFiles(newFiles);
    onFilesChange?.(newFiles);
    onRemove?.(fileToRemove);
  }, [selectedFiles, onFilesChange, onRemove]);

  const sanitizeFilename = (filename: string) => {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
  };

  return (
    <div className={className}>
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => !disabled && setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onClick={() => !disabled && document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
        />
        
        <div className="space-y-2">
          <svg className="h-8 w-8 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <div>
            <p className="text-sm text-foreground">
              Drop files here or <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max {Math.round(maxSizeBytes / 1024 / 1024)}MB per file
              {maxFiles > 1 && `, up to ${maxFiles} files`}
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {sanitizeFilename(file.name)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              
              <button
                onClick={() => handleRemove(file)}
                className="ml-3 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileInput;