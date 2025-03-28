"use client"

import { Button } from '@/componentes/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EncabezadoEditorProps {
  titulo?: string;
  subtitulo?: string;
}

export function EncabezadoEditor({
  titulo = "Editor de Sincronización",
  subtitulo = "Selecciona datos de la hoja de cálculo y edita los elementos de las diapositivas"
}: EncabezadoEditorProps) {
  const router = useRouter();
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => router.push('/proyectos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">{titulo}</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {subtitulo}
      </p>
    </div>
  );
} 