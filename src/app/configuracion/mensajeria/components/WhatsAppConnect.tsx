import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface WhatsAppConnectProps {
  onConnected: (config: any) => void;
}

export default function WhatsAppConnect({ onConnected }: WhatsAppConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const steps = [
    'Autorizar WhatsApp Business',
    'Seleccionar número de teléfono',
    'Configurar webhook',
    'Completar conexión'
  ];

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    setStep(0);

    try {
      // 1. Iniciar flujo OAuth de WhatsApp
      const authUrl = await initiateWhatsAppOAuth();
      
      // 2. Abrir ventana de autorización
      const authWindow = window.open(
        authUrl,
        'whatsapp-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // 3. Escuchar el callback
      const result = await waitForAuthCallback(authWindow);
      
      if (result.success) {
        setStep(3);
        onConnected(result.config);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      setError(error instanceof Error ? error.message : 'Error de conexión');
    } finally {
      setConnecting(false);
    }
  };

  const initiateWhatsAppOAuth = async (): Promise<string> => {
    const res = await fetch('/api/integrations/whatsapp/oauth/init', {
      method: 'POST'
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    return data.authUrl;
  };

  const waitForAuthCallback = (authWindow: Window | null): Promise<any> => {
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          reject(new Error('Autorización cancelada'));
        }
      }, 1000);

      // Escuchar mensaje del callback
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'whatsapp-auth-success') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          authWindow?.close();
          resolve(event.data);
        } else if (event.data.type === 'whatsapp-auth-error') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          authWindow?.close();
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', messageHandler);
    });
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <WhatsAppIcon sx={{ color: '#25D366', fontSize: 32 }} />
          <Box>
            <Typography variant="h6">WhatsApp Business</Typography>
            <Typography variant="body2" color="text.secondary">
              Conecta tu cuenta de WhatsApp Business
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {connecting && (
          <Box sx={{ mb: 2 }}>
            <Stepper activeStep={step} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={connecting ? <CircularProgress size={16} /> : <WhatsAppIcon />}
            onClick={handleConnect}
            disabled={connecting}
            sx={{
              bgcolor: '#25D366',
              '&:hover': { bgcolor: '#1DA851' }
            }}
          >
            {connecting ? 'Conectando...' : 'Conectar WhatsApp'}
          </Button>

          <Button
            variant="outlined"
            onClick={() => setShowInstructions(true)}
          >
            Ver Instrucciones
          </Button>
        </Box>

        {/* Modal de instrucciones */}
        <Dialog 
          open={showInstructions} 
          onClose={() => setShowInstructions(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Cómo Conectar WhatsApp Business</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  Para usar WhatsApp Business necesitas tener una cuenta verificada de WhatsApp Business.
                </Typography>
              </Alert>

              <Typography variant="h6">Pasos:</Typography>
              <Box component="ol" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="body2">
                    Haz clic en "Conectar WhatsApp"
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Autoriza la aplicación en Meta Business
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    Selecciona tu número de WhatsApp Business
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    La configuración se completará automáticamente
                  </Typography>
                </li>
              </Box>

              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Requisitos:</strong>
                  <br />• Cuenta de WhatsApp Business verificada
                  <br />• Acceso a Meta Business Manager
                  <br />• Permisos de administrador en la cuenta
                </Typography>
              </Alert>
            </Box>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}