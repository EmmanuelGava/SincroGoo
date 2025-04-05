'use client';

import React from 'react';
// import { useEffect } from 'react'; // Comentado porque no se utiliza
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  // List,
  // ListItem,
  // ListItemIcon,
  // ListItemText,
  // IconButton,
  useTheme,
  alpha,
  Fade,
  CircularProgress,
  // LinearProgress,
  // Tooltip,
  Chip,
  Button,
  Alert,
  AlertTitle
} from '@mui/material';
// import { LaunchIcon, BarChartIcon, PieChartIcon, TimelineIcon, AnalyticsIcon, BusinessIcon, SpeedIcon, UpdateIcon, CloudSyncIcon, ArrowUpwardIcon, ArrowDownwardIcon, MoreVertIcon, SyncAltIcon } from '@mui/icons-material'; // Comentado porque no se utilizan
import {
  Explore as ExploreIcon,
  Folder as FolderIcon,
  LocationOn as LocationIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Store as StoreIcon,
  FolderOpen as FolderOpenIcon,
  History as HistoryIcon,
  FileDownload as FileDownloadIcon,
  Launch as LaunchIcon,
  Slideshow as SlideshowIcon,
  CompareArrows as CompareArrowsIcon,
  TableChart as TableChartIcon,
  Business as BusinessIcon,
  Storefront as StorefrontIcon,
  TrendingFlat as TrendingFlatIcon,
  People as PeopleIcon,
  AttachMoney as AttachMoneyIcon,
  Description as DescriptionIcon,
  Update as UpdateIcon,
  CloudSync as CloudSyncIcon,
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  MoreVert as MoreVertIcon,
  SyncAlt as SyncAltIcon,
  Schedule as ScheduleIcon,
  ExitToApp as ExitToAppIcon
} from '@mui/icons-material';
import { useSession, signOut } from 'next-auth/react';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';

// Definir la interfaz Estadisticas
interface Estadisticas {
  totalEstablecimientos: number;
  totalProyectos: number;
  búsquedasRecientes: number;
  exportacionesRecientes: number;
}

