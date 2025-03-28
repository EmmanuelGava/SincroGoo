"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/componentes/ui/card';
import { Input } from '@/componentes/ui/input';
import { Button } from '@/componentes/ui/button';
import { Label } from '@/componentes/ui/label';
import { ScrollArea } from '@/componentes/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/componentes/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/componentes/ui/table';
import { PlusCircle, Trash2, Save, RefreshCw } from 'lucide-react';

interface PropiedadesEditorPlaceholders {
  variables: string[];
  valores: Record<string, string>;
  onGuardar: (valores: Record<string, string>) => void;
  onAgregarVariable: (nombre: string) => void;
  onEliminarVariable: (nombre: string) => void;
}

export function EditorPlaceholders({
  variables,
  valores,
  onGuardar,
  onAgregarVariable,
  onEliminarVariable
}: PropiedadesEditorPlaceholders) {
  const [valoresLocales, setValoresLocales] = useState<Record<string, string>>(valores);
  const [nuevaVariable, setNuevaVariable] = useState('');
  const [modoEdicion, setModoEdicion] = useState<'tabla' | 'formulario'>('tabla');

  useEffect(() => {
    setValoresLocales(valores);
  }, [valores]);

  const manejarCambioValor = (variable: string, valor: string) => {
    setValoresLocales(prev => ({
      ...prev,
      [variable]: valor
    }));
  };

  const manejarGuardar = () => {
    onGuardar(valoresLocales);
  };

  const manejarAgregarVariable = () => {
    if (!nuevaVariable.trim()) return;
    
    // Validar formato de variable
    const nombreVariable = nuevaVariable.trim();
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(nombreVariable)) {
      alert('El nombre de la variable debe comenzar con una letra y contener solo letras, números y guiones bajos.');
      return;
    }
    
    // Verificar si ya existe
    if (variables.includes(nombreVariable)) {
      alert('Esta variable ya existe.');
      return;
    }
    
    onAgregarVariable(nombreVariable);
    setNuevaVariable('');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Editor de Variables</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tabla" onValueChange={(value) => setModoEdicion(value as 'tabla' | 'formulario')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="tabla">Vista de Tabla</TabsTrigger>
            <TabsTrigger value="formulario">Vista de Formulario</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tabla">
            <div className="mb-4 flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="nueva-variable">Nueva Variable</Label>
                <Input
                  id="nueva-variable"
                  value={nuevaVariable}
                  onChange={(e) => setNuevaVariable(e.target.value)}
                  placeholder="Nombre de la variable"
                />
              </div>
              <Button onClick={manejarAgregarVariable}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
            
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variable</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No hay variables definidas. Agrega una nueva variable para comenzar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    variables.map((variable) => (
                      <TableRow key={variable}>
                        <TableCell className="font-medium">
                          {`{{${variable}}}`}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={valoresLocales[variable] || ''}
                            onChange={(e) => manejarCambioValor(variable, e.target.value)}
                            placeholder="Valor"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEliminarVariable(variable)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="formulario">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {variables.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No hay variables definidas. Agrega una nueva variable para comenzar.
                  </div>
                ) : (
                  variables.map((variable) => (
                    <div key={variable} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`var-${variable}`}>
                          {`{{${variable}}}`}
                        </Label>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEliminarVariable(variable)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <Input
                        id={`var-${variable}`}
                        value={valoresLocales[variable] || ''}
                        onChange={(e) => manejarCambioValor(variable, e.target.value)}
                        placeholder="Valor"
                      />
                    </div>
                  ))
                )}
                
                <div className="pt-4 border-t">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="nueva-variable-form">Nueva Variable</Label>
                      <Input
                        id="nueva-variable-form"
                        value={nuevaVariable}
                        onChange={(e) => setNuevaVariable(e.target.value)}
                        placeholder="Nombre de la variable"
                      />
                    </div>
                    <Button onClick={manejarAgregarVariable}>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setValoresLocales(valores)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Restaurar
          </Button>
          <Button onClick={manejarGuardar}>
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 