'use client';

import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useWaTheme } from '@/app/chat/chatTheme';
import {
  CATALOGO_TIPO_LABEL,
  CATALOGO_TIPOS,
  type CatalogoItem,
  type CatalogoTipo,
} from '@/lib/chat/catalogoVentas';
import { formatCatalogPrecio } from '@/lib/chat/respuestasRapidas';
import {
  type CategoriaCatalogo,
  nombreDisplayCatalogo,
  stockDisponible,
} from '@/lib/catalogo/catalogoCategorias';

type ListaCategoria = { categoria: string; count: number; incluirSinStock: boolean };

function listasDesdeCategorias(
  categorias: CategoriaCatalogo[],
  items: CatalogoItem[],
): ListaCategoria[] {
  const out: ListaCategoria[] = [];
  for (const cat of categorias) {
    const count = items.filter((item) => {
      const slug = (item.categoria || '').trim().toLowerCase();
      const match = slug === cat.slug || item.categoria_id === cat.id;
      if (!match) return false;
      if (cat.incluir_sin_stock_en_lista) return true;
      return stockDisponible(item) > 0;
    }).length;
    if (count > 0) {
      out.push({
        categoria: cat.slug,
        count,
        incluirSinStock: cat.incluir_sin_stock_en_lista,
      });
    }
  }
  return out;
}

function listasLegacy(items: CatalogoItem[]): ListaCategoria[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const cat = (item.categoria || '').trim().toLowerCase();
    if (!cat || stockDisponible(item) <= 0) continue;
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([categoria, count]) => ({
      categoria,
      count,
      incluirSinStock: false,
    }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'));
}

function parentNombre(items: CatalogoItem[], parentId: string | null): string | null {
  if (!parentId) return null;
  const parent = items.find((i) => i.id === parentId);
  return parent?.nombre ?? null;
}

export function CatalogPicker({
  items,
  categorias = [],
  onSelect,
  onSelectLista,
  onManage,
}: {
  items: CatalogoItem[];
  categorias?: CategoriaCatalogo[];
  onSelect: (item: CatalogoItem) => void;
  onSelectLista?: (categoria: string, incluirSinStock?: boolean) => void;
  onManage: () => void;
}) {
  const WA = useWaTheme();
  const [tipo, setTipo] = useState<CatalogoTipo | 'todos'>('todos');
  const listas = useMemo(() => {
    const fromApi = listasDesdeCategorias(categorias, items);
    if (fromApi.length > 0) return fromApi;
    return listasLegacy(items);
  }, [categorias, items]);

  const visibles = (tipo === 'todos' ? items : items.filter((item) => item.tipo === tipo)).filter(
    (item) => item.tipo !== 'presupuesto',
  );

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
        Elegí una lista o un producto
      </Typography>

      {listas.length > 0 && onSelectLista ? (
        <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
          <Typography sx={{ fontSize: '0.7rem', color: WA.muted, mb: 0.5, textTransform: 'uppercase' }}>
            Listas /categoría
          </Typography>
          {listas.map((lista) => (
            <Box
              key={lista.categoria}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelectLista(lista.categoria, lista.incluirSinStock)}
              sx={{
                px: 1,
                py: 0.75,
                mb: 0.35,
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: WA.selected,
                '&:hover': { bgcolor: WA.accent, color: WA.onAccent },
              }}
            >
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                /{lista.categoria} ({lista.count})
              </Typography>
            </Box>
          ))}
        </Box>
      ) : null}

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
              color: tipo === key ? WA.onAccent : WA.text,
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
          visibles.map((item) => {
            const disponible = stockDisponible(item);
            const sinStock = item.tipo === 'producto' && disponible <= 0;
            const displayNombre = nombreDisplayCatalogo(item, parentNombre(items, item.parent_id));
            const thumb = item.imagen_urls?.[0] || item.imagen_url;
            return (
              <Box
                key={item.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (sinStock) return;
                  onSelect(item);
                }}
                sx={{
                  display: 'flex',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  cursor: sinStock ? 'not-allowed' : 'pointer',
                  opacity: sinStock ? 0.45 : 1,
                  '&:hover': sinStock ? undefined : { bgcolor: WA.selected },
                }}
              >
                {thumb ? (
                  <Box
                    component="img"
                    src={thumb}
                    alt=""
                    sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1,
                      bgcolor: WA.selected,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      color: WA.muted,
                      textAlign: 'center',
                      px: 0.3,
                    }}
                  >
                    {CATALOGO_TIPO_LABEL[item.tipo].slice(0, 4)}
                  </Box>
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }} noWrap>
                    {displayNombre}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: WA.muted }} noWrap>
                    {sinStock
                      ? 'sin stock'
                      : `${CATALOGO_TIPO_LABEL[item.tipo]}${item.precio != null ? ` · ${formatCatalogPrecio(item.precio)}` : ''}`}
                  </Typography>
                </Box>
              </Box>
            );
          })
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
          borderTop: `1px solid ${WA.border}`,
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