// Clase ficticia para mantener la compatibilidad con el código existente
// const DashboardService = ... // Comentado porque no se utiliza

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const theme = useTheme();
  // const [estadisticas, setEstadisticas] = useState([]); // Comentado porque no se utiliza
  const [loading, setLoading] = useState(false);

  // Verificar si hay problemas con la sesión
  const sessionIncompleta = status === "authenticated" && (!session?.user?.email || !session?.user?.name);
  
  // Intenta recuperar la sesión
  const intentarRecuperarSesion = async () => {
    try {
      setLoading(true);
      console.log('🔄 [Dashboard] Intentando recuperar la sesión...');
      window.location.reload();
    } catch (error) {
      console.error('❌ [Dashboard] Error al recuperar sesión:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      setLoading(true);
      console.log('🔄 [Dashboard] Cerrando sesión...');
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('❌ [Dashboard] Error al cerrar sesión:', error);
      window.location.href = '/';
    }
  };

  // Mostrar alerta si hay problemas con la sesión
  if (sessionIncompleta) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert 
          severity="warning" 
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                color="info" 
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={intentarRecuperarSesion}
                disabled={loading}
              >
                Recuperar
              </Button>
              <Button 
                color="error" 
                size="small"
                variant="outlined"
                startIcon={<ExitToAppIcon />}
                onClick={handleLogout}
                disabled={loading}
              >
                Salir
              </Button>
            </Box>
          }
        >
          <AlertTitle>Problema con la sesión</AlertTitle>
          <Typography>
            Se ha detectado un problema con tu sesión (incompleta). Intenta recuperarla o sal para volver a iniciarla.
          </Typography>
        </Alert>
      </Container>
    );
  }

  const secciones = [
    {
      titulo: 'Explorador de Establecimientos',
      descripcion: 'Busca y analiza establecimientos en cualquier ubicación. Exporta automáticamente todos los datos de una zona a Google Sheets para análisis detallado.',
      icono: <ExploreIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.primary.main,
      ruta: '/explorer'
    },
    {
      titulo: 'Proyectos',
      descripcion: 'Gestiona tus proyectos y análisis guardados. Sincroniza automáticamente tus datos de Google Sheets con presentaciones en Google Slides.',
      icono: <FolderIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.secondary.main,
      ruta: '/proyectos'
    },
    {
      titulo: 'Análisis',
      descripcion: 'Visualiza estadísticas y tendencias de tus datos. Genera reportes automáticos y gráficos interactivos.',
      icono: <AssessmentIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.success.main,
      ruta: '/analisis'
    }
  ];

  const automatizaciones = [
    {
      titulo: 'Excel a Sheets',
      descripcion: 'Importa datos desde Excel a Google Sheets automáticamente. Mantén tus datos sincronizados y actualizados.',
      icono: <TableChartIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.info.main,
      ruta: '/excel-to-sheets'
    },
    {
      titulo: 'Excel a Slides',
      descripcion: 'Crea presentaciones automáticas desde datos de Excel. Genera reportes visuales con un solo clic.',
      icono: <SlideshowIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.error.main,
      ruta: '/excel-to-slides'
    },
    {
      titulo: 'Sheets a Slides',
      descripcion: 'Convierte tus hojas de cálculo de Google en presentaciones profesionales automáticamente.',
      icono: <SlideshowIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.warning.main,
      ruta: '/sheets-to-slides'
    },
    {
      titulo: 'Sheets a PDF',
      descripcion: 'Genera reportes en PDF desde tus hojas de cálculo de Google Sheets con formato profesional.',
      icono: <DescriptionIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.success.main,
      ruta: '/sheets-to-pdf'
    },
    {
      titulo: 'Actualización Programada',
      descripcion: 'Programa actualizaciones automáticas de tus datos en intervalos regulares.',
      icono: <ScheduleIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.primary.main,
      ruta: '/actualizacion-programada'
    }
  ];

  const herramientasComerciantes = [
    {
      titulo: 'Análisis de Competencia',
      descripcion: 'Compara establecimientos similares y analiza su rendimiento. Identifica tendencias y oportunidades de mercado.',
      icono: <CompareArrowsIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.warning.main,
      estado: 'Próximamente',
      ruta: '#'
    },
    {
      titulo: 'Análisis de Demografía',
      descripcion: 'Analiza la población y características demográficas de cualquier zona. Identifica el perfil de clientes potenciales.',
      icono: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.primary.main,
      estado: 'Próximamente',
      ruta: '#'
    },
    {
      titulo: 'Análisis de Rentabilidad',
      descripcion: 'Calcula la rentabilidad potencial de ubicaciones. Incluye análisis de costos y proyecciones de ingresos.',
      icono: <AttachMoneyIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.success.main,
      estado: 'Próximamente',
      ruta: '#'
    },
    {
      titulo: 'Mapas de Calor',
      descripcion: 'Visualiza la concentración de establecimientos en mapas interactivos. Identifica zonas de oportunidad y competencia.',
      icono: <LocationIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.secondary.main,
      estado: 'Próximamente',
      ruta: '#'
    },
    {
      titulo: 'Análisis de Tráfico',
      descripcion: 'Analiza el flujo de personas en diferentes zonas. Optimiza la ubicación de tu negocio.',
      icono: <TrendingFlatIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.warning.main,
      estado: 'Próximamente',
      ruta: '#'
    },
    {
      titulo: 'Comparador de Zonas',
      descripcion: 'Compara múltiples zonas simultáneamente. Toma decisiones basadas en datos comparativos.',
      icono: <StorefrontIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.error.main,
      estado: 'Próximamente',
      ruta: '#'
    }
  ];

  const accionesRapidas = [
    {
      titulo: 'Nueva Búsqueda',
      descripcion: 'Buscar establecimientos en una ubicación',
      icono: <LocationIcon />,
      ruta: '/explorer',
      color: theme.palette.primary.main
    },
    {
      titulo: 'Crear Proyecto',
      descripcion: 'Iniciar un nuevo proyecto de análisis',
      icono: <FolderIcon />,
      ruta: '/proyectos/nuevo',
      color: theme.palette.secondary.main
    },
    {
      titulo: 'Exportar Datos',
      descripcion: 'Exportar resultados a Google Sheets',
      icono: <TrendingUpIcon />,
      ruta: '/exportar',
      color: theme.palette.success.main
    }
  ];

  const recursos = [
    {
      titulo: 'Documentación',
      descripcion: 'Guías y tutoriales de uso',
      icono: <HelpIcon />,
      ruta: '/docs',
      color: theme.palette.info.main
    },
    {
      titulo: 'Configuración',
      descripcion: 'Ajustar preferencias y opciones',
      icono: <SettingsIcon />,
      ruta: '/configuracion',
      color: theme.palette.warning.main
    },
    {
      titulo: 'Soporte',
      descripcion: 'Obtener ayuda y contacto',
      icono: <GroupIcon />,
      ruta: '/soporte',
      color: theme.palette.error.main
    }
  ];

  if (status === 'loading') {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh' 
        }}
      >
        <CircularProgress color="primary" size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <EncabezadoSistema />
      
      {/* Contenido Principal */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={2}>
          {/* Encabezado */}
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                display: 'flex', 
                flexDirection: 'column',
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                color: 'white',
                borderRadius: 2
              }}
            >
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Bienvenido, {session?.user?.name}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Panel de control de SincroGoo
              </Typography>
            </Paper>
          </Grid>

          {/* Estadísticas */}
          <Grid item xs={12} md={3}>
            <Fade in timeout={500}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ color: theme.palette.primary.main, mb: 2 }}>
                    <StoreIcon sx={{ fontSize: 40 }} />
                  </Box>
                  <Typography color="text.secondary" gutterBottom>
                    Establecimientos
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    0
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
          <Grid item xs={12} md={3}>
            <Fade in timeout={600}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ color: theme.palette.secondary.main, mb: 2 }}>
                    <FolderOpenIcon sx={{ fontSize: 40 }} />
                  </Box>
                  <Typography color="text.secondary" gutterBottom>
                    Proyectos
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    0
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
          <Grid item xs={12} md={3}>
            <Fade in timeout={700}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ color: theme.palette.info.main, mb: 2 }}>
                    <HistoryIcon sx={{ fontSize: 40 }} />
                  </Box>
                  <Typography color="text.secondary" gutterBottom>
                    Búsquedas Recientes
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    0
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
          <Grid item xs={12} md={3}>
            <Fade in timeout={800}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ color: theme.palette.success.main, mb: 2 }}>
                    <FileDownloadIcon sx={{ fontSize: 40 }} />
                  </Box>
                  <Typography color="text.secondary" gutterBottom>
                    Exportaciones
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    0
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Grid>

          {/* Secciones Principales */}
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Secciones Principales
              </Typography>
              <Grid container spacing={2}>
                {secciones.map((seccion, index) => (
                  <Grid item xs={12} md={4} key={seccion.titulo}>
                    <Fade in timeout={500 + index * 100}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 24px ${alpha(seccion.color, 0.15)}`,
                            '& .MuiCardContent-root': {
                              bgcolor: alpha(seccion.color, 0.05)
                            }
                          }
                        }}
                        onClick={() => router.push(seccion.ruta)}
                      >
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Box sx={{ color: seccion.color, mb: 1 }}>
                            {seccion.icono}
                          </Box>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                            {seccion.titulo}
                          </Typography>
                          <Typography color="text.secondary" variant="body2">
                            {seccion.descripcion}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Automatizaciones */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2,
                height: '100%',
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Automatizaciones
              </Typography>
              <Grid container spacing={2}>
                {automatizaciones.slice(0, 4).map((funcion, index) => (
                  <Grid item xs={12} md={6} key={funcion.titulo}>
                    <Fade in timeout={500 + index * 100}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 24px ${alpha(funcion.color, 0.15)}`,
                            '& .MuiCardContent-root': {
                              bgcolor: alpha(funcion.color, 0.05)
                            }
                          }
                        }}
                        onClick={() => router.push(funcion.ruta)}
                      >
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Box sx={{ color: funcion.color, mb: 1 }}>
                            {funcion.icono}
                          </Box>
                          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                            {funcion.titulo}
                          </Typography>
                          <Typography color="text.secondary" variant="body2">
                            {funcion.descripcion}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Herramientas para Comerciantes */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2,
                height: '100%',
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Herramientas para Comerciantes
              </Typography>
              <Grid container spacing={2}>
                {herramientasComerciantes.slice(0, 4).map((funcion, index) => (
                  <Grid item xs={12} md={6} key={funcion.titulo}>
                    <Fade in timeout={500 + index * 100}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'not-allowed',
                          opacity: 0.7,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 24px ${alpha(funcion.color, 0.15)}`,
                            '& .MuiCardContent-root': {
                              bgcolor: alpha(funcion.color, 0.05)
                            }
                          }
                        }}
                      >
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Box sx={{ color: funcion.color, mb: 1 }}>
                            {funcion.icono}
                          </Box>
                          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                            {funcion.titulo}
                          </Typography>
                          <Typography color="text.secondary" variant="body2" gutterBottom>
                            {funcion.descripcion}
                          </Typography>
                          <Chip 
                            label={funcion.estado} 
                            size="small" 
                            color="warning"
                            sx={{ mt: 0.5 }}
                          />
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Recursos */}
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Recursos
              </Typography>
              <Grid container spacing={2}>
                {recursos.map((recurso, index) => (
                  <Grid item xs={12} md={4} key={recurso.titulo}>
                    <Fade in timeout={500 + index * 100}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 24px ${alpha(recurso.color, 0.15)}`,
                            '& .MuiCardContent-root': {
                              bgcolor: alpha(recurso.color, 0.05)
                            }
                          }
                        }}
                        onClick={() => router.push(recurso.ruta)}
                      >
                        <CardContent sx={{ textAlign: 'center', p: 2 }}>
                          <Box sx={{ color: recurso.color, mb: 1 }}>
                            {recurso.icono}
                          </Box>
                          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                            {recurso.titulo}
                          </Typography>
                          <Typography color="text.secondary" variant="body2">
                            {recurso.descripcion}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
} 