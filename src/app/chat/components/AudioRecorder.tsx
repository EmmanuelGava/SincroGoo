import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  LinearProgress,
  Tooltip,
  Paper
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onAudioRecorded, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        
        // Detener todas las pistas del stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (recordedAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audioUrl = URL.createObjectURL(recordedAudio);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
      setIsPlaying(true);
    }
  };

  const pauseRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    setRecordedAudio(null);
    setRecordingTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const sendRecording = () => {
    if (recordedAudio) {
      onAudioRecorded(recordedAudio, recordingTime);
      deleteRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  // Si hay una grabación, mostrar controles de reproducción
  if (recordedAudio) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          borderRadius: 2
        }}
      >
        <Tooltip title={isPlaying ? "Pausar" : "Reproducir"}>
          <IconButton
            size="small"
            onClick={isPlaying ? pauseRecording : playRecording}
            color="primary"
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Tooltip>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Audio grabado
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTime(recordingTime)}
          </Typography>
        </Box>

        <Tooltip title="Eliminar">
          <IconButton size="small" onClick={deleteRecording}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Enviar audio">
          <IconButton
            size="small"
            onClick={sendRecording}
            color="primary"
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>
    );
  }

  // Si está grabando, mostrar controles de grabación
  if (isRecording) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'error.dark',
          color: 'white',
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'error.light',
              animation: 'pulse 1s infinite'
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Grabando...
          </Typography>
          <Typography variant="body2">
            {formatTime(recordingTime)}
          </Typography>
        </Box>

        <Tooltip title="Detener grabación">
          <IconButton
            size="small"
            onClick={stopRecording}
            sx={{ color: 'white' }}
          >
            <StopIcon />
          </IconButton>
        </Tooltip>
      </Paper>
    );
  }

  // Botón inicial para empezar a grabar
  return (
    <Tooltip title="Grabar audio">
      <span>
        <IconButton
          size="small"
          disabled={disabled}
          onClick={startRecording}
          sx={{ mb: 0.5 }}
        >
          <MicIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}