'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  TextField,
} from '@mui/material';
import { 
  TableChart as TableChartIcon,
  Slideshow as SlideshowIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';

const pasos = [
  'Conectar Google Sheets',
  'Configurar plantilla',
  'Previsualizar',
  'Generar presentación'
];

export default function SheetsToSlidesPage() {
  const [urlSheet, setUrlSheet] = useState('');
  const [pasoActivo, setPasoActivo] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConectarSheet = () => {
    if (!urlSheet) {
      setError('Por favor ingresa la URL de Google Sheets');
      return;
    }

    try {
      const url = new URL(urlSheet);
      if (!url.hostname.includes('docs.google.com')) {
        setError('Por favor ingresa una URL válida de Google Sheets');
        return;
      }
      
      setPasoActivo(1);
      setError(null);
    } catch {
      setError('Por favor ingresa una URL válida');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <EncabezadoSistema />
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} mb={4}>
            <SlideshowIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Google Sheets a Slides
            </Typography>
          </Stack>

          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Convierte tus datos de Google Sheets en presentaciones profesionales automáticamente.
            Conecta tu hoja de cálculo y configura la plantilla para generar las diapositivas.
          </Typography>

          <Stepper activeStep={pasoActivo} sx={{ mb: 4 }}>
            {pasos.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            {pasoActivo === 0 && (
              <Stack spacing={2} alignItems="center" width="100%" maxWidth={600}>
                <TextField
                  fullWidth
                  label="URL de Google Sheets"
                  variant="outlined"
                  value={urlSheet}
                  onChange={(e) => setUrlSheet(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  InputProps={{
                    startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<TableChartIcon />}
                  onClick={handleConectarSheet}
                  size="large"
                >
                  Conectar Google Sheets
                </Button>
              </Stack>
            )}

            {pasoActivo === 1 && (
              <Stack spacing={2} alignItems="center" width="100%">
                <Typography variant="h6">
                  Hoja conectada correctamente
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SettingsIcon />}
                  onClick={() => setPasoActivo(2)}
                >
                  Configurar Plantilla
                </Button>
              </Stack>
            )}

            {/* Aquí irán los componentes para los siguientes pasos */}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
} 