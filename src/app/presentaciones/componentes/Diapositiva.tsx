"use client"

import React from 'react';
import { Card } from '@/componentes/ui/card';
import { Button } from '@/componentes/ui/button';
import { Edit2, Eye, RotateCcw } from 'lucide-react';
import type { ElementoDiapositiva } from '@/tipos/diapositivas';

interface PropiedadesVistaPrevia {
  idDiapositiva: string;
  titulo: string;
  urlImagen: string;
  elementos: ElementoDiapositiva[];
  onEditar: (id: string) => void;
  onPrevisualizar: (id: string) => void;
  onRestaurar: (id: string) => void;
}

export default function VistaDiapositiva({
  idDiapositiva,
  titulo,
  urlImagen,
  elementos,
  onEditar,
  onPrevisualizar,
  onRestaurar
}: PropiedadesVistaPrevia) {
  return (
    <Card className="overflow-hidden">
      {/* Vista previa de la diapositiva */}
      <div className="relative aspect-video">
        <img
          src={urlImagen}
          alt={titulo}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay con acciones */}
        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEditar(idDiapositiva)}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPrevisualizar(idDiapositiva)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRestaurar(idDiapositiva)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar
          </Button>
        </div>
      </div>

      {/* Información de la diapositiva */}
      <div className="p-4">
        <h3 className="font-medium mb-2">{titulo}</h3>
        <div className="text-sm text-muted-foreground">
          <p>Elementos editables: {elementos.length}</p>
          <p>ID: {idDiapositiva}</p>
        </div>
      </div>
    </Card>
  );
} 