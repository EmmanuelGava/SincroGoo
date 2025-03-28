"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/componentes/ui/card';
import { Input } from '@/componentes/ui/input';
import { Button } from '@/componentes/ui/button';
import { ScrollArea } from '@/componentes/ui/scroll-area';
import { Search, Filter, Table } from 'lucide-react';
import Fila from './fila';

interface PropiedadesSeleccionador {
  hojaId: string;
  nombreHoja: string;
  columnas: string[];
  filas: Array<Record<string, string>>;
  onSeleccionarFilas: (ids: string[]) => void;
}

export default function SelectorDatos({
  hojaId,
  nombreHoja,
  columnas,
  filas,
  onSeleccionarFilas
}: PropiedadesSeleccionador) {
  const [filasSeleccionadas, setFilasSeleccionadas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');

  const filasFiltradas = filas.filter(fila => 
    Object.values(fila).some(valor => 
      valor.toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const manejarSeleccion = (id: string) => {
    setFilasSeleccionadas(prev => {
      const nuevasFilas = prev.includes(id)
        ? prev.filter(filaid => filaid !== id)
        : [...prev, id];
      onSeleccionarFilas(nuevasFilas);
      return nuevasFilas;
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Table className="w-5 h-5" />
          {nombreHoja}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Barra de herramientas */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar en los datos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Encabezados */}
        <div className="grid gap-4 p-4 font-medium text-sm bg-muted/50"
          style={{
            gridTemplateColumns: `auto repeat(${columnas.length}, 1fr) auto`
          }}
        >
          <div>Sel.</div>
          {columnas.map(columna => (
            <div key={columna}>{columna}</div>
          ))}
          <div>Acciones</div>
        </div>

        {/* Lista de filas */}
        <ScrollArea className="h-[500px]">
          {filasFiltradas.map((fila, index) => (
            <Fila
              key={index}
              id={fila.id || index.toString()}
              datos={fila}
              columnas={columnas}
              seleccionada={filasSeleccionadas.includes(fila.id || index.toString())}
              onSeleccionar={manejarSeleccion}
              onPrevisualizar={() => {}}
              onEditar={() => {}}
            />
          ))}
        </ScrollArea>

        {/* Resumen de selección */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filasSeleccionadas.length} filas seleccionadas
          </p>
          <Button
            disabled={filasSeleccionadas.length === 0}
            onClick={() => onSeleccionarFilas(filasSeleccionadas)}
          >
            Aplicar Selección
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 