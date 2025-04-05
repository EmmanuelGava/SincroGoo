"use client"

import {
  Typography,
  Container,
  Grid,
  Card,
  Box,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useThemeMode } from "@/app/lib/theme";

export const SeccionesPrincipales = () => {
  const { mode } = useThemeMode();

  const secciones = [
    {
      title: "Explorador de Establecimientos",
      description: "Busca y analiza establecimientos en cualquier ubicación. Exporta automáticamente todos los datos de una zona a Google Sheets para análisis detallado.",
      icon: LocationOnIcon
    },
    {
      title: "Proyectos",
      description: "Gestiona tus proyectos y análisis guardados. Sincroniza automáticamente tus datos de Google Sheets con presentaciones en Google Slides.",
      icon: TableChartOutlinedIcon
    },
    {
      title: "Análisis",
      description: "Visualiza estadísticas y tendencias de tus datos. Genera reportes automáticos y gráficos interactivos.",
      icon: BarChartIcon
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mb: 12 }}>
      <Typography 
        variant="h3" 
        component="h2" 
        align="center" 
        sx={{ 
          mb: 6, 
          fontWeight: 700,
          fontSize: { xs: '2rem', md: '2.5rem' }
        }}
      >
        Secciones Principales
      </Typography>

      <Grid container spacing={4}>
        {secciones.map((seccion, index) => {
          const Icon = seccion.icon;
          return (
            <Grid item xs={12} md={4} key={index}>
              <Card 
                elevation={0} 
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
                    <Icon sx={{ fontSize: 30 }} />
                  </Box>
                  <Typography variant="h6" component="h3">
                    {seccion.title}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {seccion.description}
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
} 