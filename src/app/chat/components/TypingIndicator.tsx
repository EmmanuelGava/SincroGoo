import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { keyframes } from '@mui/system';

interface TypingIndicatorProps {
  remitente: string;
  servicioColor: string;
  show: boolean;
}

// Animación de puntos parpadeantes
const bounce = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
`;

export default function TypingIndicator({ remitente, servicioColor, show }: TypingIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
    } else {
      // Delay para suavizar la desaparición
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'flex-start',
      mb: 1,
      alignItems: 'flex-end',
      gap: 1,
      opacity: show ? 1 : 0,
      transition: 'opacity 0.3s ease-in-out'
    }}>
      {/* Avatar del remitente */}
      <Avatar sx={{ 
        bgcolor: servicioColor,
        width: 32,
        height: 32,
        fontSize: '0.875rem'
      }}>
        {remitente.charAt(0).toUpperCase()}
      </Avatar>

      {/* Burbuja de "escribiendo..." */}
      <Box sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        borderTopLeftRadius: 0.5,
        p: 1.5,
        minWidth: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Typography variant="caption" sx={{ 
          color: 'text.secondary',
          fontSize: '0.8rem'
        }}>
          escribiendo
        </Typography>
        
        {/* Puntos animados */}
        <Box sx={{ display: 'flex', gap: 0.3 }}>
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                bgcolor: 'text.secondary',
                animation: `${bounce} 1.4s infinite ease-in-out`,
                animationDelay: `${index * 0.16}s`,
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}