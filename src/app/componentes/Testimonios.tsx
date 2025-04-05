"use client"

import {
  Typography,
  Container,
  Grid,
  Card,
  Box,
  Avatar,
  Divider,
} from '@mui/material';
import { useThemeMode } from "@/app/lib/theme";

export const Testimonios = () => {
  const { mode } = useThemeMode();

  const testimonios = [
    {
      name: "María González",
      role: "Gerente de Marketing",
      company: "TechSolutions",
      avatar: "/avatars/avatar1.jpg",
      testimonial: "SincroGoo ha revolucionado la forma en que presentamos datos a nuestros clientes. La sincronización automática y el editor visual nos permiten mantener nuestras presentaciones siempre actualizadas."
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
      role: "Consultora de Negocios",
      company: "ConsultPro",
      avatar: "/avatars/avatar3.jpg",
      testimonial: "La facilidad de uso y las características avanzadas de SincroGoo son impresionantes. La vista previa en tiempo real y el control total sobre las actualizaciones son exactamente lo que necesitábamos."
    }
  ];

  return (
    <Box 
      sx={{ 
        py: 10, 
        bgcolor: mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.3)' 
          : 'rgba(101, 52, 172, 0.03)',
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'rgba(0, 0, 0, 0.05)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 20% 30%, rgba(101, 52, 172, 0.15) 0%, rgba(101, 52, 172, 0) 50%)',
          zIndex: 0,
        }
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Typography 
          variant="h2" 
          component="h2" 
          align="center" 
          sx={{ 
            mb: 6, 
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '2.5rem' }
          }}
        >
          Lo que dicen nuestros usuarios
        </Typography>
        
        <Grid container spacing={4}>
          {testimonios.map((testimonio, index) => (
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
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: mode === 'dark' 
                      ? '0 10px 30px rgba(0, 0, 0, 0.3)' 
                      : '0 10px 30px rgba(0, 0, 0, 0.1)',
                    borderColor: 'primary.main',
                  }
                }}
              >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mb: 3, 
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                      color: 'text.secondary',
                      minHeight: 120
                    }}
                  >
                    "{testimonio.testimonial}"
                  </Typography>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      sx={{ 
                        width: 50, 
                        height: 50,
                        bgcolor: mode === 'dark' ? '#8C5FD0' : '#6534AC',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        border: '2px solid',
                        borderColor: mode === 'dark' ? '#8C5FD0' : '#6534AC',
                      }}
                    >
                      {testimonio.name.charAt(0)}
                    </Avatar>
                    
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {testimonio.name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        {testimonio.role}, {testimonio.company}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
} 