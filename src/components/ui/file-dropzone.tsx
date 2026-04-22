'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, Loader2 } from 'lucide-react';

interface FileDropZoneProps {
  accept: string;
  endpoint: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  /** e.g. "MP4, WebM, MOV" — size is appended automatically from maxSizeMB */
  hint?: string;
  /** Client-side size limit in MB — shown in hint and validated before upload */
  maxSizeMB?: number;
}

export function FileDropZone({
  accept,
  endpoint,
  label,
  value,
  onChange,
  onError,
  disabled,
  hint,
  maxSizeMB,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fullHint = hint
    ? maxSizeMB ? `${hint} — max ${maxSizeMB} MB` : hint
    : maxSizeMB ? `max ${maxSizeMB} MB` : undefined;

  const upload = useCallback(
    async (file: File) => {
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        onError?.(`File too large. Maximum size is ${maxSizeMB} MB.`);
        return;
      }

      setIsUploading(true);
      setProgress(0);
      try {
        const fd = new FormData();
        fd.append('file', file);

        const url = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', endpoint);

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const data = JSON.parse(xhr.responseText);
              resolve(data.url);
            } else {
              try {
                const data = JSON.parse(xhr.responseText);
                reject(new Error(data.error || `Upload failed (${xhr.status})`));
              } catch {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Network error — check file size and connection')));
          xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

          xhr.send(fd);
        });

        onChange(url);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [endpoint, maxSizeMB, onChange, onError],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file || disabled || isUploading) return;
      upload(file);
    },
    [disabled, isUploading, upload],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) setIsDragging(true);
    },
    [disabled, isUploading],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const displayName = value
    ? value.startsWith('/uploads/')
      ? decodeURIComponent(value.split('/').pop() || value)
      : value
    : '';

  if (value && !isUploading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2">
        <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
        <span className="flex-1 truncate text-xs text-rdy-gray-600" title={value}>
          {displayName}
        </span>
        <button
          type="button"
          onClick={() => onChange('')}
          className="shrink-0 text-rdy-gray-400 hover:text-red-500 transition-colors"
          title="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && !disabled && inputRef.current?.click()}
      className={`
        relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors
        ${isDragging
          ? 'border-rdy-orange-500 bg-rdy-orange-500/5'
          : 'border-rdy-gray-200 hover:border-rdy-gray-400 hover:bg-rdy-gray-100/30'
        }
        ${(disabled || isUploading) ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {isUploading ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-rdy-orange-500" />
          <p className="text-sm font-medium text-rdy-gray-600">
            Uploading… {progress}%
          </p>
          <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-rdy-gray-200">
            <div
              className="h-full rounded-full bg-rdy-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <Upload className="h-6 w-6 text-rdy-gray-400" />
          <div className="text-center">
            <p className="text-sm text-rdy-gray-600">
              <span className="font-medium text-rdy-orange-500">{label}</span>
              {' '}or drag & drop
            </p>
            {fullHint && (
              <p className="mt-0.5 text-xs text-rdy-gray-400">{fullHint}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
