"use client"

import React from 'react';
import { SheetEditor } from '@/components/sheets/editor/SheetEditor';

export default function PaginaEditar() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Editor de Sincronización</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona datos de la hoja de cálculo y edita los elementos de las diapositivas
          </p>
        </div>
        
        <SheetEditor />
      </div>
    </div>
  );
} 