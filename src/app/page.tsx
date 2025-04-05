"use client"

import Link from "next/link"
import { 
  Button, 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  CircularProgress,
  Paper,
  Divider,
  Avatar,
  IconButton,
  useTheme,
  Theme,
  ThemeProvider,
  createTheme,
  Alert,
  Stack,
} from '@mui/material';
import { styled } from '@mui/system';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import { EncabezadoSitio } from "@/app/componentes/EncabezadoSitio"
import { motion } from "framer-motion"
import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined';
import { alpha } from '@mui/system';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useThemeMode } from "@/app/lib/theme";
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import MapIcon from '@mui/icons-material/Map';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import RefreshIcon from '@mui/icons-material/Refresh';
import GoogleSyncAnimation from '@/app/componentes/GoogleSyncAnimation';
import GoogleIcon from '@mui/icons-material/Google';
import { signIn } from "next-auth/react"
import { Footer } from "@/app/componentes/Footer"
import { HerramientasComerciales } from "@/app/componentes/HerramientasComerciales"
import { SeccionesPrincipales } from "@/app/componentes/SeccionesPrincipales"
import { Automatizaciones } from "@/app/componentes/Automatizaciones"
import { Testimonios } from '@/app/componentes/Testimonios';

// Componentes estilizados
const GradientText = styled('span')(({ theme }) => ({
  background: '-webkit-linear-gradient(45deg, #2196f3, #4caf50)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'inline-block',
  fontWeight: 700,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    width: '100%',
    height: '30%',
    bottom: 0,
    left: 0,
    background: theme.palette.mode === 'dark' 
      ? 'linear-gradient(to top, rgba(33, 150, 243, 0.1), transparent)'
      : 'linear-gradient(to top, rgba(33, 150, 243, 0.05), transparent)',
    zIndex: -1,
    borderRadius: '50%',
    filter: 'blur(8px)',
  }
}));

const GradientTextSlides = styled('span')(({ theme }) => ({
  background: '-webkit-linear-gradient(45deg, #ff7800, #e91e63)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'inline-block',
  fontWeight: 700,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    width: '100%',
    height: '30%',
    bottom: 0,
    left: 0,
    background: theme.palette.mode === 'dark' 
      ? 'linear-gradient(to top, rgba(255, 120, 0, 0.1), transparent)'
      : 'linear-gradient(to top, rgba(255, 120, 0, 0.05), transparent)',
    zIndex: -1,
    borderRadius: '50%',
    filter: 'blur(8px)',
  }
}));

const FeatureCard = styled(Card)<{ theme?: Theme }>(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: Array.isArray(theme?.shadows) ? theme.shadows[10] : 'none',
    borderColor: theme?.palette.primary.light,
  },
  border: `1px solid ${theme?.palette.divider}`,
  borderRadius: 16,
  backgroundColor: theme?.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.8)' : theme?.palette.background.paper,
}));

const TestimonialCard = styled(Card)<{ theme?: Theme }>(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: Array.isArray(theme?.shadows) ? theme.shadows[6] : 'none',
  },
  borderRadius: 16,
  backgroundColor: theme?.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.8)' : theme?.palette.background.paper,
}));

const features = [
  {
    title: "Acceso seguro",
    description: "Autoriza el acceso solo a los documentos que necesites",
    icon: SecurityOutlinedIcon,
    checks: [
      "Sin almacenamiento de credenciales",
      "Control total de permisos",
      "Acceso temporal y revocable"
    ]
  },
  {
    title: "Edita con facilidad",
    description: "Interfaz intuitiva para actualizar tus precios",
    icon: VisibilityOutlinedIcon,
    checks: [
      "Editor visual de precios",
      "Vista previa de cambios",
      "Historial de actualizaciones"
    ]
  },
  {
    title: "Sincronización automática",
    description: "Mantén tus documentos actualizados",
    icon: BoltOutlinedIcon,
    checks: [
      "Actualización en tiempo real",
      "Sin configuración compleja",
      "Control de cambios"
    ]
  }
]

