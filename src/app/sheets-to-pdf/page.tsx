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
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { 
  Description as DescriptionIcon,
  TableChart as TableChartIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Link as LinkIcon,
  Schedule as ScheduleIcon,
  PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';

const pasos = [
  'Conectar Google Sheets',
  'Configurar formato',
  'Previsualizar PDF',
  'Generar reporte'
];

const opcionesFormato = [
  'A4 Vertical',
  'A4 Horizontal',
  'Carta Vertical',
  'Carta Horizontal',
  'Personalizado'
];

export default function SheetsToPdfPage() {
  const [urlSheet, setUrlSheet] = useState('');
  const [formatoSeleccionado, setFormatoSeleccionado] = useState('A4 Vertical');
  const [incluirEncabezado, setIncluirEncabezado] = useState(true);
  const [incluirNumeracion, setIncluirNumeracion] = useState(true);
  const [generacionAutomatica, setGeneracionAutomatica] = useState(false);
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
            <PictureAsPdfIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Google Sheets a PDF
            </Typography>
          </Stack>

          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Genera reportes profesionales en PDF desde tus hojas de cálculo de Google Sheets.
            Personaliza el formato y configura la generación automática según tus necesidades.
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
              <Stack spacing={3} alignItems="stretch" width="100%" maxWidth={600}>
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
                  fullWidth
                >
                  Conectar Google Sheets
                </Button>
              </Stack>
            )}

            {pasoActivo === 1 && (
              <Stack spacing={3} alignItems="stretch" width="100%" maxWidth={600}>
                <FormControl fullWidth>
                  <InputLabel>Formato de PDF</InputLabel>
                  <Select
                    value={formatoSeleccionado}
                    label="Formato de PDF"
                    onChange={(e) => setFormatoSeleccionado(e.target.value)}
                  >
                    {opcionesFormato.map((formato) => (
                      <MenuItem key={formato} value={formato}>
                        {formato}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={incluirEncabezado}
                      onChange={(e) => setIncluirEncabezado(e.target.checked)}
                    />
                  }
                  label="Incluir encabezado y pie de página"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={incluirNumeracion}
                      onChange={(e) => setIncluirNumeracion(e.target.checked)}
                    />
                  }
                  label="Incluir numeración de páginas"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={generacionAutomatica}
                      onChange={(e) => setGeneracionAutomatica(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Habilitar generación automática"
                />

                <Button
                  variant="contained"
                  startIcon={<PreviewIcon />}
                  onClick={() => setPasoActivo(2)}
                  size="large"
                >
                  Previsualizar PDF
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