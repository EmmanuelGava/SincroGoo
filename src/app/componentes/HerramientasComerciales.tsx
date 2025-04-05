"use client"

import {
  Typography,
  Container,
  Grid,
  Card,
  Box,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import MapIcon from '@mui/icons-material/Map';
import { useThemeMode } from "@/app/lib/theme";

export const HerramientasComerciales = () => {
  const { mode } = useThemeMode();

  const herramientas = [
    {
      title: "Análisis de Competencia",
      description: "Compara establecimientos similares y analiza su rendimiento. Identifica tendencias y oportunidades de mercado.",
      icon: PeopleIcon
    },
    {
      title: "Análisis de Demografía",
      description: "Analiza la población y características demográficas de cualquier zona. Identifica el perfil de clientes potenciales.",
      icon: PeopleIcon
    },
    {
      title: "Análisis de Rentabilidad",
      description: "Calcula la rentabilidad potencial de ubicaciones. Incluye análisis de costos y proyecciones de ingresos.",
      icon: AttachMoneyIcon
    },
    {
      title: "Mapas de Calor",
      description: "Visualiza la concentración de establecimientos en mapas interactivos. Identifica zonas de oportunidad y competencia.",
      icon: MapIcon
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mb: 12 }}>
      <Typography 
        variant="h4" 
        component="h3" 
        sx={{ 
          mb: 4,
          fontWeight: 600
        }}
      >
        Herramientas para Comerciantes
      </Typography>

      <Grid container spacing={4}>
        {herramientas.map((herramienta, index) => {
          const Icon = herramienta.icon;
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
                    {herramienta.title}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {herramienta.description}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'inline-block',
                    px: 1,
                    py: 0.5,
                    bgcolor: mode === 'dark' ? 'rgba(255, 87, 34, 0.2)' : 'rgba(255, 87, 34, 0.1)',
                    color: '#FF5722',
                    borderRadius: 1,
                    fontWeight: 500
                  }}
                >
                  Próximamente
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
} 