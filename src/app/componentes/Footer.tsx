"use client"

import Link from "next/link"
import { 
  Typography, 
  Box, 
  Grid, 
  Container,
  IconButton,
  Divider,
  List,
  ListItem,
} from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import { useThemeMode } from "@/app/lib/theme";

export const Footer = () => {
  const { mode } = useThemeMode();

  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 8,
        bgcolor: mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.4)' 
          : 'rgba(0, 0, 0, 0.02)',
        borderTop: '1px solid',
        borderColor: mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'rgba(0, 0, 0, 0.05)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3 }}>
              <Box 
                component="img"
                src="/logo.png"
                alt="SincroGoo Logo"
                sx={{ 
                  height: 40,
                  width: 40,
                  objectFit: 'contain',
                  mb: 2
                }}
              />
              
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700,
                  mb: 1,
                  background: mode === 'dark' 
                    ? 'linear-gradient(90deg, #8c5fd0 0%, #6534ac 100%)' 
                    : 'linear-gradient(90deg, #6534ac 0%, #8c5fd0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                SincroGoo
              </Typography>
              
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                La forma más sencilla de sincronizar tus datos entre Google Sheets y Slides.
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton 
                size="small"
                aria-label="Twitter"
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': {
                    color: '#1DA1F2',
                    bgcolor: mode === 'dark' 
                      ? 'rgba(29, 161, 242, 0.1)' 
                      : 'rgba(29, 161, 242, 0.05)',
                  }
                }}
              >
                <TwitterIcon fontSize="small" />
              </IconButton>
              
              <IconButton 
                size="small"
                aria-label="LinkedIn"
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': {
                    color: '#0077B5',
                    bgcolor: mode === 'dark' 
                      ? 'rgba(0, 119, 181, 0.1)' 
                      : 'rgba(0, 119, 181, 0.05)',
                  }
                }}
              >
                <LinkedInIcon fontSize="small" />
              </IconButton>
              
              <IconButton 
                size="small"
                aria-label="GitHub"
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': {
                    color: mode === 'dark' 
                      ? '#FFFFFF' 
                      : '#24292E',
                    bgcolor: mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(36, 41, 46, 0.05)',
                  }
                }}
              >
                <GitHubIcon fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Typography 
              variant="subtitle1" 
              fontWeight="bold" 
              gutterBottom
            >
              Producto
            </Typography>
            
            <List disablePadding>
              {['Características', 'Precios', 'Tutoriales', 'Casos de uso'].map((item) => (
                <ListItem key={item} disablePadding sx={{ mb: 1 }}>
                  <Link 
                    href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        '&:hover': {
                          color: 'primary.main',
                        },
                        transition: 'color 0.2s'
                      }}
                    >
                      {item}
                    </Typography>
                  </Link>
                </ListItem>
              ))}
            </List>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Typography 
              variant="subtitle1" 
              fontWeight="bold" 
              gutterBottom
            >
              Empresa
            </Typography>
            
            <List disablePadding>
              {['Sobre nosotros', 'Blog', 'Contacto', 'Soporte'].map((item) => (
                <ListItem key={item} disablePadding sx={{ mb: 1 }}>
                  <Link 
                    href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        '&:hover': {
                          color: 'primary.main',
                        },
                        transition: 'color 0.2s'
                      }}
                    >
                      {item}
                    </Typography>
                  </Link>
                </ListItem>
              ))}
            </List>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Typography 
              variant="subtitle1" 
              fontWeight="bold" 
              gutterBottom
            >
              Legal
            </Typography>
            
            <List disablePadding>
              {['Términos', 'Privacidad', 'Cookies', 'Licencias'].map((item) => (
                <ListItem key={item} disablePadding sx={{ mb: 1 }}>
                  <Link 
                    href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        '&:hover': {
                          color: 'primary.main',
                        },
                        transition: 'color 0.2s'
                      }}
                    >
                      {item}
                    </Typography>
                  </Link>
                </ListItem>
              ))}
            </List>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Typography 
              variant="subtitle1" 
              fontWeight="bold" 
              gutterBottom
            >
              Recursos
            </Typography>
            
            <List disablePadding>
              {['Documentación', 'API', 'Comunidad', 'Ayuda'].map((item) => (
                <ListItem key={item} disablePadding sx={{ mb: 1 }}>
                  <Link 
                    href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        '&:hover': {
                          color: 'primary.main',
                        },
                        transition: 'color 0.2s'
                      }}
                    >
                      {item}
                    </Typography>
                  </Link>
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 4 }} />
        
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', sm: 'flex-start' },
            gap: 2
          }}
        >
          <Typography 
            variant="body2" 
            color="text.secondary"
          >
            &copy; {new Date().getFullYear()} SincroGoo. Todos los derechos reservados.
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex',
              gap: 3
            }}
          >
            <Link 
              href="/terminos"
              style={{ textDecoration: 'none' }}
            >
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  '&:hover': {
                    color: 'primary.main',
                  },
                  transition: 'color 0.2s'
                }}
              >
                Términos
              </Typography>
            </Link>
            
            <Link 
              href="/privacidad"
              style={{ textDecoration: 'none' }}
            >
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  '&:hover': {
                    color: 'primary.main',
                  },
                  transition: 'color 0.2s'
                }}
              >
                Privacidad
              </Typography>
            </Link>
            
            <Link 
              href="/cookies"
              style={{ textDecoration: 'none' }}
            >
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  '&:hover': {
                    color: 'primary.main',
                  },
                  transition: 'color 0.2s'
                }}
              >
                Cookies
              </Typography>
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
} 