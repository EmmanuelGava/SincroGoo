"use client"

import * as React from 'react';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  AppBar, 
  Box, 
  Button, 
  Container, 
  IconButton, 
  Toolbar, 
  Typography,
  useTheme,
  Theme
} from '@mui/material';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/system';
import Image from 'next/image';

import { useThemeMode } from "@/app/lib/theme"
import { ThemeToggleButton } from './ThemeToggleButton';

// Iconos
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';

// Páginas principales del sistema (sin links rotos)
const pages = [
  { name: 'Dashboard', href: '/dashboard', icon: <DashboardOutlinedIcon fontSize="small" /> },
  { name: 'Chat', href: '/chat', icon: <ChatOutlinedIcon fontSize="small" /> },
  { name: 'CRM', href: '/crm', icon: <PersonOutlineOutlinedIcon fontSize="small" /> },
  { name: 'Sync Tools', href: '/proyectos', icon: <FolderOutlinedIcon fontSize="small" />, hasMenu: true },
];

// Submenú de Proyectos (alineado con /proyectos/nuevo)
const proyectosMenuItems = [
  { name: 'Mis proyectos', href: '/proyectos', icon: <FolderOutlinedIcon fontSize="small" /> },
  { name: 'Nuevo proyecto', href: '/proyectos/nuevo', icon: <AddIcon fontSize="small" /> },
  { name: 'Plantilla desde Sheet', href: '/proyectos/nuevo?modo=plantilla', icon: <SlideshowOutlinedIcon fontSize="small" /> },
  { name: 'Excel/CSV → Sheets', href: '/excel-to-sheets', icon: <CloudUploadIcon fontSize="small" /> },
  { name: 'Excel/CSV → Slides', href: '/excel-to-slides', icon: <SlideshowOutlinedIcon fontSize="small" /> },
  { name: 'Sheets → Excel', href: '/sheets-to-excel', icon: <DownloadOutlinedIcon fontSize="small" /> },
  { name: 'Slides → Sheet', href: '/slides-to-sheet', icon: <SlideshowOutlinedIcon fontSize="small" /> },
  { name: 'Sheet → Word', href: '/sheets-to-word', icon: <DescriptionOutlinedIcon fontSize="small" /> },
  { name: 'PPTX → Slides', href: '/pptx-to-slides', icon: <SlideshowOutlinedIcon fontSize="small" /> },
  { name: 'PDF → Sheets', href: '/pdf-to-sheets', icon: <PictureAsPdfOutlinedIcon fontSize="small" /> },
  { name: 'Fusionar Sheets', href: '/merge-sheets', icon: <MergeTypeIcon fontSize="small" /> },
  { name: 'Limpiar datos', href: '/clean-data', icon: <CleaningServicesOutlinedIcon fontSize="small" /> },
  { name: 'Explorador', href: '/explorer', icon: <ExploreOutlinedIcon fontSize="small" /> },
];

// Opciones del menú de usuario
const userMenuItems = [
  { name: 'Configuración', href: '/configuracion', icon: <SettingsOutlinedIcon fontSize="small" /> },
  { name: 'Mensajería', href: '/configuracion/mensajeria', icon: <ChatOutlinedIcon fontSize="small" /> },
];

