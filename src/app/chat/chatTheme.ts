'use client';

import { useMemo } from 'react';
import type { PaletteMode } from '@mui/material';
import { useThemeMode } from '@/app/lib/theme';

export type WaTheme = {
  panel: string;
  header: string;
  chatBg: string;
  incoming: string;
  outgoing: string;
  inputBar: string;
  inputField: string;
  icon: string;
  text: string;
  muted: string;
  tick: string;
  tickRead: string;
  menu: string;
  selected: string;
  accent: string;
  hoverRow: string;
  onAccent: string;
  border: string;
  patternStroke: string;
  patternOpacity: number;
  incomingShadow: string;
};

/** WhatsApp Web / Desktop — modo oscuro */
export const WA_DARK: WaTheme = {
  panel: '#111b21',
  header: '#202c33',
  chatBg: '#0b141a',
  incoming: '#202c33',
  outgoing: '#005c4b',
  inputBar: '#202c33',
  inputField: '#2a3942',
  icon: '#8696a0',
  text: '#e9edef',
  muted: '#8696a0',
  tick: 'rgba(233,237,239,0.7)',
  tickRead: '#53bdeb',
  menu: '#233138',
  selected: '#2a3942',
  accent: '#00a884',
  hoverRow: '#202c33',
  onAccent: '#111b21',
  border: 'rgba(134, 150, 160, 0.15)',
  patternStroke: '#ffffff',
  patternOpacity: 0.06,
  incomingShadow: 'none',
};

/** WhatsApp Desktop — modo claro (referencia UI oficial) */
export const WA_LIGHT: WaTheme = {
  panel: '#ffffff',
  header: '#f0f2f5',
  chatBg: '#efeae2',
  incoming: '#ffffff',
  outgoing: '#d9fdd3',
  inputBar: '#f0f2f5',
  inputField: '#ffffff',
  icon: '#54656f',
  text: '#111b21',
  muted: '#667781',
  tick: 'rgba(17, 27, 33, 0.45)',
  tickRead: '#53bdeb',
  menu: '#ffffff',
  selected: '#f0f2f5',
  accent: '#00a884',
  hoverRow: '#f5f6f6',
  onAccent: '#111b21',
  border: '#e9edef',
  patternStroke: '#000000',
  patternOpacity: 0.04,
  incomingShadow: '0 1px 0.5px rgba(11,20,26,0.13)',
};

export function getWaTheme(mode: PaletteMode): WaTheme {
  return mode === 'dark' ? WA_DARK : WA_LIGHT;
}

export function getWaChatBgSx(theme: WaTheme) {
  return {
    bgcolor: theme.chatBg,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='84' height='84'><g fill='none' stroke='${theme.patternStroke}' stroke-width='1' opacity='${theme.patternOpacity}'><circle cx='12' cy='18' r='4'/><rect x='40' y='10' width='10' height='8' rx='1'/><path d='M62 22h12v8H62z'/><circle cx='22' cy='58' r='5'/><path d='M48 50l8 6-8 6z'/><circle cx='72' cy='64' r='3'/></g></svg>`
    )}")`,
    backgroundRepeat: 'repeat',
  } as const;
}

export function useWaTheme(): WaTheme {
  const { mode } = useThemeMode();
  return useMemo(() => getWaTheme(mode), [mode]);
}

export function useWaChatBgSx() {
  const wa = useWaTheme();
  return useMemo(() => getWaChatBgSx(wa), [wa]);
}

/** @deprecated Usar useWaTheme() — se mantiene solo para imports legacy en transición */
export const WA = WA_DARK;

/** @deprecated Usar useWaChatBgSx() */
export const WA_CHAT_BG = getWaChatBgSx(WA_DARK);
