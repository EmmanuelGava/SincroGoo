'use client';

import { useCallback, useEffect, useState } from 'react';

export type MiembroOrganizacion = {
  usuario_id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'agente';
  avatar_url?: string | null;
};

type MiembrosResponse = {
  miembros?: MiembroOrganizacion[];
  rol?: 'admin' | 'agente';
  usuario_id?: string;
};

export function useOrganizacionMiembros() {
  const [miembros, setMiembros] = useState<MiembroOrganizacion[]>([]);
  const [rol, setRol] = useState<'admin' | 'agente'>('agente');
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/organizacion/miembros', { cache: 'no-store' });
      const data = (await res.json()) as MiembrosResponse;
      if (res.ok) {
        setMiembros(Array.isArray(data.miembros) ? data.miembros : []);
        if (data.rol) setRol(data.rol);
        if (data.usuario_id) setUsuarioId(data.usuario_id);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const nombreCorto = (id?: string | null) => {
    if (!id) return 'Sin asignar';
    const m = miembros.find((x) => x.usuario_id === id);
    if (!m) return '—';
    const parts = String(m.nombre || m.email || '').trim().split(/\s+/);
    return parts[0] || m.email?.split('@')[0] || 'Usuario';
  };

  return { miembros, rol, usuarioId, loading, reload, nombreCorto };
}
