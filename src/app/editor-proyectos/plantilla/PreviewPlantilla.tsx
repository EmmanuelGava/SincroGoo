'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface PreviewPlantillaProps {
  templateId: string;
  accentColor: string;
  bgColor: string;
  placeholders: string[];
}

/** Preview SVG simple del layout de cada plantilla */
export function PreviewPlantilla({ templateId, accentColor, bgColor, placeholders }: PreviewPlantillaProps) {
  const w = 280;
  const h = 157;
  const pad = 8;
  const gap = 4;

  if (templateId === 'blanco') {
    return (
      <Box
        sx={{
          width: w,
          height: h,
          bgcolor: bgColor,
          borderRadius: 1,
          border: '1px dashed',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Diapositiva en blanco
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${w} ${h}`}
      sx={{
        width: w,
        height: h,
        bgcolor: bgColor,
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      {templateId === 'catalogo_productos' && (
        <>
          <rect x={pad} y={pad} width={w - pad * 2} height={70} rx={2} fill={accentColor} opacity={0.3} />
          <rect x={pad} y={pad + 75} width={w - pad * 2} height={18} rx={1} fill={accentColor} opacity={0.5} />
          <rect x={pad} y={pad + 98} width={80} height={12} rx={1} fill={accentColor} />
          <rect x={pad} y={pad + 115} width={w - pad * 2} height={30} rx={1} fill={accentColor} opacity={0.2} />
        </>
      )}
      {templateId === 'ficha_cliente' && (
        <>
          <rect x={pad} y={pad} width={w - pad * 2} height={22} rx={1} fill={accentColor} />
          <rect x={pad} y={pad + 28} width={(w - pad * 2) / 2 - gap} height={14} rx={1} fill={accentColor} opacity={0.5} />
          <rect x={pad} y={pad + 46} width={(w - pad * 2) / 2 - gap} height={14} rx={1} fill={accentColor} opacity={0.5} />
          <rect x={pad} y={pad + 64} width={(w - pad * 2) / 2 - gap} height={70} rx={1} fill={accentColor} opacity={0.3} />
          <rect x={w / 2 + gap / 2} y={pad + 28} width={(w - pad * 2) / 2 - gap} height={106} rx={1} fill={accentColor} opacity={0.3} />
        </>
      )}
      {templateId === 'ficha_local' && (
        <>
          <rect x={pad} y={pad} width={w - pad * 2} height={22} rx={1} fill={accentColor} />
          <rect x={pad} y={pad + 28} width={w - pad * 2} height={18} rx={1} fill={accentColor} opacity={0.6} />
          <rect x={pad} y={pad + 52} width={100} height={14} rx={1} fill={accentColor} opacity={0.5} />
          <rect x={pad} y={pad + 72} width={100} height={14} rx={1} fill={accentColor} opacity={0.5} />
          <rect x={pad} y={pad + 92} width={60} height={16} rx={1} fill={accentColor} />
        </>
      )}
      {templateId === 'propuesta_comercial' && (
        <>
          <rect x={pad} y={pad} width={w - pad * 2} height={24} rx={1} fill={accentColor} />
          <rect x={pad} y={pad + 32} width={w - pad * 2} height={55} rx={1} fill={accentColor} opacity={0.3} />
          <rect x={pad} y={pad + 93} width={120} height={20} rx={1} fill={accentColor} />
          <rect x={pad} y={pad + 120} width={w - pad * 2} height={25} rx={1} fill={accentColor} opacity={0.2} />
        </>
      )}
      {templateId === 'reporte_simple' && (
        <>
          <rect x={pad} y={pad} width={w - pad * 2} height={22} rx={1} fill={accentColor} />
          <rect x={pad} y={pad + 30} width={(w - pad * 2) / 2 - gap} height={50} rx={1} fill={accentColor} opacity={0.4} />
          <rect x={w / 2 + gap / 2} y={pad + 30} width={(w - pad * 2) / 2 - gap} height={50} rx={1} fill={accentColor} opacity={0.4} />
          <rect x={pad} y={pad + 88} width={w - pad * 2} height={55} rx={1} fill={accentColor} opacity={0.2} />
        </>
      )}
    </Box>
  );
}
