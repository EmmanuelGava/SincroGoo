'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PropiedadesError {
  error: Error;
  reset: () => void;
}

export default function ErrorPresentacion({ error, reset }: PropiedadesError) {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error al cargar la presentación</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={reset}>
            Intentar de nuevo
          </Button>
        </div>
      </div>
    </div>
  );
} 