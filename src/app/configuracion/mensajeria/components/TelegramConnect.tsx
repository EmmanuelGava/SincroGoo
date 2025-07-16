import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface TelegramConnectProps {
  onConnected: (config: any) => void;
}

export default function TelegramConnect({ onConnected }: TelegramConnectProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [botToken, setBotToken] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    'Crear Bot con BotFather',
    'Configurar Bot',
    'Probar Conexión'
  ];

  const handleStartWizard = () => {
    setShowWizard(true);
    setStep(0);
    setBotToken('');
    setBotUsername('');
    setError(null);
  };

  const handleTestBot = async () => {
    if (!botToken.trim()) {
      setError('Ingresa el token del bot');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/integrations/telegram/test-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken })
      });

      const data = await res.json();

      if (res.ok) {
        setBotUsername(data.username);
        setStep(2);
        
        // Configurar webhook automáticamente
        await setupWebhook(botToken);
        
        // Guardar configuración
        const config = {
          bot_token: botToken,
          bot_username: data.username,
          webhook_configured: true
        };
        
        onConnected(config);
        setShowWizard(false);
      } else {
        setError(data.error || 'Token inválido');
      }
    } catch (error) {
      setError('Error verificando el bot');
    } finally {
      setLoading(false);
    }
  };

  const setupWebhook = async (token: string) => {
    try {
      await fetch('/api/integrations/telegram/setup-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token })
      });
    } catch (error) {
      console.warn('Error configurando webhook:', error);
    }
  };

  const openBotFather = () => {
    window.open('https://t.me/BotFather', '_blank');
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TelegramIcon sx={{ color: '#229ED9', fontSize: 32 }} />
          <Box>
            <Typography variant="h6">Telegram Bot</Typography>
            <Typography variant="body2" color="text.secondary">
              Conecta tu bot de Telegram
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<SmartToyIcon />}
          onClick={handleStartWizard}
          sx={{
            bgcolor: '#229ED9',
            '&:hover': { bgcolor: '#1A7BC0' }
          }}
        >
          Configurar Bot de Telegram
        </Button>

        {/* Wizard de configuración */}
        <Dialog 
          open={showWizard} 
          onClose={() => setShowWizard(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Configurar Bot de Telegram</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3 }}>
              <Stepper activeStep={step} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {step === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6">Paso 1: Crear tu Bot</Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    Necesitas crear un bot con BotFather para obtener el token.
                  </Typography>
                </Alert>
                
                <Box component="ol" sx={{ pl: 2 }}>
                  <li>Abre Telegram y busca <strong>@BotFather</strong></li>
                  <li>Envía el comando <code>/newbot</code></li>
                  <li>Sigue las instrucciones para crear tu bot</li>
                  <li>Copia el token que te proporciona</li>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={openBotFather}
                    startIcon={<TelegramIcon />}
                  >
                    Abrir BotFather
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setStep(1)}
                  >
                    Ya tengo el token
                  </Button>
                </Box>
              </Box>
            )}

            {step === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6">Paso 2: Configurar Bot</Typography>
                
                <TextField
                  label="Token del Bot"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  helperText="Token proporcionado por BotFather"
                  fullWidth
                />

                {error && (
                  <Alert severity="error">{error}</Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button onClick={() => setStep(0)}>
                    Volver
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleTestBot}
                    disabled={loading || !botToken.trim()}
                  >
                    {loading ? 'Verificando...' : 'Verificar Bot'}
                  </Button>
                </Box>
              </Box>
            )}

            {step === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6">¡Bot Configurado!</Typography>
                
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>Bot:</strong> @{botUsername}
                    <br />
                    <strong>Estado:</strong> Conectado y listo para usar
                  </Typography>
                </Alert>

                <Typography variant="body2">
                  Tu bot de Telegram está configurado correctamente. Ahora puedes:
                </Typography>
                
                <Box component="ul" sx={{ pl: 2 }}>
                  <li>Enviar mensajes a contactos de Telegram</li>
                  <li>Recibir mensajes automáticamente</li>
                  <li>Gestionar conversaciones desde el chat unificado</li>
                </Box>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setShowWizard(false)}>
              {step === 2 ? 'Finalizar' : 'Cancelar'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}