import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import HeadsetIcon from '@mui/icons-material/Headset';
import SendIcon from '@mui/icons-material/Send';
import FileUpload, { type FileUploadHandle } from './FileUpload';
import EmojiPickerComponent from './EmojiPicker';
import AudioRecorder from './AudioRecorder';
import { WA } from '@/app/chat/chatTheme';

interface MessageInputProps {
  onSendMessage: (contenido: string) => void;
  onSendFile?: (url: string, fileName: string, fileType: string, mimeType?: string) => void;
  onSendAudio?: (audioBlob: Blob, duration: number) => void;
  conversationId?: string;
  disabled?: boolean;
  placeholder?: string;
  enviando?: boolean;
  onTyping?: (isTyping: boolean) => void;
}

function AttachCircle({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        bgcolor: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mr: 1.5,
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

export default function MessageInput({
  onSendMessage,
  onSendFile,
  onSendAudio,
  conversationId,
  disabled = false,
  placeholder = 'Escribe un mensaje',
  onTyping,
}: MessageInputProps) {
  const [mensaje, setMensaje] = useState('');
  const [attachEl, setAttachEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<FileUploadHandle>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioStartRef = useRef<(() => void) | null>(null);

  const handleSend = () => {
    if (mensaje.trim() && !disabled) {
      onSendMessage(mensaje.trim());
      setMensaje('');
      onTyping?.(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMensaje(value);
    const nowTyping = value.length > 0;
    if (onTyping) {
      onTyping(nowTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (nowTyping) {
        typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (inputRef.current) {
      const input = inputRef.current.querySelector('textarea') || inputRef.current.querySelector('input');
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newValue = mensaje.slice(0, start) + emoji + mensaje.slice(end);
        setMensaje(newValue);
        setTimeout(() => {
          input.focus();
          if (input.setSelectionRange) {
            input.setSelectionRange(start + emoji.length, start + emoji.length);
          }
        }, 0);
        return;
      }
    }
    setMensaje((prev) => prev + emoji);
  };

  useEffect(() => {
    if (inputRef.current && !disabled) inputRef.current.focus();
  }, [disabled]);

  const hasText = Boolean(mensaje.trim());

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1,
        py: 1,
        bgcolor: WA.inputBar,
        borderTop: 'none',
      }}
    >
      {conversationId && onSendFile ? (
        <FileUpload
          ref={fileRef}
          onFileUploaded={onSendFile}
          conversationId={conversationId}
          disabled={disabled}
        />
      ) : null}

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.25 }}>
        {conversationId && onSendFile ? (
          <>
            <Tooltip title="Adjuntar">
              <span>
                <IconButton
                  disabled={disabled}
                  onClick={(e) => setAttachEl(e.currentTarget)}
                  sx={{ color: WA.icon }}
                  aria-label="Adjuntar"
                >
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Menu
              anchorEl={attachEl}
              open={Boolean(attachEl)}
              onClose={() => setAttachEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              PaperProps={{
                sx: {
                  bgcolor: WA.menu,
                  color: WA.text,
                  borderRadius: 3,
                  minWidth: 220,
                  py: 1,
                },
              }}
            >
              <MenuItem
                disabled={disabled}
                onClick={() => {
                  setAttachEl(null);
                  fileRef.current?.openDocuments();
                }}
              >
                <AttachCircle color="#7f66ff"><InsertDriveFileIcon fontSize="small" /></AttachCircle>
                Documento
              </MenuItem>
              <MenuItem
                disabled={disabled}
                onClick={() => {
                  setAttachEl(null);
                  fileRef.current?.openImages();
                }}
              >
                <AttachCircle color="#007bfc"><PhotoLibraryIcon fontSize="small" /></AttachCircle>
                Fotos y videos
              </MenuItem>
              {onSendAudio ? (
                <MenuItem
                  disabled={disabled}
                  onClick={() => {
                    setAttachEl(null);
                    audioStartRef.current?.();
                  }}
                >
                  <AttachCircle color="#ff8a00"><HeadsetIcon fontSize="small" /></AttachCircle>
                  Audio
                </MenuItem>
              ) : null}
            </Menu>
          </>
        ) : null}

        <EmojiPickerComponent onEmojiSelect={handleEmojiSelect} disabled={disabled} />

        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={4}
          value={mensaje}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              bgcolor: WA.inputField,
              color: WA.text,
              '& fieldset': { border: 'none' },
              '&:hover fieldset': { border: 'none' },
              '&.Mui-focused fieldset': { border: 'none' },
            },
            '& .MuiInputBase-input': {
              py: 1.15,
              px: 1.5,
              color: WA.text,
              '&::placeholder': { color: WA.muted, opacity: 1 },
            },
          }}
        />

        {onSendAudio && !hasText ? (
          <AudioRecorder
            onAudioRecorded={onSendAudio}
            disabled={disabled}
            startRef={audioStartRef}
          />
        ) : (
          <Tooltip title="Enviar mensaje">
            <span>
              <IconButton
                onClick={handleSend}
                disabled={disabled || !hasText}
                sx={{ color: hasText ? '#00a884' : WA.icon }}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
}
