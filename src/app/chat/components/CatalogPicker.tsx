'use client';

import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { WA } from '@/app/chat/chatTheme';
import {
  CATALOGO_TIPO_LABEL,
  CATALOGO_TIPOS,
  type CatalogoItem,
  type CatalogoTipo,
} from '@/lib/chat/catalogoVentas';
import { formatCatalogPrecio } from '@/lib/chat/respuestasRapidas';

export function CatalogPicker({
  items,
  onSelect,
  onManage,
}: {
  items: CatalogoItem[];
  onSelect: (item: CatalogoItem) => void;
  onManage: () => void;
}) {
  const [tipo, setTipo] = useState<CatalogoTipo | 'todos'>('todos');
  const visibles = tipo === 'todos' ? items : items.filter((item) => item.tipo === tipo);

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: '100%',
        left: 8,
        right: 8,
        mb: 0.5,
        bgcolor: WA.menu,
        color: WA.text,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
        zIndex: 21,
        maxHeight: 360,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography sx={{ px: 1.5, pt: 1, fontSize: '0.75rem', color: WA.muted }}>
        Elegí un producto, presupuesto o propuesta
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, px: 1.5, py: 1 }}>
        {(['todos', ...CATALOGO_TIPOS] as const).map((key) => (
          <Box
            key={key}
            onMouseDown={(e) => {
              e.preventDefault();
              setTipo(key);
            }}
            sx={{
              px: 1,
              py: 0.35,
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '0.75rem',
              bgcolor: tipo === key ? WA.accent : WA.selected,
              color: tipo === key ? '#111b21' : WA.text,
            }}
          >
            {key === 'todos' ? 'Todos' : CATALOGO_TIPO_LABEL[key]}
          </Box>
        ))}
      </Box>
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {visibles.length === 0 ? (
          <Typography sx={{ px: 1.5, pb: 1.5, fontSize: '0.85rem', color: WA.muted }}>
            Todavía no hay ítems. Cargalos en Catálogo.
          </Typography>
        ) : (
          visibles.map((item) => (
            <Box
              key={item.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(item)}
              sx={{
                display: 'flex',
                gap: 1,
                px: 1.5,
                py: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: WA.selected },
              }}
            >
              {item.imagen_url ? (
                <Box
                  component="img"
                  src={item.imagen_url}
                  alt=""
                  sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{
                  width: 44, height: 44, borderRadius: 1, bgcolor: WA.selected,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', color: WA.muted, textAlign: 'center', px: 0.3,
                }}>
                  {CATALOGO_TIPO_LABEL[item.tipo].slice(0, 4)}
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }} noWrap>
                  {item.nombre}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: WA.muted }} noWrap>
                  {CATALOGO_TIPO_LABEL[item.tipo]}
                  {item.precio != null ? ` · ${formatCatalogPrecio(item.precio)}` : ''}
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>
      <Box
        onMouseDown={(e) => {
          e.preventDefault();
          onManage();
        }}
        sx={{
          px: 1.5,
          py: 1,
          borderTop: '1px solid #2a3942',
          color: WA.muted,
          fontSize: '0.8rem',
          cursor: 'pointer',
          '&:hover': { color: WA.text },
        }}
      >
        Abrir catálogo
      </Box>
    </Box>
  );
}
