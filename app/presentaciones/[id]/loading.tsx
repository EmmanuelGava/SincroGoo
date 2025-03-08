import { Loader2 } from 'lucide-react';

export default function CargandoPresentacion() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando presentación...</p>
        </div>
      </div>
    </div>
  );
} 