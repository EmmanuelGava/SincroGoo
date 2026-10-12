'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { CampoDefinicion, CampoEntidad, CamposValores } from '@/lib/crm/camposPersonalizados';

type Props = {
  entidad: CampoEntidad;
  entidadId: string;
  /** Sin título ni margen, para meterlo dentro de una sección que ya lo tiene. */
  sinTitulo?: boolean;
  /** No muestra nada si la organización no definió campos. */
  ocultarSiVacio?: boolean;
};

type Borrador = Record<string, string>;

function aBorrador(definiciones: CampoDefinicion[], valores: CamposValores): Borrador {
  const borrador: Borrador = {};
  for (const def of definiciones) {
    const v = valores[def.clave];
    if (def.tipo === 'si_no') borrador[def.clave] = v === true ? 'si' : v === false ? 'no' : '';
    else borrador[def.clave] = v === undefined || v === null ? '' : String(v);
  }
  return borrador;
}

export default function CamposPersonalizadosEditor({
  entidad,
  entidadId,
  sinTitulo = false,
  ocultarSiVacio = false,
}: Props) {
  const endpoint = `/api/${entidad === 'lead' ? 'leads' : 'contactos'}/${encodeURIComponent(entidadId)}/campos`;
  const [definiciones, setDefiniciones] = useState<CampoDefinicion[]>([]);
  const [borrador, setBorrador] = useState<Borrador>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setOk(false);
    fetch(endpoint, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los campos');
        if (cancelled) return;
        const defs = Array.isArray(data.definiciones) ? (data.definiciones as CampoDefinicion[]) : [];
        setDefiniciones(defs);
        setBorrador(aBorrador(defs, (data.campos || {}) as CamposValores));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar los campos');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const set = (clave: string, valor: string) => {
    setOk(false);
    setBorrador((prev) => ({ ...prev, [clave]: valor }));
  };

  const guardar = async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campos: borrador }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudieron guardar los campos');
      setBorrador(aBorrador(definiciones, (data.campos || {}) as CamposValores));
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los campos');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return ocultarSiVacio ? null : <Typography variant="body2" color="text.secondary">Cargando campos…</Typography>;
  }

  if (definiciones.length === 0) {
    if (error) return <Alert severity="error">{error}</Alert>;
    return ocultarSiVacio ? null : (
      <Typography variant="body2" color="text.secondary" sx={sinTitulo ? undefined : { mt: 2 }}>
        Sin campos personalizados. Un admin los crea en{' '}
        <Link href="/configuracion/campos">Configuración → Campos personalizados</Link>.
      </Typography>
    );
  }

  return (
    <Box sx={sinTitulo ? undefined : { mt: 2 }}>
      {!sinTitulo && <Typography variant="subtitle2" gutterBottom>Campos personalizados</Typography>}
      <Stack spacing={1.5}>
        {definiciones.map((def) => {
          const valor = borrador[def.clave];
          if (def.tipo === 'si_no') {
            return (
              <TextField
                key={def.id}
                select
                size="small"
                label={def.etiqueta}
                value={valor ?? ''}
                onChange={(e) => set(def.clave, e.target.value)}
                fullWidth
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="si">Sí</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
            );
          }
          if (def.tipo === 'opcion') {
            return (
              <TextField
                key={def.id}
                select
                size="small"
                label={def.etiqueta}
                value={valor ?? ''}
                onChange={(e) => set(def.clave, e.target.value)}
                fullWidth
              >
                <MenuItem value="">—</MenuItem>
                {def.opciones.map((op) => (
                  <MenuItem key={op} value={op}>{op}</MenuItem>
                ))}
              </TextField>
            );
          }
          return (
            <TextField
              key={def.id}
              size="small"
              label={def.etiqueta}
              type={def.tipo === 'fecha' ? 'date' : 'text'}
              inputMode={def.tipo === 'numero' ? 'decimal' : undefined}
              InputLabelProps={def.tipo === 'fecha' ? { shrink: true } : undefined}
              value={valor ?? ''}
              onChange={(e) => set(def.clave, e.target.value)}
              multiline={def.tipo === 'texto'}
              maxRows={4}
              fullWidth
            />
          );
        })}
        <Box>
          <Button type="button" size="small" variant="contained" disabled={saving} onClick={() => void guardar()}>
            {saving ? 'Guardando…' : 'Guardar campos'}
          </Button>
        </Box>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {ok ? <Alert severity="success">Campos guardados</Alert> : null}
      </Stack>
    </Box>
  );
}
