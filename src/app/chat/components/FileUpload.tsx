'use client';

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { MEDIA_LIMITS, dropzoneRejectMessage, validateOutgoingMedia } from '@/lib/chat/mediaLimits';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Paper,
  Alert,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import CloseIcon from '@mui/icons-material/Close';
import { FileUploadService } from '@/app/servicios/storage/FileUploadService';
import { WA } from '@/app/chat/chatTheme';

interface FileUploadProps {
  onFileUploaded: (url: string, fileName: string, fileType: string, mimeType?: string) => void;
  conversationId: string;
  disabled?: boolean;
}

export type FileUploadHandle = {
  openDocuments: () => void;
  openImages: () => void;
};

const IMAGE_ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

const DOC_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

const FileUpload = forwardRef<FileUploadHandle, FileUploadProps>(function FileUpload(
  { onFileUploaded, conversationId, disabled },
  ref
) {
  const [uploadingFiles, setUploadingFiles] = useState<{ file: File; progress: number; error?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    for (const file of acceptedFiles) {
      const validation = validateOutgoingMedia(file);
      if (!validation.ok) {
        setError(validation.error);
        continue;
      }

      const uploadingFile = { file, progress: 0 };
      setUploadingFiles((prev) => [...prev, uploadingFile]);

      try {
        const progressInterval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((f) => (f.file === file && f.progress < 90 ? { ...f, progress: f.progress + 10 } : f))
          );
        }, 200);

        const result = await FileUploadService.uploadFile(file, conversationId);
        clearInterval(progressInterval);

        if (result.success && result.url) {
          setUploadingFiles((prev) => prev.map((f) => (f.file === file ? { ...f, progress: 100 } : f)));
          const fileType = result.fileType || FileUploadService.getFileType(file);
          onFileUploaded(result.url, file.name, fileType, file.type);
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
          }, 1000);
        } else {
          setUploadingFiles((prev) =>
            prev.map((f) => (f.file === file ? { ...f, error: result.error || 'Error subiendo archivo' } : f))
          );
        }
      } catch {
        setUploadingFiles((prev) =>
          prev.map((f) => (f.file === file ? { ...f, error: 'Error inesperado' } : f))
        );
      }
    }
  }, [conversationId, onFileUploaded]);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    const first = fileRejections[0];
    if (!first) return;
    setError(dropzoneRejectMessage(first.errors, first.file.type));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: uploadFiles,
    onDropRejected,
    disabled,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    maxSize: MEDIA_LIMITS.file.maxBytes,
    accept: { ...IMAGE_ACCEPT, ...DOC_ACCEPT },
  });

  useImperativeHandle(ref, () => ({
    openDocuments: () => docInputRef.current?.click(),
    openImages: () => imageInputRef.current?.click(),
  }));

  const onPicked = (files: FileList | null) => {
    if (!files?.length) return;
    void uploadFiles(Array.from(files));
  };

  return (
    <Box {...getRootProps()} sx={{ outline: 'none' }}>
      <input {...getInputProps()} />
      <input
        ref={imageInputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        disabled={disabled}
        onChange={(e) => {
          onPicked(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={docInputRef}
        type="file"
        hidden
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf"
        multiple
        disabled={disabled}
        onChange={(e) => {
          onPicked(e.target.files);
          e.target.value = '';
        }}
      />
      {isDragActive ? (
        <Typography variant="caption" sx={{ color: WA.muted, display: 'block', mb: 0.5 }}>
          Soltá el archivo acá
        </Typography>
      ) : null}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      {uploadingFiles.length > 0 && (
        <Box sx={{ mb: 1 }}>
          {uploadingFiles.map((uploadingFile, index) => (
            <Paper
              key={`${uploadingFile.file.name}-${index}`}
              elevation={0}
              sx={{
                p: 1.5,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: WA.inputField,
                color: WA.text,
              }}
            >
              {FileUploadService.getFileType(uploadingFile.file) === 'image' ? <ImageIcon />
                : FileUploadService.getFileType(uploadingFile.file) === 'file' ? <DescriptionIcon />
                  : FileUploadService.getFileType(uploadingFile.file) === 'audio' ? <AudioFileIcon />
                    : <AttachFileIcon />}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>{uploadingFile.file.name}</Typography>
                {uploadingFile.error ? (
                  <Typography variant="caption" color="error">{uploadingFile.error}</Typography>
                ) : (
                  <LinearProgress variant="determinate" value={uploadingFile.progress} sx={{ mt: 0.5 }} />
                )}
              </Box>
              <IconButton
                size="small"
                sx={{ color: WA.icon }}
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadingFiles((prev) => prev.filter((f) => f.file !== uploadingFile.file));
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
});

FileUpload.displayName = 'FileUpload';

export default FileUpload;
