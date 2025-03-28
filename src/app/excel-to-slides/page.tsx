'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  Button,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { 
  Slideshow as SlideshowIcon,
  SlideshowOutlined as SlidesIcon,
  Google as GoogleIcon,
} from '@mui/icons-material';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import SelectorArchivo from './componentes/SelectorArchivo';
import PasosStepper from './componentes/PasosStepper';
import VisualizadorArchivo from './componentes/VisualizadorArchivo';
import ConfiguradorPlantillaSlides from './componentes/ConfiguradorPlantillaSlides';
import { ExcelToSlidesService, DatosDiapositiva } from '@/app/servicios/excel-to-slides/excel-to-slides-service';
import { ConfiguracionPaginacion } from '@/app/modelos/configuracion-paginacion';
import { Diapositiva } from './modelos/diapositiva';

export default function ExcelToSlidesPage() {
  const { data: session, status } = useSession();
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [pasoActivo, setPasoActivo] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hojas, setHojas] = useState<string[]>([]);
  const [exito, setExito] = useState<string | null>(null);
  const [presentacionId, setPresentacionId] = useState<string | null>(null);
  const [encabezados, setEncabezados] = useState<{ [columna: string]: string }>({});
  const [diapositivas, setDiapositivas] = useState<Diapositiva[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setError('Debes iniciar sesión con Google para usar esta funcionalidad');
    } else if (status === 'authenticated' && error === 'Debes iniciar sesión con Google para usar esta funcionalidad') {
      setError(null);
    }
  }, [status]);

  const handleSeleccionArchivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (archivo) {
      if (archivo.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          archivo.type === 'application/vnd.ms-excel' ||
          archivo.type === 'text/csv') {
        setArchivoSeleccionado(archivo);
        setPasoActivo(1);
        setError(null);
        
        try {
          const servicio = await ExcelToSlidesService.getInstance();
          const hojasExcel = await servicio.leerHojasExcel(archivo);
          setHojas(hojasExcel);
          
          if (hojasExcel.length > 0) {
            const encabezadosHoja = await servicio.leerEncabezadosHoja(archivo, hojasExcel[0]);
            setEncabezados(encabezadosHoja);
          }
        } catch (error) {
          setError('Error al leer el archivo Excel');
          console.error('Error:', error);
        }
      } else {
        setError('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV');
      }
    }
  };

  const handleCambioHoja = async (nombreHoja: string) => {
    if (!archivoSeleccionado) return;
    
    try {
      const servicio = await ExcelToSlidesService.getInstance();
      // Obtener la fila de encabezados de la configuración actual
      const filaEncabezados = diapositivas[0]?.filas?.filaEncabezados || 1;
      const nuevosEncabezados = await servicio.leerEncabezadosHoja(archivoSeleccionado, nombreHoja, filaEncabezados);
      setEncabezados(nuevosEncabezados);
    } catch (error) {
      setError('Error al leer los encabezados de la hoja');
      console.error('Error:', error);
    }
  };

  const handleConfigurarPlantilla = async (nuevasDiapositivas: Diapositiva[], nombrePresentacion: string) => {
    if (!session) {
      signIn('google');
      return;
    }

    if (!archivoSeleccionado) {
      setError('No hay archivo seleccionado');
      return;
    }

    setCargando(true);
    setError(null);
    setExito(null);
    setDiapositivas(nuevasDiapositivas);

    try {
      const servicio = await ExcelToSlidesService.getInstance();
      // Convertir las diapositivas al nuevo formato
      const diapositivasConFilas: DatosDiapositiva[] = nuevasDiapositivas.map(diapositiva => ({
        ...diapositiva,
        hoja: diapositiva.hoja || '',
        filas: diapositiva.filas || {
          inicio: 2,
          filaEncabezados: 1,
          fin: undefined
        }
      }));

      const resultado = await servicio.generarPresentacionPaginada(
        nombrePresentacion,
        diapositivasConFilas
      );
      setPresentacionId(resultado);
      setExito('¡Presentación generada con éxito! Haz clic en el botón para verla.');
      setPasoActivo(3);
    } catch (error) {
      if ((error as Error).message.includes('401')) {
        setError('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
        signIn('google');
      } else {
        setError('Error al generar la presentación: ' + (error as Error).message);
      }
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  };

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5', // Color de fondo del dashboard
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{
        width: '100%',
        backgroundColor: '#673ab7', // Color morado del banner
        color: 'white',
        p: 3,
        mb: 3
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Excel a Google Slides</h1>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
          Convierte tus datos de Excel en presentaciones profesionales de Google Slides automáticamente. Selecciona tu archivo Excel y configura la plantilla para generar las diapositivas.
        </p>
      </Box>

      <Box sx={{
        width: '100%',
        maxWidth: '1920px',
        margin: '0 auto',
        padding: '0 32px',
        boxSizing: 'border-box'
      }}>
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
              Excel a Google Slides
            </Typography>
          </Stack>

          {!session ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle1" color="text.secondary" paragraph>
                Para comenzar, inicia sesión con tu cuenta de Google
              </Typography>
              <Button
                variant="contained"
                startIcon={<GoogleIcon />}
                onClick={() => signIn('google')}
                sx={{
                  backgroundColor: '#4285f4',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: '#357abd'
                  }
                }}
              >
                Iniciar sesión con Google
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="subtitle1" color="text.secondary" paragraph>
                Convierte tus datos de Excel en presentaciones profesionales de Google Slides automáticamente.
                Selecciona tu archivo Excel y configura la plantilla para generar las diapositivas.
              </Typography>

              <PasosStepper pasoActivo={pasoActivo} />

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {exito && (
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Alert severity="success" sx={{ width: '100%' }}>
                    {exito}
                  </Alert>
                  {presentacionId && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<SlidesIcon />}
                      href={`https://docs.google.com/presentation/d/${presentacionId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        backgroundColor: '#ffd04c',
                        color: '#000',
                        '&:hover': {
                          backgroundColor: '#ffc51e'
                        }
                      }}
                    >
                      Abrir en Google Slides
                    </Button>
                  )}
                </Box>
              )}

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', position: 'relative' }}>
                {cargando && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    zIndex: 1
                  }}>
                    <CircularProgress />
                  </Box>
                )}

                {pasoActivo === 0 && (
                  <SelectorArchivo onSeleccionArchivo={handleSeleccionArchivo} />
                )}

                {pasoActivo === 1 && archivoSeleccionado && (
                  <VisualizadorArchivo 
                    nombreArchivo={archivoSeleccionado.name}
                    onConfigurar={() => setPasoActivo(2)}
                  />
                )}

                {pasoActivo === 2 && (
                  <ConfiguradorPlantillaSlides
                    hojas={hojas}
                    encabezados={encabezados}
                    onConfigurar={handleConfigurarPlantilla}
                    onCambioHoja={handleCambioHoja}
                  />
                )}

                {pasoActivo === 3 && exito && (
                  <Alert severity="success" sx={{ width: '100%' }}>
                    {exito}
                  </Alert>
                )}
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
} 