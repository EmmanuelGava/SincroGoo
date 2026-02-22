'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Página índice de Configuración.
 * Redirige a la sección principal de mensajería.
 */
export default function ConfiguracionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/configuracion/mensajeria');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirigiendo...</p>
    </div>
  );
}
