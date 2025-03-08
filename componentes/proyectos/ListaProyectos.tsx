"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileIcon, MoreHorizontal, Calendar, Clock, Edit, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Proyecto {
  id: string;
  nombre: string;
  sheetsId: string;
  slidesId: string;
  fechaCreacion: string;
  ultimaModificacion: string;
  hojasTitulo?: string;
  presentacionTitulo?: string;
  userId?: string;
}

export function ListaProyectos() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const cargarProyectos = async () => {
      try {
        setCargando(true);
        
        // Cargar proyectos del localStorage primero
        const proyectosLocales = JSON.parse(localStorage.getItem('proyectos') || '[]');
        
        if (session?.user?.email) {
          // Si hay sesión, intentar cargar del servidor
          const { data: proyectosServidor, error } = await supabase
            .from('proyectos')
            .select('*')
            .eq('userId', session.user.email)
            .order('ultimaModificacion', { ascending: false });

          if (error) {
            console.error('Error al cargar proyectos:', error);
            toast.error('Error al cargar los proyectos del servidor');
          } else if (proyectosServidor) {
            // Combinar proyectos del servidor con los locales
            const proyectosCombinados = [...proyectosServidor];
            
            // Agregar proyectos locales que no estén en el servidor
            const proyectosParaSincronizar: Proyecto[] = [];
            proyectosLocales.forEach((proyectoLocal: Proyecto) => {
              if (!proyectosServidor.some(p => p.id === proyectoLocal.id)) {
                const proyectoConUsuario = {
                  ...proyectoLocal,
                  userId: session.user?.email || undefined
                };
                proyectosCombinados.push(proyectoConUsuario);
                proyectosParaSincronizar.push(proyectoConUsuario);
              }
            });

            // Actualizar localStorage y estado
            localStorage.setItem('proyectos', JSON.stringify(proyectosCombinados));
            setProyectos(proyectosCombinados);

            // Sincronizar proyectos locales con el servidor
            if (proyectosParaSincronizar.length > 0) {
              console.log('Sincronizando proyectos con el servidor:', proyectosParaSincronizar);
              const { error: syncError } = await supabase
                .from('proyectos')
                .upsert(proyectosParaSincronizar);

              if (syncError) {
                console.error('Error al sincronizar proyectos:', syncError);
                toast.error('Error al sincronizar algunos proyectos');
              } else {
                console.log('Proyectos sincronizados correctamente');
                toast.success('Proyectos sincronizados con el servidor');
              }
            }

            return;
          }
        }

        // Si no hay sesión o hubo error, usar solo los proyectos locales
        setProyectos(proyectosLocales);
      } catch (error) {
        console.error('Error al cargar proyectos:', error);
        toast.error('Error al cargar los proyectos');
        
        // En caso de error, intentar usar datos locales
        const proyectosGuardados = localStorage.getItem('proyectos');
        if (proyectosGuardados) {
          setProyectos(JSON.parse(proyectosGuardados));
        }
      } finally {
        setCargando(false);
      }
    };

    cargarProyectos();
  }, [session]);

  const abrirProyecto = async (proyecto: Proyecto) => {
    try {
      // Guardar el proyecto actual en localStorage
      localStorage.setItem('connectedSheets', proyecto.sheetsId);
      localStorage.setItem('connectedSlides', proyecto.slidesId);
      localStorage.setItem('projectName', proyecto.nombre);
      localStorage.setItem('proyectoActual', proyecto.id);
      
      // Actualizar la fecha de última modificación
      const fechaActual = new Date().toISOString();
      const proyectosActualizados = proyectos.map(p => 
        p.id === proyecto.id 
          ? { ...p, ultimaModificacion: fechaActual } 
          : p
      );
      
      // Actualizar localStorage y estado
      localStorage.setItem('proyectos', JSON.stringify(proyectosActualizados));
      setProyectos(proyectosActualizados);

      // Si hay sesión, actualizar en Supabase
      if (session?.user?.email) {
        const { error } = await supabase
          .from('proyectos')
          .update({ ultimaModificacion: fechaActual })
          .eq('id', proyecto.id);

        if (error) {
          console.error('Error al actualizar proyecto:', error);
          toast.error('Error al actualizar el proyecto');
        }
      }
      
      // Redirigir a la página de presentaciones
      router.push('/presentaciones');
    } catch (error) {
      console.error('Error al abrir proyecto:', error);
      toast.error('Error al abrir el proyecto');
    }
  };

  const eliminarProyecto = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
      try {
        // Eliminar del estado y localStorage
        const proyectosFiltrados = proyectos.filter((p: Proyecto) => p.id !== id);
        localStorage.setItem('proyectos', JSON.stringify(proyectosFiltrados));
        setProyectos(proyectosFiltrados);

        // Si hay sesión, eliminar de Supabase
        if (session?.user?.email) {
          const { error } = await supabase
            .from('proyectos')
            .delete()
            .eq('id', id);

          if (error) {
            console.error('Error al eliminar proyecto:', error);
            toast.error('Error al eliminar el proyecto del servidor');
          } else {
            toast.success('Proyecto eliminado correctamente');
          }
        }
      } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        toast.error('Error al eliminar el proyecto');
      }
    }
  };

  const editarProyecto = (proyecto: Proyecto) => {
    // Guardar el proyecto actual para edición
    localStorage.setItem('connectedSheets', proyecto.sheetsId);
    localStorage.setItem('connectedSlides', proyecto.slidesId);
    localStorage.setItem('projectName', proyecto.nombre);
    localStorage.setItem('proyectoActual', proyecto.id);
    
    // Redirigir a la página de edición
    router.push('/conectar');
  };

  // Función para agregar un nuevo proyecto
  const agregarProyecto = async (proyecto: Proyecto) => {
    try {
      // Agregar al estado y localStorage
      const nuevosProyectos = [...proyectos, proyecto];
      setProyectos(nuevosProyectos);
      localStorage.setItem('proyectos', JSON.stringify(nuevosProyectos));

      // Si hay sesión, guardar en Supabase
      if (session?.user?.email) {
        const proyectoConUsuario = {
          ...proyecto,
          userId: session.user.email
        };

        const { error } = await supabase
          .from('proyectos')
          .insert([proyectoConUsuario]);

        if (error) {
          console.error('Error al guardar proyecto en servidor:', error);
          toast.error('Error al guardar el proyecto en el servidor');
        } else {
          toast.success('Proyecto guardado correctamente');
        }
      }
    } catch (error) {
      console.error('Error al agregar proyecto:', error);
      toast.error('Error al agregar el proyecto');
    }
  };

  if (cargando) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded mb-4"></div>
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (proyectos.length === 0) {
    return (
      <Card className="text-center p-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay proyectos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Aún no has creado ningún proyecto. Conecta tus documentos para comenzar.
            </p>
            <Link href="/conectar">
              <Button>Conectar Documentos</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {proyectos.map(proyecto => (
        <Card key={proyecto.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-medium text-lg truncate" title={proyecto.nombre}>
                {proyecto.nombre}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => abrirProyecto(proyecto)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Proyecto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editarProyecto(proyecto)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Conexión
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => eliminarProyecto(proyecto.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="text-sm truncate" title={proyecto.hojasTitulo || "Hoja de cálculo"}>
                  {proyecto.hojasTitulo || "Hoja de cálculo"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm truncate" title={proyecto.presentacionTitulo || "Presentación"}>
                  {proyecto.presentacionTitulo || "Presentación"}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" />
                <span>Creado: {formatDistanceToNow(new Date(proyecto.fechaCreacion), { addSuffix: true, locale: es })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Modificado: {formatDistanceToNow(new Date(proyecto.ultimaModificacion), { addSuffix: true, locale: es })}</span>
              </div>
            </div>

            <Button 
              className="w-full mt-4" 
              onClick={() => abrirProyecto(proyecto)}
            >
              Abrir Proyecto
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 