export function EncabezadoSistema() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { mode } = useThemeMode();
  const [avatarError, setAvatarError] = useState(false);
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  
  // Estados para los menús
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElProyectos, setAnchorElProyectos] = useState<null | HTMLElement>(null);

  // Manejadores para el menú de navegación
  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleNavigation = (href: string) => {
    handleCloseNavMenu();
    setAnchorElProyectos(null);
    router.push(href);
  };

  const handleOpenProyectosMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElProyectos(event.currentTarget);
  };

  const handleCloseProyectosMenu = () => {
    setAnchorElProyectos(null);
  };

  const handleProyectosNavigation = (href: string) => {
    handleCloseProyectosMenu();
    router.push(href);
  };

  // Manejadores para el menú de usuario
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleUserNavigation = (href: string) => {
    handleCloseUserMenu();
    router.push(href);
  };

  // Abrir y cerrar menú de perfil
  const handleToggleProfileMenu = () => {
    setShowProfileMenu((prevOpen) => !prevOpen);
  };

  const handleCloseProfileMenu = (event: MouseEvent | TouchEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }
    setShowProfileMenu(false);
  };

  // Función para manejar la imagen de perfil de manera segura
  const getProfileImage = () => {
    // Si tenemos la imagen en la sesión y no hay error, usarla
    if (!avatarError && session?.user?.image) {
      try {
        // Asegurar que la URL sea segura para diferentes formatos
        let imageUrl = session.user.image;
        
        // Corregir URL de Google
        if (imageUrl.includes('googleusercontent.com')) {
          // Obtener la URL base sin parámetros
          const baseUrl = imageUrl.split('=')[0];
          // Añadir parámetro para tamaño y recorte
          imageUrl = `${baseUrl}=s96-c`;
          
          // Guardar la URL en localStorage para usarla como respaldo
          localStorage.setItem('userProfileImage', imageUrl);
        }
        
        return (
          <Avatar 
            src={imageUrl} 
            alt={session.user.name || "Usuario"}
            sx={{ 
              width: 32, 
              height: 32,
              border: '2px solid',
              borderColor: 'primary.main',
              boxShadow: '0 0 0 2px rgba(101, 52, 172, 0.1)'
            }}
            imgProps={{
              referrerPolicy: "no-referrer",
              crossOrigin: "anonymous",
              loading: "eager",
              onError: () => {
                setAvatarError(true);
              }
            }}
          />
        );
      } catch (error) {
        setAvatarError(true);
      }
    }
    
    // Intentar usar la imagen guardada en localStorage si está disponible
    const cachedImage = localStorage.getItem('userProfileImage');
    if (cachedImage && !avatarError) {
      return (
        <Avatar 
          src={cachedImage} 
          alt={session?.user?.name || "Usuario"}
          sx={{ 
            width: 32, 
            height: 32,
            border: '2px solid',
            borderColor: 'primary.main',
            boxShadow: '0 0 0 2px rgba(101, 52, 172, 0.1)'
          }}
          imgProps={{
            referrerPolicy: "no-referrer",
            crossOrigin: "anonymous",
            loading: "eager",
            onError: () => {
              setAvatarError(true);
              // Limpiar caché si hay error
              localStorage.removeItem('userProfileImage');
            }
          }}
        />
      );
    }
    
    // Si todo falla, mostrar icono por defecto
    return <PersonOutlineOutlinedIcon />;
  };

  // Obtener datos del usuario para mostrar en la UI
  const userName = session?.user?.name || 'Usuario';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image;
  const isAuthenticated = status === 'authenticated';

  // Manejar evento de tecla para el menú de perfil
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowProfileMenu(false);
    }
  };

  // Manejar cierre de sesión
  const handleLogout = async () => {
    try {
      await signOut({ redirect: true, callbackUrl: '/' });
    } catch (error) {
      // En caso de error forzar redirección
      window.location.href = '/';
    }
  };

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          bgcolor: mode === 'dark' 
            ? alpha('#000000', 0.9) 
            : alpha('#ffffff', 0.9),
          backdropFilter: 'blur(8px)',
          borderBottom: 1, 
          borderColor: 'divider',
          boxShadow: 'none',
          color: 'text.primary'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ height: 70 }}>
            {/* Logo - Versión escritorio */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 2 }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                <Image
                  src="/logo.png"
                  alt="Klosync Logo"
                  width={36}
                  height={36}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </Link>
            </Box>
            
            {/* Título - Versión escritorio */}
            <Typography
              variant="h6"
              noWrap
              component={Link}
              href="/"
              sx={{
                mr: 4,
                display: { xs: 'none', md: 'flex' },
                fontWeight: 700,
                background: mode === 'dark' 
                  ? 'linear-gradient(90deg, #8c5fd0 0%, #6534ac 100%)' 
                  : 'linear-gradient(90deg, #6534ac 0%, #8c5fd0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}
            >
              Klosync
            </Typography>

            {/* Menú móvil */}
            <Box sx={{ flexGrow: 0, display: { xs: 'flex', md: 'none' }, mr: 1 }}>
              <IconButton
                size="medium"
                aria-label="menu de navegación"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                sx={{ 
                  bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                  '&:hover': {
                    bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{ 
                  display: { xs: 'block', md: 'none' },
                  '& .MuiPaper-root': {
                    borderRadius: 2,
                    mt: 1.5,
                    boxShadow: 3,
                    minWidth: 180,
                    overflow: 'visible',
                    '&:before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      left: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  }
                }}
              >
                {pages.map((page) => (
                  page.name === 'Sync Tools' ? (
                    <Box key={page.name}>
                      <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
                        Sync Tools
                      </Typography>
                      {proyectosMenuItems.map((item) => (
                        <Link key={item.name} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <MenuItem 
                            selected={pathname === item.href || (item.href === '/proyectos' && pathname === '/proyectos')}
                            onClick={handleCloseNavMenu}
                            sx={{ 
                              borderRadius: 1,
                              mx: 0.5,
                              my: 0.2,
                              pl: 4,
                              '&.Mui-selected': {
                                bgcolor: mode === 'dark' 
                                  ? alpha('#6534ac', 0.15)
                                  : alpha('#6534ac', 0.08),
                                color: 'primary.main',
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.name} />
                          </MenuItem>
                        </Link>
                      ))}
                    </Box>
                  ) : (
                    <Link key={page.name} href={page.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <MenuItem 
                        selected={pathname === page.href}
                        onClick={handleCloseNavMenu}
                        sx={{ 
                          borderRadius: 1,
                          mx: 0.5,
                          my: 0.3,
                          '&.Mui-selected': {
                            bgcolor: mode === 'dark' 
                              ? alpha('#6534ac', 0.15)
                              : alpha('#6534ac', 0.08),
                            color: 'primary.main',
                          }
                        }}
                      >
                        <ListItemIcon>
                          {React.cloneElement(page.icon, { 
                            color: pathname === page.href ? "primary" : "inherit" 
                          })}
                        </ListItemIcon>
                        <ListItemText>{page.name}</ListItemText>
                      </MenuItem>
                    </Link>
                  )
                ))}
              </Menu>
            </Box>
            
            {/* Logo - Versión móvil */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', mr: 1 }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                <Image
                  src="/logo.png"
                  alt="Klosync Logo"
                  width={32}
                  height={32}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </Link>
            </Box>
            
            {/* Título - Versión móvil */}
            <Typography
              variant="h6"
              noWrap
              component={Link}
              href="/"
              sx={{
                flexGrow: 1,
                display: { xs: 'flex', md: 'none' },
                fontWeight: 700,
                background: mode === 'dark' 
                  ? 'linear-gradient(90deg, #8c5fd0 0%, #6534ac 100%)' 
                  : 'linear-gradient(90deg, #6534ac 0%, #8c5fd0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textDecoration: 'none',
                textTransform: 'uppercase',
              }}
            >
              Klosync
            </Typography>
            
            {/* Botones de navegación - Versión escritorio */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {pages.map((page) => {
                const isProyectos = page.name === 'Sync Tools';
                const isProyectosActive = pathname.startsWith('/proyectos') || pathname.startsWith('/excel') || pathname === '/explorer';
                if (isProyectos) {
                  return (
                    <Box key={page.name}>
                      <Button
                        startIcon={page.icon}
                        endIcon={<KeyboardArrowDownIcon fontSize="small" />}
                        onClick={handleOpenProyectosMenu}
                        sx={{
                          my: 2,
                          mx: 0.5,
                          color: isProyectosActive ? 'primary.main' : 'text.secondary',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 500,
                          px: 2,
                          '&:hover': {
                            bgcolor: mode === 'dark' 
                              ? alpha('#6534ac', 0.15)
                              : alpha('#6534ac', 0.08),
                          },
                          ...(isProyectosActive && {
                            bgcolor: mode === 'dark' 
                              ? alpha('#6534ac', 0.2)
                              : alpha('#6534ac', 0.1),
                          })
                        }}
                      >
                        {page.name}
                      </Button>
                      <Menu
                        anchorEl={anchorElProyectos}
                        open={Boolean(anchorElProyectos)}
                        onClose={handleCloseProyectosMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        slotProps={{
                          paper: {
                            sx: {
                              borderRadius: 2,
                              mt: 1.5,
                              boxShadow: 3,
                              minWidth: 220,
                            }
                          }
                        }}
                      >
                        {proyectosMenuItems.map((item) => (
                          <MenuItem
                            key={item.name}
                            onClick={() => handleProyectosNavigation(item.href)}
                            selected={pathname === item.href || (item.href === '/proyectos' && pathname === '/proyectos')}
                            sx={{ py: 1.5 }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.name} />
                          </MenuItem>
                        ))}
                      </Menu>
                    </Box>
                  );
                }
                return (
                  <Link key={page.name} href={page.href} style={{ textDecoration: 'none' }}>
                    <Button
                      startIcon={page.icon}
                      sx={{
                        my: 2,
                        mx: 0.5,
                        color: pathname === page.href ? 'primary.main' : 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 2,
                        '&:hover': {
                          bgcolor: mode === 'dark' 
                            ? alpha('#6534ac', 0.15)
                            : alpha('#6534ac', 0.08),
                        },
                        ...(pathname === page.href && {
                          bgcolor: mode === 'dark' 
                            ? alpha('#6534ac', 0.2)
                            : alpha('#6534ac', 0.1),
                        })
                      }}
                    >
                      {page.name}
                    </Button>
                  </Link>
                );
              })}
            </Box>

            {/* Sección derecha: Theme Toggle y Avatar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ThemeToggleButton />
              
              <Chip 
                label="Pro"
                size="small"
                color="warning"
                sx={{ 
                  height: 24, 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold',
                  mr: 1,
                  display: { xs: 'none', sm: 'flex' }
                }}
              />
              
              <Tooltip title="Abrir configuración">
                <IconButton 
                  onClick={handleOpenUserMenu} 
                  sx={{ 
                    p: 0.5,
                    border: '1px solid',
                    borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    borderRadius: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color="success"
                  >
                    {getProfileImage()}
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Menu
                sx={{ 
                  mt: 1.5,
                  '& .MuiPaper-root': {
                    borderRadius: 2,
                    minWidth: 200,
                    boxShadow: 3,
                    overflow: 'visible',
                    '&:before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  }
                }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight="bold" noWrap>
                    {userName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {userEmail}
                  </Typography>
                  
                  {/* Mostrar diagnóstico de sesión si hay problemas */}
                  {!isAuthenticated && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1, fontSize: '0.7rem' }}>
                      <Typography variant="caption" color="warning.dark">
                        Sesión incompleta detectada
                      </Typography>
                      <Button 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                        fullWidth 
                        sx={{ mt: 1, fontSize: '0.7rem' }}
                        onClick={handleLogout}
                      >
                        Cerrar sesión
                      </Button>
                    </Box>
                  )}
                </Box>
                
                <Divider />
                
                {userMenuItems.map((item) => (
                  <Link key={item.name} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <MenuItem 
                      sx={{ 
                        borderRadius: 1,
                        mx: 0.5,
                        my: 0.3
                      }}
                    >
                      <ListItemIcon>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText>{item.name}</ListItemText>
                    </MenuItem>
                  </Link>
                ))}
                
                <Divider />
                
                <MenuItem 
                  onClick={() => {
                    handleCloseUserMenu();
                    handleLogout();
                  }}
                  sx={{ 
                    borderRadius: 1,
                    mx: 0.5,
                    my: 0.3,
                    color: 'error.main'
                  }}
                >
                  <ListItemIcon>
                    <LogoutOutlinedIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>Cerrar sesión</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      {/* Espacio para compensar el header fijo */}
      <Toolbar sx={{ height: 70 }} />
    </>
  );
} 