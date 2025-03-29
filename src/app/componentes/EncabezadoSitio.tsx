"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, signIn, useSession } from "next-auth/react"
import { 
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Fade,
  Chip,
  Badge,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import Image from "next/image"
import { useThemeMode } from "@/app/lib/theme"
import { ThemeToggleButton } from "./ThemeToggleButton"
import { useRouter } from "next/navigation"

// Componente estilizado para los botones de navegación
const NavButton = styled(Button)(({ theme }) => ({
  textTransform: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  marginRight: theme.spacing(1.5),
  color: theme.palette.text.secondary,
  fontWeight: 500,
  letterSpacing: '0.01em',
  transition: 'all 0.2s ease-in-out',
  '&.active': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.primary.main, 0.15)
      : alpha(theme.palette.primary.main, 0.08),
    color: theme.palette.primary.main,
  },
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.primary.main, 0.1)
      : alpha(theme.palette.primary.main, 0.05),
    transform: 'translateY(-1px)',
  }
}));

// Componente estilizado para el logo
const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)',
  }
}));

export function EncabezadoSitio() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { mode } = useThemeMode()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [avatarError, setAvatarError] = useState(false)
  const router = useRouter()
  
  // Redirigir a dashboard si el usuario está autenticado y está en la ruta principal
  useEffect(() => {
    if (session && pathname === "/") {
      router.push("/dashboard")
    }
  }, [session, pathname, router])

  // Estado para el menú de usuario
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  
  // Estado para el menú móvil
  const [mobileAnchorEl, setMobileAnchorEl] = useState<null | HTMLElement>(null)
  const mobileMenuOpen = Boolean(mobileAnchorEl)

  const isHome = pathname === "/"
  const isAuthenticated = !!session

  // Función para manejar la imagen de perfil de manera segura
  const getProfileImage = () => {
    if (avatarError || !session?.user?.image) {
      return <PersonOutlineOutlinedIcon />
    }
    
    return (
      <Avatar 
        src={session.user.image} 
        alt={session.user.name || "Usuario"} 
        sx={{ 
          width: 32, 
          height: 32,
          border: '2px solid',
          borderColor: 'primary.main',
          boxShadow: '0 0 0 2px rgba(101, 52, 172, 0.1)'
        }}
        imgProps={{
          onError: () => setAvatarError(true)
        }}
      />
    )
  }
  
  // Manejadores para el menú de usuario
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleCloseUserMenu = () => {
    setAnchorEl(null)
  }
  
  // Manejadores para el menú móvil
  const handleOpenMobileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMobileAnchorEl(event.currentTarget)
  }
  
  const handleCloseMobileMenu = () => {
    setMobileAnchorEl(null)
  }

  // Función para acceder directamente en modo desarrollo
  const accederDirecto = () => {
    router.push("/proyectos")
  }

  return (
    <>
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          py: theme.spacing(1),
          bgcolor: mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
          borderBottom: '1px solid',
          borderColor: mode === 'dark' 
            ? theme.palette.divider
            : theme.palette.grey[200],
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ height: 70 }}>
            {/* Logo */}
            <LogoContainer sx={{ mr: 2 }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                <Image
                  src="/logo.png"
                  alt="SincroGoo Logo"
                  width={36}
                  height={36}
                  style={{ height: 36, width: 'auto' }}
                  priority
                />
              </Link>
            </LogoContainer>

            {/* Navegación de escritorio */}
            {!isMobile && (
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', ml: 2 }}>
                <Typography 
                  variant="h6" 
                  component="div" 
                  sx={{ 
                    mr: 4,
                    fontWeight: 700,
                    background: mode === 'dark' 
                      ? 'linear-gradient(90deg, #8c5fd0 0%, #6534ac 100%)' 
                      : 'linear-gradient(90deg, #6534ac 0%, #8c5fd0 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  SincroGoo
                </Typography>
                
                {isHome && (
                  <>
                    <Link href="#features">
                      <NavButton 
                        startIcon={<SlideshowOutlinedIcon />}
                      >
                        Características
                      </NavButton>
                    </Link>
                    
                    <Link href="#pricing">
                      <NavButton 
                        startIcon={<TableChartOutlinedIcon />}
                      >
                        Planes
                      </NavButton>
                    </Link>
                  </>
                )}
              </Box>
            )}
            
            {/* Título o Navegación principal */}
            {isMobile ? (
              <>
                <Box sx={{ flexGrow: 1 }} />
                
                {isAuthenticated && (
                  <IconButton
                    color="inherit"
                    aria-label="menu"
                    onClick={handleOpenMobileMenu}
                    sx={{ 
                      mr: 1,
                      bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                      '&:hover': {
                        bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                      },
                    }}
                  >
                    <MenuOutlinedIcon />
                  </IconButton>
                )}
                
                <Menu
                  anchorEl={mobileAnchorEl}
                  open={mobileMenuOpen}
                  onClose={handleCloseMobileMenu}
                  TransitionComponent={Fade}
                  PaperProps={{
                    elevation: 3,
                    sx: { 
                      mt: 1.5,
                      minWidth: 200,
                      borderRadius: 2,
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
                >
                  <MenuItem 
                    onClick={() => {
                      handleCloseMobileMenu()
                      router.push("/proyectos")
                    }}
                    selected={pathname === "/proyectos"}
                    sx={{ 
                      borderRadius: 1,
                      mx: 0.5,
                      my: 0.3,
                      '&.Mui-selected': {
                        bgcolor: mode === 'dark' 
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main',
                      }
                    }}
                  >
                    <ListItemIcon>
                      <DashboardOutlinedIcon fontSize="small" color={pathname === "/proyectos" ? "primary" : "inherit"} />
                    </ListItemIcon>
                    <ListItemText>Proyectos</ListItemText>
                  </MenuItem>
                  
                  <MenuItem 
                    onClick={() => {
                      handleCloseMobileMenu()
                      router.push("/src/presentaciones")
                    }}
                    selected={pathname === "/src/presentaciones"}
                    sx={{ 
                      borderRadius: 1,
                      mx: 0.5,
                      my: 0.3,
                      '&.Mui-selected': {
                        bgcolor: mode === 'dark' 
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main',
                      }
                    }}
                  >
                    <ListItemIcon>
                      <SlideshowOutlinedIcon fontSize="small" color={pathname === "/src/presentaciones" ? "primary" : "inherit"} />
                    </ListItemIcon>
                    <ListItemText>Presentaciones</ListItemText>
                  </MenuItem>
                  
                  <MenuItem 
                    onClick={() => {
                      handleCloseMobileMenu()
                      router.push("/src/hojas-de-calculo")
                    }}
                    selected={pathname === "/src/hojas-de-calculo"}
                    sx={{ 
                      borderRadius: 1,
                      mx: 0.5,
                      my: 0.3,
                      '&.Mui-selected': {
                        bgcolor: mode === 'dark' 
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main',
                      }
                    }}
                  >
                    <ListItemIcon>
                      <TableChartOutlinedIcon fontSize="small" color={pathname === "/src/hojas-de-calculo" ? "primary" : "inherit"} />
                    </ListItemIcon>
                    <ListItemText>Hojas</ListItemText>
                  </MenuItem>

                  <Divider sx={{ my: 1 }} />

                  <MenuItem 
                    onClick={() => {
                      handleCloseMobileMenu()
                      signOut({ 
                        callbackUrl: '/',
                        redirect: true
                      })
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
              </>
            ) : (
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: isAuthenticated ? 'flex-start' : 'center' }}>
                {!isAuthenticated ? (
                  <Box sx={{ flexGrow: 1 }} />
                ) : (
                  <Box sx={{ display: 'flex' }}>
                    <Box component={Link} href="/proyectos" sx={{ textDecoration: 'none' }}>
                      <NavButton 
                        className={pathname === "/proyectos" ? "active" : ""}
                        startIcon={<DashboardOutlinedIcon />}
                      >
                        Proyectos
                      </NavButton>
                    </Box>
                    
                    <Box component={Link} href="/src/presentaciones" sx={{ textDecoration: 'none' }}>
                      <NavButton 
                        className={pathname === "/src/presentaciones" ? "active" : ""}
                        startIcon={<SlideshowOutlinedIcon />}
                      >
                        Presentaciones
                      </NavButton>
                    </Box>
                    
                    <Box component={Link} href="/src/hojas-de-calculo" sx={{ textDecoration: 'none' }}>
                      <NavButton 
                        className={pathname === "/src/hojas-de-calculo" ? "active" : ""}
                        startIcon={<TableChartOutlinedIcon />}
                      >
                        Hojas
                      </NavButton>
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {/* Botones de la derecha */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ThemeToggleButton />
              
              {!isAuthenticated ? (
                <Button 
                  variant="contained"
                  color="primary"
                  onClick={() => signIn("google")}
                  sx={{ 
                    ml: 2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: mode === 'dark' ? '0 0 10px rgba(140, 95, 208, 0.3)' : '0 2px 10px rgba(101, 52, 172, 0.2)',
                    '&:hover': {
                      boxShadow: mode === 'dark' ? '0 0 15px rgba(140, 95, 208, 0.4)' : '0 4px 15px rgba(101, 52, 172, 0.3)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  Iniciar sesión
                </Button>
              ) : (
                <>
                  <IconButton
                    onClick={handleOpenUserMenu}
                    sx={{ 
                      ml: { xs: 1, sm: 2 },
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
                  
                  <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleCloseUserMenu}
                    TransitionComponent={Fade}
                    PaperProps={{
                      elevation: 3,
                      sx: { 
                        mt: 1.5,
                        minWidth: 200,
                        borderRadius: 2,
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
                  >
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {session.user?.name || "Usuario"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {session.user?.email || ""}
                      </Typography>
                    </Box>
                    
                    <Divider />
                    
                    <MenuItem onClick={() => {
                      handleCloseUserMenu()
                      router.push("/src/perfil")
                    }}
                    sx={{ 
                      borderRadius: 1,
                      mx: 0.5,
                      my: 0.3
                    }}>
                      <ListItemIcon>
                        <PersonOutlineOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Perfil</ListItemText>
                    </MenuItem>
                    
                    <MenuItem onClick={() => {
                      handleCloseUserMenu()
                      router.push("/src/configuracion")
                    }}
                    sx={{ 
                      borderRadius: 1,
                      mx: 0.5,
                      my: 0.3
                    }}>
                      <ListItemIcon>
                        <SettingsOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Configuración</ListItemText>
                    </MenuItem>
                    
                    <Divider />
                    
                    <MenuItem onClick={() => {
                      handleCloseUserMenu()
                      signOut({ 
                        callbackUrl: '/',
                        redirect: true
                      })
                    }}
                    sx={{ 
                      borderRadius: 1,
                      mx: 0.5,
                      my: 0.3,
                      color: 'error.main'
                    }}>
                      <ListItemIcon>
                        <LogoutOutlinedIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText>Cerrar sesión</ListItemText>
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      {/* Espacio para compensar el header fijo */}
      <Toolbar sx={{ height: 70 }} />
    </>
  )
} 