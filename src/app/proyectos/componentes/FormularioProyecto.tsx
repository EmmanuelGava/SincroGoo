'use client';

import { useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Input } from '@/componentes/ui/input';
import { Label } from '@/componentes/ui/label';
import { Textarea } from '@/componentes/ui/textarea';
import { useToast } from '@/componentes/ui/use-toast';

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

interface FormularioProyectoProps {
  onSubmit: (proyecto: Omit<Proyecto, 'id'>) => Promise<void>;
}

export function FormularioProyecto({ onSubmit }: FormularioProyectoProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      await onSubmit({
        nombre,
        descripcion,
        usuario_id: '', // Se llenará en el servidor
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        sheets_id: null,
        slides_id: null,
        hojastitulo: null,
        presentaciontitulo: null
      });
    } catch (error) {
      console.error('Error al crear proyecto:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el proyecto. Por favor, inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del Proyecto</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          placeholder="Ingresa el nombre del proyecto"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Describe tu proyecto"
        />
      </div>

      <Button type="submit" disabled={cargando}>
        {cargando ? 'Creando...' : 'Crear Proyecto'}
      </Button>
    </form>
  );
} 