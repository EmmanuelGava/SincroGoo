"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Container, Typography, Button, Box, TextField, CircularProgress, Stack } from '@mui/material'
import { toast } from 'sonner'
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema'
import ListaProyectos from '@/app/proyectos/componentes/ListaProyectos'

// Definir tipo Proyecto directamente
interface Proyecto {
  id: string;
  usuario_id: string;
  nombre: string;
  descripcion: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  sheets_id: string | null;
  slides_id: string | null;
  hojastitulo: string | null;
  presentaciontitulo: string | null;
}

export default function PaginaProyectos() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  // Redirigir si no hay sesión
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Cargar proyectos cuando tengamos una sesión válida
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      console.log('✅ [Proyectos] Sesión autenticada, cargando proyectos');
      cargarProyectos();
    } else if (status === 'authenticated' && !session?.user?.email) {
      console.warn('⚠️ [Proyectos] Sesión autenticada pero sin email');
      setError('Sesión incompleta - por favor inicia sesión de nuevo');
      setCargando(false);
    } else if (status === 'loading') {
      console.log('⏳ [Proyectos] Cargando sesión...');
    } else {
      console.log('❌ [Proyectos] No hay sesión');
      setError('No hay sesión activa');
      setCargando(false);
    }
  }, [status, session]);

  const cargarProyectos = async () => {
    try {
      console.log('🔍 [Proyectos] Cargando proyectos');
      
      if (!session?.user?.email) {
        throw new Error('No hay un usuario autenticado');
      }
      
      // Obtener el ID del usuario de Google de la sesión
      const auth_id = session.user.id;
      const email = session.user.email;
      const nombre = session.user.name;
      
      console.log(`🔑 [Proyectos] ID de Google: ${auth_id}`);
      
      if (!auth_id) {
        throw new Error('ID de Google no disponible en sesión');
      }
      
      // Verificar/crear usuario en Supabase con el nuevo endpoint
      console.log(`🔍 [Proyectos] Verificando usuario en Supabase para auth_id: ${auth_id}`);
      
      const verifyUrl = `/api/supabase/users/verify?auth_id=${encodeURIComponent(auth_id)}&email=${encodeURIComponent(email || '')}&nombre=${encodeURIComponent(nombre || '')}`;
      
      const verifyResponse = await fetch(verifyUrl);
      
      if (!verifyResponse.ok) {
        const verifyError = await verifyResponse.json();
        throw new Error(verifyError.error || 'Error al verificar usuario');
      }
      
      const verifyData = await verifyResponse.json();
      
      if (!verifyData.user || !verifyData.user.id) {
        throw new Error('La respuesta del servidor no incluyó el ID del usuario');
      }
      
      const usuario_id = verifyData.user.id;
      
      if (verifyData.created) {
        console.log(`🆕 [Proyectos] Usuario creado con ID: ${usuario_id}`);
      } else {
        console.log(`✅ [Proyectos] Usuario verificado con ID: ${usuario_id}`);
      }
      
      // Obtener proyectos desde el endpoint con el UUID del usuario
      const response = await fetch(`/api/supabase/projects?usuario_id=${encodeURIComponent(usuario_id)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cargar proyectos');
      }
      
      const data = await response.json();
      console.log(`✅ [Proyectos] Proyectos cargados: ${data.projects?.length || 0}`);
      
      // Mapear los datos al formato esperado
      const proyectosMapeados = (data.projects || []).map((p: any) => ({
        id: p.id,
        usuario_id: p.usuario_id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        fecha_creacion: p.created_at,
        fecha_actualizacion: p.updated_at,
        sheets_id: p.hoja_calculo_id,
        slides_id: p.presentacion_id,
        hojastitulo: p.metadata?.hojastitulo || null,
        presentaciontitulo: p.metadata?.presentaciontitulo || null
      }));
      
      setProyectos(proyectosMapeados);
      setError(null);
      setCargando(false);
    } catch (error) {
      console.error('❌ [Proyectos] Error cargando proyectos:', error);
      setError('Error al cargar proyectos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
      setCargando(false);
      toast.error('Error al cargar los proyectos');
    }
  };

  const crearNuevoProyecto = () => {
    router.push('/proyectos/nuevo')
  }

  const proyectosFiltrados = proyectos.filter(proyecto =>
    proyecto.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
    proyecto.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (status === 'loading') {
    return (
      <>
        <EncabezadoSistema />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <>
        <EncabezadoSistema />
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <Typography variant="h5" color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => router.push('/auth/signin')}
          >
            Iniciar Sesión
          </Button>
        </Box>
      </>
    );
  }

  return (
    <>
      <EncabezadoSistema />
      <Box component="main" sx={{ pb: 10 }}>
        <Container>
          <Stack 
            direction={{ xs: 'column', md: 'row' }} 
            alignItems={{ xs: 'stretch', md: 'center' }} 
            justifyContent="space-between" 
            spacing={2} 
            sx={{ mb: 3, py: 2 }}
          >
            <Typography variant="h4" fontWeight="bold">
              Mis Proyectos
            </Typography>
            
            <Stack direction="row" spacing={1}>
              <TextField
                placeholder="Buscar proyectos..."
                size="small"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                sx={{ minWidth: 200 }}
              />
              <Button
                variant="contained"
                onClick={crearNuevoProyecto}
                color="primary"
              >
                Nuevo Proyecto
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: 2,
            boxShadow: 1
          }}>
            <ListaProyectos
              proyectos={proyectosFiltrados}
              cargando={cargando}
              busqueda={busqueda}
            />
          </Box>
        </Container>
      </Box>
    </>
  )
}