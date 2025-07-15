import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Dialog,
  DialogContent,
  DialogTitle,
  Chip
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';

interface FileAttachmentProps {
  url: string;
  fileName: string;
  fileType: 'image' | 'document' | 'audio' | 'unknown';
  fileSize?: number;
  isOwn?: boolean;
}

export default function FileAttachment({ 
  url, 
  fileName, 
  fileType, 
  fileSize,
  isOwn = false 
}: FileAttachmentProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const getFileIcon = () => {
    switch (fileType) {
      case 'image': return <ImageIcon />;
      case 'document': return <DescriptionIcon />;
      case 'audio': return <AudioFileIcon />;
      default: return <DescriptionIcon />;
    }
  };

  const getFileColor = () => {
    switch (fileType) {
      case 'image': return '#4CAF50';
      case 'document': return '#2196F3';
      case 'audio': return '#FF9800';
      default: return '#757575';
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = () => {
    if (fileType === 'image') {
      setPreviewOpen(true);
    } else {
      window.open(url, '_blank');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          maxWidth: 280,
          bgcolor: isOwn ? 'rgba(255,255,255,0.1)' : 'background.paper',
          border: `1px solid ${getFileColor()}20`,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: isOwn ? 'rgba(255,255,255,0.15)' : 'action.hover'
          }
        }}
        onClick={handlePreview}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: getFileColor() + '20',
              color: getFileColor(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {getFileIcon()}
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 500,
                color: isOwn ? 'white' : 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {fileName}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                label={fileType.toUpperCase()}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: getFileColor() + '20',
                  color: getFileColor()
                }}
              />
              
              {fileSize && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: isOwn ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                  }}
                >
                  {formatFileSize(fileSize)}
                </Typography>
              )}
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            sx={{
              color: isOwn ? 'rgba(255,255,255,0.7)' : 'text.secondary',
              '&:hover': {
                color: isOwn ? 'white' : 'text.primary'
              }
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Preview para imágenes */}
        {fileType === 'image' && (
          <Box sx={{ mt: 1 }}>
            <img
              src={url}
              alt={fileName}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: 200,
                objectFit: 'cover',
                borderRadius: 4
              }}
            />
          </Box>
        )}

        {/* Reproductor para audio */}
        {fileType === 'audio' && (
          <Box sx={{ mt: 1 }}>
            <audio
              controls
              style={{ width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <source src={url} />
              Tu navegador no soporta audio.
            </audio>
          </Box>
        )}
      </Paper>

      {/* Modal de preview para imágenes */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{fileName}</Typography>
          <IconButton onClick={() => setPreviewOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <img
            src={url}
            alt={fileName}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '70vh',
              objectFit: 'contain'
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}