"use client"

import React from 'react';
import { Checkbox } from '@/componentes/ui/checkbox';
import { Button } from '@/componentes/ui/button';
import { Eye, Edit2 } from 'lucide-react';

interface PropiedadesFila {
  id: string;
  datos: Record<string, string>;
  columnas: string[];
  seleccionada: boolean;
  onSeleccionar: (id: string) => void;
  onPrevisualizar: (id: string) => void;
  onEditar: (id: string) => void;
}

export default function Fila({
  id,
  datos,
  columnas,
  seleccionada,
  onSeleccionar,
  onPrevisualizar,
  onEditar
}: PropiedadesFila) {
  return (
    <div className={`
      grid gap-4 p-4 items-center border-b
      ${seleccionada ? 'bg-primary/5' : 'hover:bg-muted/50'}
      transition-colors
    `}
    style={{
      gridTemplateColumns: `auto repeat(${columnas.length}, 1fr) auto`
    }}
    >
      {/* Checkbox de selección */}
      <Checkbox
        checked={seleccionada}
        onCheckedChange={() => onSeleccionar(id)}
      />

      {/* Datos de la fila */}
      {columnas.map(columna => (
        <div key={columna} className="truncate">
          <span className="text-sm">{datos[columna]}</span>
        </div>
      ))}

      {/* Acciones */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPrevisualizar(id)}
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditar(id)}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
} 