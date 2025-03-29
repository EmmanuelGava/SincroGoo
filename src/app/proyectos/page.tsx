"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { redirect } from "next/navigation"
import { toast } from "sonner"

// Material UI
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import { InputAdornment } from '@mui/material'
import { Grid, Card, CardContent, CardActions } from '@mui/material'

// Componentes propios
import { EncabezadoSitio } from "@/app/componentes/EncabezadoSitio"
import { EncabezadoSistema } from "@/app/componentes/EncabezadoSistema"
import { BotonPrincipal } from '@/app/componentes/BotonPrincipal'
import { ListaProyectos } from '@/app/componentes/proyectos/ListaProyectos'

// Servicios
import { ProyectosService, Proyecto } from "@/app/servicios/supabase/tablas/proyectos-service"
import { authService } from "@/app/servicios/supabase/globales/auth-service"

export default function PaginaProyectos() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [usuarioSupabase, setUsuarioSupabase] = useState<any | null>(null)

  useEffect(() => {
    if (status === "loading") return;
    
    // Redirigir a login si no está autenticado
    if (status === "unauthenticated") {
      redirect("/auth/login");
    }
    
    // Si el usuario está autenticado, sincronizar con Supabase
    if (status === "authenticated" && session && session.user) {
      console.log('Usuario autenticado:', session.user.email);
      
      // Obtener el ID del usuario de la sesión o de los metadatos
      const userId = session.user.id || (session.user as any).sub;
      
      if (!userId) {
        console.log('⚠️ No se encontró ID en session.user, intentando obtener de session directamente');
        console.log('Datos de sesión:', JSON.stringify(session, null, 2));
        
        // Intentar obtener el ID del proveedor desde la sesión completa
        // Esto es un fallback por si acaso la estructura de la sesión cambia
        const sessionAny = session as any;
        const fallbackId = sessionAny.sub || sessionAny.providerAccountId;
        
        if (fallbackId) {
          console.log('ID alternativo encontrado:', fallbackId);
          
          // Sincronizar usuario con Supabase usando el ID alternativo
          const userWithId = { ...session.user, id: fallbackId };
          authService.sincronizarUsuario(userWithId).then(usuario => {
            if (usuario) {
              console.log('Usuario sincronizado correctamente con ID alternativo:', usuario.email, 'con ID:', usuario.userid);
              setUsuarioSupabase(usuario);
              cargarProyectos(usuario.userid);
            } else {
              setError('Error de sincronización: No se pudo sincronizar el usuario con Supabase');
              setCargando(false);
            }
          }).catch(error => {
            console.error('Error al sincronizar usuario:', error);
            setError('Error de sincronización: ' + (error.message || 'Error desconocido'));
            setCargando(false);
          });
          return;
        }
        
        setError('Error de autenticación: No se pudo obtener un ID de usuario válido');
        setCargando(false);
        return;
      }
      
      console.log('ID de usuario encontrado en sesión:', userId);
      
      // Sincronizar usuario con Supabase
      authService.sincronizarUsuario(session.user).then(usuario => {
        if (usuario) {
          console.log('Usuario sincronizado correctamente:', usuario.email, 'con ID:', usuario.userid);
          setUsuarioSupabase(usuario);
          cargarProyectos(usuario.userid);
        } else {
          console.error('Error: No se pudo sincronizar el usuario con Supabase');
          setError('Error de sincronización: No se pudo sincronizar el usuario con Supabase');
          setCargando(false);
        }
      }).catch(error => {
        console.error('Error al sincronizar usuario:', error);
        setError('Error de sincronización: ' + (error.message || 'Error desconocido'));
        setCargando(false);
      });
    }
  }, [status, session])

  const cargarProyectos = async (userId: string) => {
    try {
      setCargando(true);
      console.log('🔄 Cargando proyectos para el usuario:', userId);
      const proyectos = await ProyectosService.listarProyectos(userId);
      setProyectos(proyectos);
      console.log('✅ Proyectos cargados:', proyectos);
    } catch (error) {
      console.error('❌ Error al cargar proyectos:', error);
      setError('Error al cargar los proyectos');
    } finally {
      setCargando(false);
    }
  };

  const proyectosFiltrados = proyectos.filter(proyecto => 
    proyecto.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
    proyecto.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  )
  
  const crearNuevoProyecto = () => {
    router.push("/proyectos/nuevo")
  }

  const crearProyectoPrueba = async () => {
    const email = session?.user?.email;
    if (typeof email !== 'string') {
      toast.error("Necesitas iniciar sesión para crear un proyecto");
      return;
    }

    const proyectoPrueba = {
      usuario_id: email,
      titulo: `Proyecto de prueba ${new Date().toLocaleString()}`,
      descripcion: "Este es un proyecto de prueba",
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString()
    };

    try {
      const proyectoId = await ProyectosService.crearProyecto(proyectoPrueba);
      if (proyectoId) {
        toast.success("Proyecto de prueba creado correctamente");
        await cargarProyectos(email);
      } else {
        toast.error("Error al crear el proyecto de prueba");
      }
    } catch (error) {
      console.error('❌ Error al crear proyecto de prueba:', error);
      toast.error("Error al crear el proyecto de prueba");
    }
  };

  if (cargando && proyectos.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <EncabezadoSistema />
      
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 4, py: 8 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: "bold" }}>Mis Proyectos</Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button 
              variant="outlined"
              onClick={() => cargarProyectos(usuarioSupabase?.id)}
              disabled={cargando}
            >
              {cargando ? <CircularProgress size={16} /> : null}
              Recargar
            </Button>
            <Button
              variant="outlined"
              onClick={crearProyectoPrueba}
              disabled={cargando}
            >
              Crear Proyecto Prueba
            </Button>
            <BotonPrincipal 
              onClick={crearNuevoProyecto}
              startIcon={<AddOutlinedIcon />}
              size="large"
            >
              Nuevo Proyecto
            </BotonPrincipal>
          </Box>
        </Box>
        
        <Box sx={{ mb: 6 }}>
          <TextField
            type="text"
            placeholder="Buscar proyectos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            sx={{ 
              maxWidth: '400px',
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                fontSize: '0.9rem'
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </InputAdornment>
              )
            }}
          />
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 6 }}>
            {error}
          </Alert>
        )}
        
        {proyectos.length === 0 && !cargando && !error && (
          <Box sx={{ mb: 6, display: "flex", flexDirection: "column", gap: 6 }}>
            <Alert severity="info">
              No se encontraron proyectos. Puedes crear un nuevo proyecto usando el botón "Nuevo Proyecto".
            </Alert>
            
            {/* Tarjeta para crear nuevo proyecto */}
            <Box sx={{ border: "1px dashed", borderColor: "primary.30", p: 6, bgcolor: "primary.5" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h5">Crear tu primer proyecto</Typography>
                <Typography>Comienza a sincronizar tus hojas de cálculo con presentaciones</Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 4, mt: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Box component="span" sx={{ fontSize: 24, color: 'green' }}>&#128196;</Box>
                  <Box>
                    <Typography variant="h6">Hojas de cálculo</Typography>
                    <Typography>Conecta tus datos desde Google Sheets</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Box component="span" sx={{ fontSize: 24, color: 'pink' }}>&#128197;</Box>
                  <Box>
                    <Typography variant="h6">Presentaciones</Typography>
                    <Typography>Visualiza tus datos en Google Slides</Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <BotonPrincipal 
                  onClick={crearNuevoProyecto}
                  startIcon={<AddOutlinedIcon />}
                  size="large"
                >
                  Crear Nuevo Proyecto
                </BotonPrincipal>
              </Box>
            </Box>
          </Box>
        )}
        
        <Grid container spacing={3}>
          {proyectosFiltrados.map((proyecto) => (
            <Grid item xs={12} sm={6} md={4} key={proyecto.id}>
              <Card className="h-full">
                <CardContent>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {proyecto.titulo}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" component="p">
                    {proyecto.descripcion || "Sin descripción"}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block" marginTop={1}>
                    Creado: {new Date(proyecto.creado_en).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => router.push(`/proyectos/${proyecto.id}`)}
                  >
                    Ver Detalles
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}