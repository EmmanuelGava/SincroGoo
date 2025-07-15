import React from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Alert,
  Tooltip,
  Collapse
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export default function ErrorMessage({ error, onRetry, retrying = false }: ErrorMessageProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Box sx={{ mb: 2 }}>
      <Alert 
        severity="error" 
        variant="outlined"
        sx={{ 
          borderRadius: 2,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {onRetry && (
              <Tooltip title="Reintentar envío">
                <IconButton
                  size="small"
                  onClick={onRetry}
                  disabled={retrying}
                  sx={{ color: 'error.main' }}
                >
                  <RefreshIcon 
                    sx={{ 
                      animation: retrying ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }} 
                  />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ color: 'error.main' }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        }
      >
        <Box>
          <Typography variant="body2" fontWeight={600}>
            Error enviando mensaje
          </Typography>
          <Collapse in={expanded}>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              <strong>Detalles:</strong> {error}
            </Typography>
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}>
              El mensaje se guardó localmente pero no se pudo enviar a la plataforma externa.
            </Typography>
          </Collapse>
        </Box>
      </Alert>
    </Box>
  );
}