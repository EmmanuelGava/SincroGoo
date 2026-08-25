'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
  Slider,
  Chip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import {
  attachmentIconKind,
  extensionFromFileName,
  formatAttachmentSize,
  isDocumentImageMime,
} from '@/lib/chat/fileKind';
import { useWaTheme } from '@/app/chat/chatTheme';

interface FileAttachmentProps {
  url?: string;
  fileName: string;
  fileType: 'image' | 'document' | 'audio' | 'file' | 'unknown' | string;
  fileSize?: number;
  duration?: number;
  mimeType?: string;
  isOwn?: boolean;
}

function toSameOriginMedia(url: string): string {
  if (!url) return url;
  if (url.startsWith('/')) return url;
  return `/api/chat/media?url=${encodeURIComponent(url)}`;
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function FileTypeIcon({ kind, size = 28 }: { kind: ReturnType<typeof attachmentIconKind>; size?: number }) {
  const sx = { fontSize: size, color: '#fff' };
  if (kind === 'pdf') return <PictureAsPdfIcon sx={sx} />;
  if (kind === 'word') return <DescriptionIcon sx={sx} />;
  if (kind === 'excel') return <TableChartIcon sx={sx} />;
  return <InsertDriveFileIcon sx={sx} />;
}

function iconBg(kind: ReturnType<typeof attachmentIconKind>): string {
  if (kind === 'pdf') return '#e53935';
  if (kind === 'word') return '#1565c0';
  if (kind === 'excel') return '#2e7d32';
  return '#757575';
}

function WhatsAppAudioPlayer({
  url,
  durationSec,
  isOwn,
}: {
  url: string;
  durationSec?: number;
  isOwn: boolean;
}) {
  const WA = useWaTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationSec || 0);
  const [error, setError] = useState(false);
  const fg = WA.text;
  const bar = 'rgba(17,27,33,0.25)';
  const fill = isOwn ? WA.text : WA.accent;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;
    const onTime = () => setProgress(el.currentTime || 0);
    const onMeta = () => {
      if (el.duration && Number.isFinite(el.duration)) setDuration(el.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onErr = () => setError(true);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    el.addEventListener('ended', onEnd);
    el.addEventListener('error', onErr);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('error', onErr);
    };
  }, [url]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (playing) {
        el.pause();
        setPlaying(false);
        return;
      }
      if (error) {
        setError(false);
        el.load();
      }
      await el.play();
      setPlaying(true);
    } catch {
      setError(true);
    }
  };

  const seek = (_: Event, value: number | number[]) => {
    const el = audioRef.current;
    const next = Array.isArray(value) ? value[0] : value;
    if (!el) return;
    el.currentTime = next;
    setProgress(next);
  };

  const total = duration || durationSec || 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 220, py: 0.25 }}>
      <audio ref={audioRef} src={toSameOriginMedia(url)} preload="metadata" />
      <IconButton
        onClick={toggle}
        disabled={false}
        sx={{
          bgcolor: isOwn ? 'rgba(255,255,255,0.2)' : '#00a884',
          color: '#fff',
          width: 40,
          height: 40,
          '&:hover': { bgcolor: isOwn ? 'rgba(255,255,255,0.3)' : '#008f72' },
        }}
      >
        {playing ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <MicIcon sx={{ fontSize: 16, color: fg, opacity: 0.8 }} />
          <Slider
            size="small"
            min={0}
            max={Math.max(total, 0.1)}
            step={0.1}
            value={progress}
            onChange={seek}
            sx={{
              color: fill,
              py: 0.5,
              '& .MuiSlider-rail': { bgcolor: bar, opacity: 1 },
              '& .MuiSlider-thumb': {
                width: 10,
                height: 10,
                bgcolor: fill,
              },
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: fg, opacity: 0.75, fontSize: '0.7rem' }}>
          {error
            ? 'No se pudo reproducir'
            : `${formatClock(progress)} / ${formatClock(total)}`}
        </Typography>
      </Box>
    </Box>
  );
}

export default function FileAttachment({
  url,
  fileName,
  fileType,
  fileSize,
  duration,
  mimeType,
  isOwn = false,
}: FileAttachmentProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  if (fileType === 'image') {
    return (
      <>
        <Box
          onClick={() => !imageError && setPreviewOpen(true)}
          sx={{
            cursor: imageError ? 'default' : 'pointer',
            lineHeight: 0,
            borderRadius: 1.5,
            overflow: 'hidden',
            maxWidth: 280,
          }}
        >
          {imageError ? (
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BrokenImageIcon />
              <Typography variant="caption">{fileName}</Typography>
            </Box>
          ) : (
            <Box
              component="img"
              src={toSameOriginMedia(url || '')}
              alt={fileName}
              onError={() => setImageError(true)}
              sx={{
                width: '100%',
                maxHeight: 320,
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
        </Box>
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md">
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'white', zIndex: 1 }}
          >
            <CloseIcon />
          </IconButton>
          <DialogContent sx={{ p: 0, bgcolor: '#000' }}>
            <Box
              component="img"
              src={toSameOriginMedia(url || '')}
              alt={fileName}
              sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (fileType === 'audio') {
    return <WhatsAppAudioPlayer url={url || ''} durationSec={duration} isOwn={isOwn} />;
  }

  const kind = attachmentIconKind(mimeType, fileName);
  const ext = extensionFromFileName(fileName);
  const sizeLabel = formatAttachmentSize(fileSize);
  const label = fileName || 'Documento';

  if (!url) {
    return (
      <Chip
        icon={<FileTypeIcon kind={kind} size={18} />}
        label={`${label} · archivo no disponible`}
        size="small"
        sx={{
          maxWidth: 280,
          height: 28,
          '& .MuiChip-icon': { color: '#fff', ml: 0.75 },
          bgcolor: iconBg(kind),
          color: '#fff',
          '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
        }}
      />
    );
  }

  const mediaSrc = toSameOriginMedia(url);
  const isPdf = kind === 'pdf';
  const isOffice = kind === 'word' || kind === 'excel';
  const isDocImage = isDocumentImageMime(mimeType);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 220,
          maxWidth: 280,
          py: 0.25,
        }}
      >
        <Box
          onClick={() => setPreviewOpen(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flex: 1,
            minWidth: 0,
            cursor: 'pointer',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: iconBg(kind),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileTypeIcon kind={kind} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
              {label}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75, fontSize: '0.7rem' }}>
              {[sizeLabel, ext].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          component="a"
          href={mediaSrc}
          download={fileName || undefined}
          onClick={(event) => event.stopPropagation()}
          sx={{ color: isOwn ? '#fff' : 'text.secondary' }}
          aria-label="Descargar"
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Box>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <IconButton
          onClick={() => setPreviewOpen(false)}
          sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ pt: 6 }}>
          {isDocImage && (
            <Box
              component="img"
              src={mediaSrc}
              alt={fileName}
              sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          )}
          {isPdf && !pdfError && (
            <Box
              component="iframe"
              src={mediaSrc}
              title={fileName}
              onError={() => setPdfError(true)}
              sx={{ width: '100%', height: '70vh', border: 0 }}
            />
          )}
          {(isOffice || pdfError) && (
            <Box sx={{ py: 2 }}>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                {pdfError ? 'No se pudo previsualizar' : 'Este archivo no se puede previsualizar'}
              </Typography>
              <Typography
                component="a"
                href={mediaSrc}
                download={fileName || undefined}
                sx={{ color: 'primary.main' }}
              >
                Descargar {label}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
