'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import { ExcelUploader } from '@/app/componentes/ExcelUploader';
import { ConfiguradorHojas } from './componentes/ConfiguradorHojas';
import { ExcelToSheetsService, HojaExcel } from '@/app/servicios/excel-to-sheets/excel-to-sheets-service';
import { GoogleSheetsService } from '@/app/servicios/google/googleSheets';
import {
  CloudUpload as CloudUploadIcon,
  Sync as SyncIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';

const pasos = [
  'Seleccionar archivo',
  'Configurar hojas',
  'Sincronizar con Google Sheets',
];

export default function ExcelToSheetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hojas, setHojas] = useState<HojaExcel[]>([]);
  const [googleSheetsId, setGoogleSheetsId] = useState<string | null>(null);
  const [nombreDocumento, setNombreDocumento] = useState<string>('');
  const [dialogoSobrescribir, setDialogoSobrescribir] = useState(false);
  const [documentoExistenteId, setDocumentoExistenteId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFile) {
      setNombreDocumento(selectedFile.name.split('.')[0]);
    }
  }, [selectedFile]);

  const servicio = ExcelToSheetsService.getInstance();

  // Redirigir si no está autenticado
  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  // Mostrar loading mientras se verifica la sesión
  if (status === 'loading') {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleFileSelected = async (archivo: File) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedFile(archivo);
      setNombreDocumento(archivo.name.split('.')[0]);

      const service = ExcelToSheetsService.getInstance();
      const nombresHojas = await service.leerHojasExcel(archivo);
      
      setHojas(nombresHojas.map((nombre: string) => ({
        nombre,
        seleccionada: true,
        nombreDestino: nombre
      })));

      setActiveStep(1);
    } catch (error) {
      setError('Error al leer el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const verificarYConvertir = async () => {
    if (!selectedFile || !nombreDocumento.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const googleService = GoogleSheetsService.getInstance();
      const documentoExistente = await googleService.verificarDocumentoExistente(nombreDocumento);

      if (documentoExistente) {
        setDocumentoExistenteId(documentoExistente);
        setDialogoSobrescribir(true);
        setLoading(false);
        return;
      }

      await realizarConversion();
    } catch (error) {
      setError('Error al verificar documento existente: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      setLoading(false);
    }
  };

  const realizarConversion = async (idExistente?: string) => {
    try {
      setLoading(true);
      setError(null);

      const service = ExcelToSheetsService.getInstance();
      const spreadsheetId = await service.sincronizarConGoogleSheets(hojas, selectedFile!, {
        nombreDocumento,
        documentoExistenteId: idExistente
      });

      setGoogleSheetsId(spreadsheetId);
      setActiveStep(2);
    } catch (error) {
      setError('Error al convertir: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
      setDialogoSobrescribir(false);
    }
  };

  const handleConfirmarSobrescritura = () => {
    realizarConversion(documentoExistenteId!);
  };

  const handleCancelarSobrescritura = () => {
    setDialogoSobrescribir(false);
    setLoading(false);
  };

  const handleAbrirEnSheets = () => {
    if (googleSheetsId) {
      window.open(`https://docs.google.com/spreadsheets/d/${googleSheetsId}`, '_blank');
    }
  };

  const handleReiniciar = () => {
    setActiveStep(0);
    setSelectedFile(null);
    setHojas([]);
    setGoogleSheetsId(null);
    setNombreDocumento('');
    setError(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <EncabezadoSistema />
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Excel a Google Sheets
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ my: 4 }}>
            {pasos.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 4 }}>
            {activeStep === 0 && (
              <Box sx={{ textAlign: 'center' }}>
                <ExcelUploader 
                  onFileSelected={handleFileSelected}
                  loading={loading}
                />
              </Box>
            )}

            {activeStep === 1 && selectedFile && (
              <Box sx={{ '& > *': { mb: 4 } }}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      label="Nombre del documento en Google Sheets"
                      value={nombreDocumento}
                      onChange={(e) => setNombreDocumento(e.target.value)}
                      helperText="Este será el nombre del documento creado en Google Sheets"
                    />
                  </Box>
                  
                  <ConfiguradorHojas
                    hojas={hojas}
                    onHojasChange={setHojas}
                    loading={loading}
                    onVerDatos={async (nombreHoja: string) => {
                      try {
                        if (!selectedFile) return;
                        const service = ExcelToSheetsService.getInstance();
                        const datos = await service.leerDatosHoja(selectedFile, nombreHoja);
                        setHojas(hojas.map(hoja => 
                          hoja.nombre === nombreHoja ? { ...hoja, datos } : hoja
                        ));
                      } catch (error) {
                        console.error('Error al leer los datos de la hoja:', error);
                      }
                    }}
                  />
                </Paper>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                  <Button
                    onClick={() => setActiveStep(0)}
                    disabled={loading}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={verificarYConvertir}
                    disabled={loading || !hojas.some(h => h.seleccionada) || !nombreDocumento.trim()}
                    startIcon={<SyncIcon />}
                  >
                    {loading ? 'Convirtiendo...' : 'Convertir a Google Sheets'}
                  </Button>
                </Box>
              </Box>
            )}

            {activeStep === 2 && googleSheetsId && (
              <Box sx={{ textAlign: 'center' }}>
                <Paper sx={{ p: 4, mb: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    ¡Conversión completada!
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    El documento "{nombreDocumento}" ha sido creado exitosamente en Google Sheets.
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <IconButton
                      color="primary"
                      onClick={handleAbrirEnSheets}
                      size="large"
                      sx={{
                        '&:hover': {
                          transform: 'scale(1.1)',
                          transition: 'transform 0.2s'
                        }
                      }}
                    >
                      <TableChartIcon sx={{ fontSize: 40 }} />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    Haz clic en el ícono para abrir en Google Sheets
                  </Typography>
                </Paper>

                <Button
                  variant="outlined"
                  onClick={handleReiniciar}
                  startIcon={<RefreshIcon />}
                >
                  Convertir otro archivo
                </Button>
              </Box>
            )}
          </Box>

          <Dialog
            open={dialogoSobrescribir}
            onClose={handleCancelarSobrescritura}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">
              {"¿Sobrescribir documento existente?"}
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                Ya existe un documento con el nombre "{nombreDocumento}" en Google Sheets. 
                ¿Deseas sobrescribir su contenido con los nuevos datos?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelarSobrescritura} color="primary">
                Cancelar
              </Button>
              <Button onClick={handleConfirmarSobrescritura} color="primary" variant="contained" autoFocus>
                Sobrescribir
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Container>
    </Box>
  );
} 