'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
  Slider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';

interface FileAttachmentProps {
  url: string;
  fileName: string;
  fileType: 'image' | 'document' | 'audio' | 'unknown' | string;
  fileSize?: number;
  duration?: number;
  isOwn?: boolean;
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationSec || 0);
  const [error, setError] = useState(false);
  const fg = isOwn ? '#fff' : '#111b21';
  const bar = isOwn ? 'rgba(255,255,255,0.45)' : 'rgba(17,27,33,0.25)';
  const fill = isOwn ? '#fff' : '#00a884';

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
    if (!el || error) return;
    try {
      if (playing) {
        el.pause();
        setPlaying(false);
      } else {
        await el.play();
        setPlaying(true);
      }
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
      <audio ref={audioRef} src={url} preload="metadata" />
      <IconButton
        onClick={toggle}
        disabled={error}
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
  duration,
  isOwn = false,
}: FileAttachmentProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

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
              src={url}
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
              src={url}
              alt={fileName}
              sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (fileType === 'audio') {
    return <WhatsAppAudioPlayer url={url} durationSec={duration} isOwn={isOwn} />;
  }

  return (
    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
      {fileName}
    </Typography>
  );
}
