import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SendIcon from '@mui/icons-material/Send';

interface WhatsAppBusinessConnectProps {
  onConnected: (config: any) => void;
}

export default function WhatsAppBusinessConnect({ onConnected }: WhatsAppBusinessConnectProps) {
  const { data: session } = useSession();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [config, setConfig] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    verifyToken: ''
  });
  const [connectionStatus, setConnectionStatus] = useState<any>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      // Usar el endpoint unificado
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'connect',
          type: 'business',
          accessToken: config.accessToken,
          phoneNumberId: config.phoneNumberId,
          businessAccountId: config.businessAccountId,
          verifyToken: config.verifyToken
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error conectando WhatsApp Business');
      }

      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus(data.data);
        onConnected({
          tipo_conexion: 'business',
          accessToken: config.accessToken,
          phoneNumberId: config.phoneNumberId,
          businessAccountId: config.businessAccountId,
          status: 'connected'
        });
      }
      
    } catch (error) {
      console.error('❌ Error conectando WhatsApp Business:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'disconnect',
          type: 'business'
        })
      });
      
      setConnectionStatus(null);
      onConnected({
        tipo_conexion: 'business',
        status: 'disconnected'
      });
      
    } catch (error) {
      console.error('❌ Error desconectando WhatsApp Business:', error);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'status',
          type: 'business'
        })
      });
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.data);
      }
    } catch (error) {
      console.error('❌ Error verificando estado:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <BusinessIcon color="primary" />
          <Typography variant="h6">WhatsApp Business API</Typography>
          {connectionStatus?.connected && (
            <Chip 
              icon={<CheckCircleIcon />} 
              label="Conectado" 
              color="success" 
              size="small" 
            />
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!connectionStatus?.connected ? (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Conecta tu cuenta de WhatsApp Business API para enviar mensajes empresariales.
            </Typography>

            <Button
              variant="contained"
              startIcon={<BusinessIcon />}
              onClick={() => setShowConfigDialog(true)}
              disabled={connecting}
              fullWidth
            >
              {connecting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Conectando...
                </>
              ) : (
                'Conectar WhatsApp Business'
              )}
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              WhatsApp Business conectado correctamente.
            </Typography>
            
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={checkStatus}
                size="small"
              >
                Verificar Estado
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDisconnect}
                size="small"
              >
                Desconectar
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>

      {/* Dialog de configuración */}
      <Dialog 
        open={showConfigDialog} 
        onClose={() => setShowConfigDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configurar WhatsApp Business API</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Access Token"
              value={config.accessToken}
              onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
              fullWidth
              type="password"
              helperText="Token de acceso de Meta Graph API"
            />
            
            <TextField
              label="Phone Number ID"
              value={config.phoneNumberId}
              onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
              fullWidth
              helperText="ID del número de teléfono de WhatsApp Business"
            />
            
            <TextField
              label="Business Account ID"
              value={config.businessAccountId}
              onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
              fullWidth
              helperText="ID de la cuenta empresarial"
            />
            
            <TextField
              label="Webhook Verify Token"
              value={config.verifyToken}
              onChange={(e) => setConfig({ ...config, verifyToken: e.target.value })}
              fullWidth
              helperText="Token para verificar webhooks (opcional)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfigDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConnect}
            variant="contained"
            disabled={!config.accessToken || !config.phoneNumberId}
          >
            Conectar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
} 