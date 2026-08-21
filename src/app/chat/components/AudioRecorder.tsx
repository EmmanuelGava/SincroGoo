import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Tooltip,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { validateOutgoingMedia } from '@/lib/chat/mediaLimits';
import { WA } from '@/app/chat/chatTheme';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
  startRef?: React.MutableRefObject<(() => void) | null>;
  onBusyChange?: (busy: boolean) => void;
}

function Waveform({ active }: { active: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        flexGrow: 1,
        height: 28,
        px: 1,
        '@keyframes waBar': {
          from: { transform: 'scaleY(0.35)' },
          to: { transform: 'scaleY(1)' },
        },
      }}
    >
      {Array.from({ length: 28 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 3,
            height: 8 + ((i * 7) % 16),
            bgcolor: WA.accent,
            borderRadius: 1,
            transformOrigin: 'center',
            animation: active ? `waBar ${0.45 + (i % 5) * 0.08}s ${i * 0.03}s ease-in-out infinite alternate` : 'none',
            opacity: active ? 1 : 0.45,
          }}
        />
      ))}
    </Box>
  );
}

export default function AudioRecorder({
  onAudioRecorded,
  disabled,
  startRef,
  onBusyChange,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sendOnStopRef = useRef(false);
  const discardOnStopRef = useRef(false);
  const durationRef = useRef(0);
  const mimeRef = useRef('audio/webm');

  const busy = isRecording || Boolean(recordedAudio);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const resetUi = () => {
    setRecordedAudio(null);
    setRecordingTime(0);
    durationRef.current = 0;
    setIsPlaying(false);
    setError(null);
    if (audioRef.current) audioRef.current.pause();
  };

  const startRecording = async () => {
    try {
      setError(null);
      sendOnStopRef.current = false;
      discardOnStopRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';
      mimeRef.current = mime;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeRef.current });
        if (discardOnStopRef.current) {
          discardOnStopRef.current = false;
          resetUi();
          return;
        }
        if (sendOnStopRef.current) {
          sendOnStopRef.current = false;
          const check = validateOutgoingMedia({
            type: audioBlob.type,
            size: audioBlob.size,
            name: 'audio.webm',
          });
          if (!check.ok) {
            setError(check.error);
            setRecordedAudio(audioBlob);
            return;
          }
          onAudioRecorded(audioBlob, durationRef.current);
          resetUi();
          return;
        }
        setRecordedAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      setError('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  useEffect(() => {
    if (!startRef) return undefined;
    startRef.current = () => { void startRecording(); };
    return () => { startRef.current = null; };
  });

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      discardOnStopRef.current = true;
      sendOnStopRef.current = false;
      stopRecording();
      return;
    }
    resetUi();
  };

  const sendNow = () => {
    if (isRecording) {
      sendOnStopRef.current = true;
      discardOnStopRef.current = false;
      stopRecording();
      return;
    }
    if (!recordedAudio) return;
    const check = validateOutgoingMedia({
      type: recordedAudio.type,
      size: recordedAudio.size,
      name: 'audio.webm',
    });
    if (!check.ok) {
      setError(check.error);
      return;
    }
    onAudioRecorded(recordedAudio, durationRef.current || recordingTime);
    resetUi();
  };

  const playRecording = () => {
    if (!recordedAudio) return;
    if (audioRef.current) audioRef.current.pause();
    const audioUrl = URL.createObjectURL(recordedAudio);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };
    void audio.play();
    setIsPlaying(true);
  };

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (busy) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', minHeight: 48 }}>
        <Tooltip title="Descartar">
          <IconButton onClick={cancelRecording} sx={{ color: '#f15c6d' }} aria-label="Descartar audio">
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>

        {recordedAudio ? (
          <Tooltip title={isPlaying ? 'Pausar' : 'Reproducir'}>
            <IconButton
              onClick={isPlaying ? pauseRecording : playRecording}
              sx={{ color: WA.text }}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>
        ) : (
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: '#f15c6d',
              mx: 0.5,
              animation: 'pulse 1s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.35 },
                '100%': { opacity: 1 },
              },
            }}
          />
        )}

        <Typography sx={{ color: WA.text, fontSize: '0.9rem', minWidth: 40 }}>
          {formatTime(recordingTime)}
        </Typography>

        <Waveform active={isRecording || isPlaying} />

        {error ? (
          <Typography variant="caption" sx={{ color: '#f15c6d', mr: 1 }}>
            {error}
          </Typography>
        ) : null}

        <Tooltip title="Enviar audio">
          <IconButton
            onClick={sendNow}
            aria-label="Enviar audio"
            sx={{
              bgcolor: WA.accent,
              color: '#fff',
              width: 42,
              height: 42,
              '&:hover': { bgcolor: '#017561' },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Tooltip title={error || 'Grabar audio'}>
      <span>
        <IconButton
          disabled={disabled}
          onClick={() => { void startRecording(); }}
          sx={{ color: error ? '#f15c6d' : WA.icon }}
          aria-label="Grabar audio"
        >
          <MicIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}
