"use client"

import {
  Typography,
  Container,
  Grid,
  Card,
  Box,
} from '@mui/material';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useThemeMode } from "@/app/lib/theme";

export const Automatizaciones = () => {
  const { mode } = useThemeMode();

  const automatizaciones = [
    {
      title: "Excel a Sheets",
      description: "Importa y sincroniza automáticamente datos desde Excel a Google Sheets. Mantén tus hojas de cálculo siempre actualizadas.",
      icon: ImportExportIcon
    },
    {
      title: "Excel a Slides",
      description: "Genera presentaciones profesionales directamente desde tus archivos Excel. Actualización automática con cada cambio.",
      icon: SlideshowIcon
    },
    {
      title: "Sheets a Slides",
      description: "Sincroniza datos de Google Sheets con presentaciones en Slides. Actualización en tiempo real de gráficos y tablas.",
      icon: SlideshowIcon
    },
    {
      title: "Sheets a PDF",
      description: "Exporta tus hojas de cálculo a PDF con formato profesional. Ideal para reportes y presentaciones.",
      icon: PictureAsPdfIcon
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
        Automatizaciones Principales
      </Typography>

      <Grid container spacing={4}>
        {automatizaciones.map((automatizacion, index) => {
          const Icon = automatizacion.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={index}>
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
                    {automatizacion.title}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {automatizacion.description}
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
} 