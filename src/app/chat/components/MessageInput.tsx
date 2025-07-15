import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField,
  IconButton,
  Paper,
  Tooltip,
  Typography
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';

interface MessageInputProps {
  onSendMessage: (contenido: string) => void;
  disabled?: boolean;
  placeholder?: string;
  enviando?: boolean;
  onTyping?: (isTyping: boolean) => void;
}

export default function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Escribe un mensaje...",
  enviando = false,
  onTyping
}: MessageInputProps) {
  const [mensaje, setMensaje] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = () => {
    if (mensaje.trim() && !disabled) {
      onSendMessage(mensaje.trim());
      setMensaje('');
      setIsTyping(false);
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
    setIsTyping(nowTyping);
    
    // Notificar al componente padre sobre el estado de escritura
    if (onTyping) {
      onTyping(nowTyping);
      
      // Limpiar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Si está escribiendo, configurar timeout para dejar de escribir
      if (nowTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000); // Dejar de mostrar "escribiendo" después de 2 segundos
      }
    }
  };

  // Auto-focus en el input
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderTop: '1px solid #232323'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: 1 
      }}>
        {/* Botón de adjuntos */}
        <Tooltip title="Adjuntar archivo">
          <span>
            <IconButton 
              size="small" 
              disabled={disabled}
              sx={{ mb: 0.5 }}
            >
              <AttachFileIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* Campo de texto */}
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
              borderRadius: 3,
              bgcolor: 'background.default',
              '& fieldset': {
                borderColor: '#232323',
              },
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
              },
            },
            '& .MuiInputBase-input': {
              py: 1.5,
            }
          }}
        />

        {/* Botón de emojis */}
        <Tooltip title="Emojis">
          <span>
            <IconButton 
              size="small" 
              disabled={disabled}
              sx={{ mb: 0.5 }}
            >
              <EmojiEmotionsIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* Botón de enviar */}
        <Tooltip title="Enviar mensaje">
          <span>
            <IconButton
              onClick={handleSend}
              disabled={disabled || !mensaje.trim()}
              color="primary"
              sx={{
                bgcolor: mensaje.trim() ? 'primary.main' : 'transparent',
                color: mensaje.trim() ? 'white' : 'text.secondary',
                mb: 0.5,
                '&:hover': {
                  bgcolor: mensaje.trim() ? 'primary.dark' : 'action.hover',
                },
                '&.Mui-disabled': {
                  bgcolor: 'transparent',
                  color: 'text.disabled'
                }
              }}
            >
              <SendIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Indicador de escritura */}
      {isTyping && (
        <Typography variant="caption" sx={{ 
          color: 'text.secondary',
          mt: 0.5,
          display: 'block'
        }}>
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </Typography>
      )}
    </Paper>
  );
}