const testimonials = [
  {
    name: "María González",
    role: "Gerente de Marketing",
    content: "SinCroGoo ha simplificado enormemente nuestro proceso de actualización de precios. Ahora puedo mantener todas nuestras presentaciones actualizadas sin esfuerzo."
  },
  {
    name: "Carlos Rodríguez",
    role: "Director Financiero",
    company: "InnovaFinance",
    avatar: "/avatars/avatar2.jpg",
    testimonial: "La sincronización automática nos ahorra horas cada semana. La interfaz intuitiva y las opciones de personalización hacen que sea muy fácil mantener nuestras presentaciones profesionales. El soporte es excelente."
  },
  {
    name: "Ana Martínez",
    role: "Coordinadora de Proyectos",
    content: "La facilidad de uso y las características avanzadas de SincroGoo son impresionantes. La vista previa en tiempo real y el control total sobre las actualizaciones son exactamente lo que necesitábamos."
  }
]

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  },
  hover: { 
    scale: 1.02,
    y: -5,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
}

const buttonVariants = {
  hover: { 
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: { 
    scale: 0.95,
    transition: {
      duration: 0.1
    }
  }
}

// Agregar estilos globales para la animación
const globalStyles = {
  '@keyframes rotate': {
    '0%': {
      transform: 'rotate(0deg)',
    },
    '100%': {
      transform: 'rotate(360deg)',
    },
  },
};

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const theme = useTheme<Theme>()
  const { mode, toggleMode } = useThemeMode()

  // Aplicar estilos globales
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  const customTheme = createTheme({
    palette: {
      mode: mode as 'light' | 'dark'
    }
  })

  // Lógica simplificada que solo redirecciona si hay sesión completa
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      console.log('Usuario autenticado completo, redirigiendo a dashboard');
      router.push("/dashboard");
    }
  }, [status, router, session]);

  // Función para limpiar completamente la sesión cuando hay problemas
  const limpiarSesionCompletamente = async () => {
    try {
      console.log('Iniciando limpieza completa de sesión...');
      // Llamar al endpoint específico para limpiar todas las cookies
      await fetch('/api/auth/clear-session');
      
      // Limpiar localStorage
      localStorage.clear();
      
      // Limpiar cookies manualmente
      document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "__Secure-next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "__Host-next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Recargar la página
      window.location.href = '/';
    } catch (error) {
      console.error('Error al limpiar sesión:', error);
    }
  };

  if (status === "loading") {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: mode === 'dark' ? 'background.default' : 'grey.50'
      }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <ThemeProvider theme={customTheme}>
      <EncabezadoSitio />
      
      {/* Botón de emergencia para limpiar sesión (solo visible si hay problemas) */}
      {status === "authenticated" && !session?.user?.email && (
        <Container maxWidth="sm" sx={{ mt: 10, mb: -6, position: 'relative', zIndex: 5 }}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              borderRadius: 2,
              boxShadow: 2
            }}
          >
            Se ha detectado un problema con la sesión actual (autenticado pero sin datos completos)
          </Alert>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              textAlign: 'center',
              bgcolor: mode === 'dark' ? 'rgba(0,0,0,0.5)' : '#fff'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Solución de problemas de sesión
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Hemos detectado que tu sesión está autenticada pero incompleta, lo que puede causar bucles de redirección.
              Usa este botón para limpiar completamente todas las cookies de sesión y solucionar el problema.
            </Typography>
            <Button 
              variant="contained" 
              color="error" 
              onClick={limpiarSesionCompletamente}
              startIcon={<RefreshIcon />}
              fullWidth
              sx={{ mt: 1 }}
            >
              Limpiar sesión y reiniciar
            </Button>
          </Paper>
        </Container>
      )}
      
      <Box
        component="main"
        sx={{
          bgcolor: mode === 'dark' ? 'background.default' : 'grey.50',
          minHeight: '100vh',
          py: { xs: 4, md: 8 },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Blobs de fondo */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0,
          opacity: 0.6,
          pointerEvents: 'none',
        }}>
          {/* Blob 1 */}
          <Box sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '40%',
            height: '40%',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            background: mode === 'dark'
              ? 'radial-gradient(circle at center, rgba(140, 95, 208, 0.15), rgba(140, 95, 208, 0) 70%)'
              : 'radial-gradient(circle at center, rgba(140, 95, 208, 0.1), rgba(140, 95, 208, 0) 70%)',
            filter: 'blur(40px)',
          }} />
          {/* Blob 2 */}
          <Box sx={{
            position: 'absolute',
            top: '40%',
            right: '10%',
            width: '35%',
            height: '35%',
            borderRadius: '70% 30% 30% 70% / 60% 40% 60% 40%',
            background: mode === 'dark'
              ? 'radial-gradient(circle at center, rgba(101, 52, 172, 0.15), rgba(101, 52, 172, 0) 70%)'
              : 'radial-gradient(circle at center, rgba(101, 52, 172, 0.1), rgba(101, 52, 172, 0) 70%)',
            filter: 'blur(40px)',
          }} />
        </Box>

        {/* Hero Section */}
        <Container maxWidth="lg" sx={{ 
          pt: { xs: 2, md: 3 },
          pb: 8, 
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}>

        {/* Manchas de color para el contenido principal */}
        <Box sx={{
          position: 'absolute',
          width: '70%',
          height: '70%',
          background: mode === 'dark'
            ? 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0) 70%)'
            : 'radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0) 75%)',
          top: -100,
          right: -200,
          borderRadius: '50%',
          filter: 'blur(80px)',
          zIndex: 0,
          transform: 'rotate(-15deg)',
          pointerEvents: 'none',
        }} />

        <Box sx={{
          position: 'absolute',
          width: '60%',
          height: '60%',
          background: mode === 'dark'
            ? 'radial-gradient(circle, rgba(255, 142, 83, 0.15) 0%, rgba(255, 142, 83, 0) 70%)'
            : 'radial-gradient(circle, rgba(255, 142, 83, 0.12) 0%, rgba(255, 142, 83, 0) 70%)',
          top: '30%',
          left: -100,
          borderRadius: '50%',
          filter: 'blur(80px)',
          zIndex: 0,
          transform: 'rotate(15deg)',
          pointerEvents: 'none',
        }} />

        <Box sx={{
          position: 'absolute',
          width: '50%',
          height: '50%',
          background: mode === 'dark'
            ? 'radial-gradient(circle, rgba(101, 52, 172, 0.15) 0%, rgba(101, 52, 172, 0) 70%)'
            : 'radial-gradient(circle, rgba(101, 52, 172, 0.12) 0%, rgba(101, 52, 172, 0) 70%)',
          bottom: '10%',
          right: '20%',
          borderRadius: '50%',
          filter: 'blur(80px)',
          zIndex: 0,
          transform: 'rotate(-10deg)',
          pointerEvents: 'none',
        }} />

          <Box sx={{ 
            maxWidth: '1000px', 
            mx: 'auto', 
            px: 3,
            position: 'relative',
            zIndex: 1
          }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ 
              textAlign: 'center',
              fontWeight: 700,
              mb: 4,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              background: mode === 'dark' 
                ? 'linear-gradient(45deg, #8C5FD0 30%, #FF8E53 90%)'
                : 'linear-gradient(45deg, #6534AC 30%, #FF8E53 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: mode === 'dark' 
                ? '0 0 20px rgba(140, 95, 208, 0.3)' 
                : '0 0 20px rgba(101, 52, 172, 0.2)',
              position: 'relative',
              zIndex: 1
            }}>
              SincroGoo: Automatiza tus Datos y Multiplica tus Ventas
            </Typography>

            <Box sx={{ 
              position: 'relative',
              width: '100%',
              maxWidth: '600px',
              mx: 'auto',
              mb: 6,
              zIndex: 2,
              backgroundColor: 'transparent',
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <GoogleSyncAnimation />
            </Box>

            <Typography variant="h6" sx={{ 
              textAlign: 'center', 
              mb: 4,
              color: mode === 'dark' ? 'text.secondary' : 'text.primary',
              maxWidth: '800px',
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
              lineHeight: 1.6
            }}>
              Sincroniza tus datos con presentaciones profesionales y descubre oportunidades de negocio analizando la competencia en tu zona | Optimiza tu tiempo y cierra más ventas con presentaciones que se actualizan automáticamente
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' }, 
              gap: 2, 
              justifyContent: 'center',
              mb: 8
            }}>
              <Button 
                variant="contained" 
                size="large" 
                href="/src/proyectos"
                startIcon={<PlayArrowOutlinedIcon />}
                sx={{ 
                  py: 1.5, 
                  px: 3, 
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: mode === 'dark' 
                    ? '0 0 20px rgba(140, 95, 208, 0.4)' 
                    : '0 8px 25px rgba(101, 52, 172, 0.25)',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: mode === 'dark' 
                      ? '0 0 30px rgba(140, 95, 208, 0.6)' 
                      : '0 12px 30px rgba(101, 52, 172, 0.35)',
                  },
                  transition: 'all 0.3s ease',
                  minWidth: '180px'
                }}
              >
                Comenzar ahora
              </Button>

              <Button 
                variant="outlined" 
                size="large" 
                href="/demo"
                startIcon={<VisibilityOutlinedIcon />}
                sx={{ 
                  py: 1.5, 
                  px: 3, 
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'translateY(-3px)',
                    backgroundColor: mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(0, 0, 0, 0.02)',
                  },
                  transition: 'all 0.3s ease',
                  minWidth: '180px'
                }}
              >
                Ver demo
              </Button>
            </Box>

            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 3, 
              justifyContent: 'center',
              mb: 4
            }}>
              {[
                { text: "Excel a Sheets", icon: <ImportExportIcon /> },
                { text: "Sheets a Slides", icon: <SlideshowIcon /> },
                { text: "Sincronización automática", icon: <AutorenewOutlinedIcon /> },
                { text: "Reportes profesionales", icon: <PictureAsPdfIcon /> }
              ].map((feature, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    color: mode === 'dark' ? 'text.secondary' : 'text.primary',
                  }}
                >
                  <Box sx={{ 
                    color: mode === 'dark' ? '#8C5FD0' : '#6534AC',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="body1">
                    {feature.text}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Grid container spacing={4} sx={{ mb: 8 }}>
              <Grid item xs={12} md={4}>
                <Card 
                  component={motion.div}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  sx={{ 
                    height: '100%',
                    p: 3,
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    bgcolor: 'background.paper',
                    border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.03)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: mode === 'dark' 
                        ? '0 10px 30px rgba(0, 0, 0, 0.3)' 
                        : '0 10px 30px rgba(0, 0, 0, 0.1)',
                      borderColor: 'primary.main',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box 
                      sx={{ 
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: mode === 'dark' ? 'rgba(140, 95, 208, 0.1)' : 'rgba(101, 52, 172, 0.1)',
                        color: mode === 'dark' ? '#8C5FD0' : '#6534AC',
                        mr: 2
                      }}
                    >
                      <TableChartOutlinedIcon sx={{ fontSize: 30 }} />
                    </Box>
                    <Typography variant="h6" component="h3">
                      Editor Visual Inteligente
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="text.secondary">
                    Interfaz intuitiva para gestionar elementos y asociaciones. 
                    Vista previa en tiempo real y personalización completa de tu presentación.
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card 
                  component={motion.div}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  sx={{ 
                    height: '100%',
                    p: 3,
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    bgcolor: 'background.paper',
                    border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.03)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: mode === 'dark' 
                        ? '0 10px 30px rgba(0, 0, 0, 0.3)' 
                        : '0 10px 30px rgba(0, 0, 0, 0.1)',
                      borderColor: 'primary.main',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box 
                      sx={{ 
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: mode === 'dark' ? 'rgba(140, 95, 208, 0.1)' : 'rgba(101, 52, 172, 0.1)',
                        color: mode === 'dark' ? '#8C5FD0' : '#6534AC',
                        mr: 2
                      }}
                    >
                      <DesignServicesOutlinedIcon sx={{ fontSize: 30 }} />
                    </Box>
                    <Typography variant="h6" component="h3">
                      Sincronización Inteligente
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="text.secondary">
                    Conecta automáticamente tus hojas de cálculo con presentaciones. 
                    Actualiza datos en tiempo real y mantén tus presentaciones siempre actualizadas.
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card 
                  component={motion.div}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  sx={{ 
                    height: '100%',
                    p: 3,
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    bgcolor: 'background.paper',
                    border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.03)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: mode === 'dark' 
                        ? '0 10px 30px rgba(0, 0, 0, 0.3)' 
                        : '0 10px 30px rgba(0, 0, 0, 0.1)',
                      borderColor: 'primary.main',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box 
                      sx={{ 
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: mode === 'dark' ? 'rgba(140, 95, 208, 0.1)' : 'rgba(101, 52, 172, 0.1)',
                        color: mode === 'dark' ? '#8C5FD0' : '#6534AC',
                        mr: 2
                      }}
                    >
                      <AutorenewOutlinedIcon sx={{ fontSize: 30 }} />
                    </Box>
                    <Typography variant="h6" component="h3">
                      Modos de Sincronización
                    </Typography>
                  </Box>
                  <Typography variant="body1" color="text.secondary">
                    Elige entre sincronización automática o manual. 
                    Control total sobre cuándo y cómo actualizar tus presentaciones.
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
          
          {/* Imagen de demostración con efecto de sombra y animación */}
          <Box 
            sx={{ 
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                width: '80%',
                height: '80%',
                bottom: '-5%',
                left: '10%',
                background: mode === 'dark' 
                  ? 'radial-gradient(ellipse at center, rgba(101, 52, 172, 0.15) 0%, rgba(0, 0, 0, 0) 70%)' 
                  : 'radial-gradient(ellipse at center, rgba(101, 52, 172, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
                borderRadius: '50%',
                filter: 'blur(20px)',
                zIndex: 0,
              }
            }}
          >
            <Box 
              component="img"
              src="/demo-image.png"
              alt="Vista previa de la aplicación"
              sx={{ 
                width: '100%',
                maxWidth: '1000px',
                height: 'auto',
                borderRadius: 4,
                boxShadow: mode === 'dark' 
                  ? '0 20px 80px rgba(0, 0, 0, 0.5)' 
                  : '0 20px 80px rgba(0, 0, 0, 0.15)',
                border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                position: 'relative',
                zIndex: 1,
                transform: 'translateY(0)',
                transition: 'all 0.5s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: mode === 'dark' 
                    ? '0 25px 100px rgba(0, 0, 0, 0.6)' 
                    : '0 25px 100px rgba(0, 0, 0, 0.2)',
                }
              }}
            />
          </Box>
        </Container>

        {/* Automatizaciones */}
        <Automatizaciones />

        {/* Testimonios */}
        <Testimonios />

        {/* Secciones Principales */}
        <SeccionesPrincipales />

        {/* Herramientas para Comerciantes */}
        <HerramientasComerciales />

        {/* CTA Section */}
        <Box 
          sx={{ 
            py: 12,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: mode === 'dark' 
                ? 'linear-gradient(135deg, rgba(101, 52, 172, 0.2) 0%, rgba(0, 0, 0, 0) 100%)'
                : 'linear-gradient(135deg, rgba(101, 52, 172, 0.1) 0%, rgba(255, 255, 255, 0) 100%)',
              zIndex: 0,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '70%',
              height: '70%',
              background: mode === 'dark' 
                ? 'radial-gradient(circle at bottom right, rgba(140, 95, 208, 0.1), transparent 70%)'
                : 'radial-gradient(circle at bottom right, rgba(140, 95, 208, 0.05), transparent 70%)',
              zIndex: 0,
            }
          }}
        >
          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
            <Box 
              sx={{ 
                textAlign: 'center',
                p: { xs: 4, md: 6 },
                borderRadius: 4,
                bgcolor: 'background.paper',
                boxShadow: mode === 'dark' 
                  ? '0 10px 40px rgba(0, 0, 0, 0.3)' 
                  : '0 10px 40px rgba(0, 0, 0, 0.1)',
                border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.03)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '5px',
                  background: 'linear-gradient(90deg, #6534ac, #8c5fd0)',
                }
              }}
            >
              <Typography 
                variant="h3" 
                component="h2" 
                gutterBottom
                sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                  mb: 2
                }}
              >
                Comienza a sincronizar tus datos hoy mismo
              </Typography>
              
              <Typography 
                variant="h6" 
                component="p" 
                color="text.secondary"
                sx={{ 
                  mb: 4,
                  maxWidth: '600px',
                  mx: 'auto',
                  fontSize: { xs: '1rem', md: '1.1rem' },
                  lineHeight: 1.6
                }}
              >
                Regístrate gratis y descubre cómo SincroGoo puede transformar la forma en que presentas tus datos. Empieza a ahorrar tiempo y a crear presentaciones impactantes.
              </Typography>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' }, 
                  gap: 2, 
                  justifyContent: 'center',
                  maxWidth: '500px',
                  mx: 'auto'
                }}
              >
                <Button 
                  variant="contained" 
                  size="large" 
                  href="/src/proyectos"
                  startIcon={<PlayArrowOutlinedIcon />}
                  sx={{ 
                    py: 1.5, 
                    px: 3, 
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    flexGrow: 1,
                    boxShadow: mode === 'dark' 
                      ? '0 0 20px rgba(140, 95, 208, 0.4)' 
                      : '0 8px 25px rgba(101, 52, 172, 0.25)',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: mode === 'dark' 
                        ? '0 0 30px rgba(140, 95, 208, 0.6)' 
                        : '0 12px 30px rgba(101, 52, 172, 0.35)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Registrarse gratis
                </Button>
                
                <Button 
                  variant="outlined" 
                  size="large" 
                  href="/precios"
                  startIcon={<VisibilityOutlinedIcon />}
                  sx={{ 
                    py: 1.5, 
                    px: 3, 
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    flexGrow: 1,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                      transform: 'translateY(-3px)',
                      backgroundColor: mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.03)' 
                        : 'rgba(0, 0, 0, 0.02)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Ver planes
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Footer */}
        <Footer />
      </Box>
    </ThemeProvider>
  )
}