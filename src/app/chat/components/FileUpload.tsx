import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Chip,
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
  onFileUploaded: (url: string, fileName: string, fileType: string) => void;
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    
    for (const file of acceptedFiles) {
      // Validar archivo
      const validation = FileUploadService.validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Archivo no válido');
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
          const fileType = FileUploadService.getFileType(file);
          onFileUploaded(result.url, file.name, fileType);

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
    disabled,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const getFileIcon = (file: File) => {
    const type = FileUploadService.getFileType(file);
    switch (type) {
      case 'image': return <ImageIcon />;
      case 'document': return <DescriptionIcon />;
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