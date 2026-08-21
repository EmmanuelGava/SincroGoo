import React, { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { MEDIA_LIMITS, dropzoneRejectMessage, validateOutgoingMedia } from '@/lib/chat/mediaLimits';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Paper,
  Alert
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import CloseIcon from '@mui/icons-material/Close';
import { FileUploadService } from '@/app/servicios/storage/FileUploadService';

interface FileUploadProps {
  onFileUploaded: (url: string, fileName: string, fileType: string, mimeType?: string) => void;
  conversationId: string;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

export default function FileUpload({ onFileUploaded, conversationId, disabled }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    const first = fileRejections[0];
    if (!first) return;
    setError(dropzoneRejectMessage(first.errors, first.file.type));
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    
    for (const file of acceptedFiles) {
      const validation = validateOutgoingMedia(file);
      if (!validation.ok) {
        setError(validation.error);
        continue;
      }

      // Añadir a la lista de archivos subiendo
      const uploadingFile: UploadingFile = { file, progress: 0 };
      setUploadingFiles(prev => [...prev, uploadingFile]);

      try {
        // Simular progreso (ya que Supabase no proporciona progreso real)
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => 
            prev.map(f => 
              f.file === file && f.progress < 90 
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          );
        }, 200);

        // Subir archivo
        const result = await FileUploadService.uploadFile(file, conversationId);
        
        clearInterval(progressInterval);

        console.log('Upload result:', result); // Debug log

        if (result.success && result.url) {
          // Completar progreso
          setUploadingFiles(prev => 
            prev.map(f => 
              f.file === file 
                ? { ...f, progress: 100 }
                : f
            )
          );

          // Notificar éxito
          const fileType = result.fileType || FileUploadService.getFileType(file);
          onFileUploaded(result.url, file.name, fileType, file.type);

          // Remover de la lista después de un momento
          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(f => f.file !== file));
          }, 1000);

        } else {
          // Error en la subida
          setUploadingFiles(prev => 
            prev.map(f => 
              f.file === file 
                ? { ...f, error: result.error || 'Error subiendo archivo' }
                : f
            )
          );
        }

      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, error: 'Error inesperado' }
              : f
          )
        );
      }
    }
  }, [conversationId, onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    disabled,
    multiple: true,
    maxSize: MEDIA_LIMITS.file.maxBytes,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const getFileIcon = (file: File) => {
    const type = FileUploadService.getFileType(file);
    switch (type) {
      case 'image': return <ImageIcon />;
      case 'file': return <DescriptionIcon />;
      case 'audio': return <AudioFileIcon />;
      default: return <AttachFileIcon />;
    }
  };

  return (
    <Box>
      {/* Dropzone */}
      <Box
        {...getRootProps()}
        sx={{
          display: 'inline-block',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <input {...getInputProps()} />
        <IconButton 
          size="small" 
          disabled={disabled}
          sx={{ 
            mb: 0.5,
            color: isDragActive ? 'primary.main' : 'inherit'
          }}
        >
          <AttachFileIcon />
        </IconButton>
      </Box>

      {/* Error general */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mt: 1, mb: 1 }}
        >
          {error}
        </Alert>
      )}

      {/* Lista de archivos subiendo */}
      {uploadingFiles.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {uploadingFiles.map((uploadingFile, index) => (
            <Paper
              key={index}
              elevation={1}
              sx={{
                p: 1.5,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'background.paper'
              }}
            >
              {getFileIcon(uploadingFile.file)}
              
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {uploadingFile.file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {FileUploadService.formatFileSize(uploadingFile.file.size)}
                </Typography>
                
                {uploadingFile.error ? (
                  <Typography variant="caption" color="error">
                    {uploadingFile.error}
                  </Typography>
                ) : (
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadingFile.progress}
                    sx={{ mt: 0.5 }}
                  />
                )}
              </Box>

              <IconButton
                size="small"
                onClick={() => removeUploadingFile(uploadingFile.file)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}