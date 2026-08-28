'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import HeadsetIcon from '@mui/icons-material/Headset';
import SendIcon from '@mui/icons-material/Send';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import BoltIcon from '@mui/icons-material/Bolt';
import FileUpload, { type FileUploadHandle } from './FileUpload';
import EmojiPickerComponent from './EmojiPicker';
import AudioRecorder from './AudioRecorder';
import { QuickReplyManager } from './QuickReplies';
import { CatalogPicker } from './CatalogPicker';
import { useWaTheme } from '@/app/chat/chatTheme';
import {
  draftNeedsCatalog,
  filterRespuestasRapidas,
  insertRespuestaInDraft,
  parseSlashDraft,
  type RespuestaRapida,
  type RespuestaVars,
} from '@/lib/chat/respuestasRapidas';
import { type CatalogoItem } from '@/lib/chat/catalogoVentas';
import { armarPresupuesto } from '@/lib/chat/armarPresupuesto';
import { armarListaCategoria } from '@/lib/chat/armarListaCategoria';
import {
  armarTextoDesdeItemCatalogo,
  armarTextoPresupuestoCarrito,
  type PlantillaVars,
} from '@/lib/catalogo/catalogoPlantillas';
import {
  filterCategoriasSlash,
  stockDisponible,
  type CategoriaCatalogo,
} from '@/lib/catalogo/catalogoCategorias';
import { quotedPreviewLabel, type ReplyToMessage } from '@/lib/chat/quotedMessage';
import {
  currentScheduleFields,
  formatScheduleLocal,
  isFutureSchedule,
  parseLocalScheduleDatetime,
} from '@/lib/chat/scheduleSend';

interface MessageInputProps {
  onSendMessage: (
    contenido: string,
    options?: { scheduledFor?: string; presupuestoCatalogoIds?: string[] },
  ) => void;
  onSendInternalNote?: (contenido: string) => void;
  onSendFile?: (
    url: string,
    fileName: string,
    fileType: string,
    mimeType?: string,
    caption?: string,
    options?: { scheduledFor?: string; presupuestoCatalogoIds?: string[] },
  ) => void;
  onSendAudio?: (audioBlob: Blob, duration: number) => void;
  onScheduledDelivered?: (preview: string) => void;
  conversationId?: string;
  disabled?: boolean;
  placeholder?: string;
  enviando?: boolean;
  onTyping?: (isTyping: boolean) => void;
  replyTo?: ReplyToMessage | null;
  onCancelReply?: () => void;
  respuestaVars?: RespuestaVars;
  manageOpen?: boolean;
  onManageOpenChange?: (open: boolean) => void;
}

type SlashEntry =
  | {
      kind: 'categoria';
      id: string;
      label: string;
      slug: string;
      incluirSinStock: boolean;
    }
  | { kind: 'respuesta'; item: RespuestaRapida };

function imagenesCatalogo(items: CatalogoItem[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    for (const u of item.imagen_urls || []) {
      if (u && !out.includes(u)) out.push(u);
    }
    const legacy = item.imagen_url?.trim();
    if (legacy && !out.includes(legacy)) out.push(legacy);
  }
  return out;
}

function AttachCircle({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        bgcolor: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mr: 1.5,
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

export default function MessageInput({
  onSendMessage,
  onSendInternalNote,
  onSendFile,
  onSendAudio,
  onScheduledDelivered,
  conversationId,
  disabled = false,
  placeholder = 'Escribe un mensaje o / para respuestas',
  enviando,
  onTyping,
  replyTo,
  onCancelReply,
  respuestaVars,
  manageOpen,
  onManageOpenChange,
}: MessageInputProps) {
  const WA = useWaTheme();
  const router = useRouter();
  const [mensaje, setMensaje] = useState('');
  const [attachEl, setAttachEl] = useState<HTMLElement | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [respuestas, setRespuestas] = useState<RespuestaRapida[]>([]);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const [localManageOpen, setLocalManageOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([]);
  const [carrito, setCarrito] = useState<CatalogoItem[]>([]);
  const [listaPendingImages, setListaPendingImages] = useState<string[]>([]);
  const [programar, setProgramar] = useState(false);
  const [notaInterna, setNotaInterna] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState(() => currentScheduleFields().fecha);
  const [horaProgramada, setHoraProgramada] = useState(() => currentScheduleFields().hora);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [programados, setProgramados] = useState<Array<{ id: string; contenido?: string; next_attempt_at?: string }>>([]);
  const manage = manageOpen ?? localManageOpen;
  const setManage = onManageOpenChange ?? setLocalManageOpen;
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<FileUploadHandle>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevProgramadosRef = useRef<Map<string, string>>(new Map());
  const cancelledProgramadosRef = useRef<Set<string>>(new Set());
  const audioStartRef = useRef<(() => void) | null>(null);

  const resolveScheduledFor = (): string | undefined => {
    if (!programar) return undefined;
    const when = parseLocalScheduleDatetime(fechaProgramada, horaProgramada);
    if (!when) {
      setScheduleError('Fecha u hora inválida');
      return undefined;
    }
    if (!isFutureSchedule(when)) {
      setScheduleError('Elegí una fecha y hora futura');
      return undefined;
    }
    setScheduleError(null);
    return when.toISOString();
  };

  const trackProgramados = (
    items: Array<{ id: string; contenido?: string; next_attempt_at?: string }>,
    isInitialLoad = false,
  ) => {
    const nextMap = new Map(items.map((item) => [item.id, item.contenido || '']));
    if (!isInitialLoad) {
      for (const [id, preview] of prevProgramadosRef.current) {
        if (!nextMap.has(id) && !cancelledProgramadosRef.current.has(id)) {
          onScheduledDelivered?.(preview);
        }
      }
    }
    prevProgramadosRef.current = nextMap;
  };

  useEffect(() => {
    if (!conversationId) {
      setProgramados([]);
      return;
    }
    let cancelled = false;
    const load = () => {
      void fetch(`/api/chat/scheduled?conversacion_id=${encodeURIComponent(conversationId)}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) {
            const items = Array.isArray(data.scheduled) ? data.scheduled : [];
            trackProgramados(items, prevProgramadosRef.current.size === 0);
            setProgramados(items);
          }
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [conversationId]);

  const reloadProgramados = async () => {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/chat/scheduled?conversacion_id=${encodeURIComponent(conversationId)}`, { cache: 'no-store' });
      const data = await res.json();
      const items = Array.isArray(data.scheduled) ? data.scheduled : [];
      trackProgramados(items, false);
      setProgramados(items);
    } catch {
      /* noop */
    }
  };

  const cancelProgramado = async (id: string) => {
    cancelledProgramadosRef.current.add(id);
    setProgramados((prev) => prev.filter((item) => item.id !== id));
    try {
      const res = await fetch(`/api/chat/scheduled?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        cancelledProgramadosRef.current.delete(id);
        setScheduleError(String(data.error || 'No se pudo cancelar el programado'));
        await reloadProgramados();
        return;
      }
      prevProgramadosRef.current.delete(id);
    } catch {
      cancelledProgramadosRef.current.delete(id);
      setScheduleError('Error de conexión al cancelar');
      await reloadProgramados();
    }
  };

  const loadRespuestas = async () => {
    try {
      const res = await fetch('/api/chat/respuestas-rapidas', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setRespuestas(data.respuestas || []);
    } catch {
      /* el composer sigue andando sin atajos */
    }
  };

  const loadCatalogo = async () => {
    try {
      const res = await fetch('/api/chat/catalogo', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setCatalogo(data.items || []);
    } catch {
      /* sin catálogo el chip igual se muestra */
    }
  };

  const loadCategorias = async () => {
    try {
      const res = await fetch('/api/chat/catalogo/categorias', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setCategorias(data.categorias || []);
    } catch {
      /* listas por categoría siguen con fallback */
    }
  };

  useEffect(() => {
    void loadRespuestas();
    void loadCatalogo();
    void loadCategorias();
  }, []);

  const plantillaVars = (): PlantillaVars => ({
    cliente: respuestaVars?.nombre,
    nombre: respuestaVars?.nombre,
    telefono: respuestaVars?.telefono,
  });

  const presupuestoPlantilla = (): string | null | undefined => {
    const tpl = catalogo.find((c) => c.tipo === 'presupuesto' && c.plantilla?.trim());
    return tpl?.plantilla;
  };

  const slash = parseSlashDraft(mensaje);
  const slashOpen = slash.active && !slashDismissed && !audioBusy;
  const slashEntries = slashOpen
    ? [
        ...filterCategoriasSlash(categorias, slash.query).map((c) => ({
          kind: 'categoria' as const,
          id: c.id,
          label: c.nombre,
          slug: c.slug,
          incluirSinStock: c.incluir_sin_stock_en_lista,
        })),
        ...filterRespuestasRapidas(respuestas, slash.query).map((item) => ({
          kind: 'respuesta' as const,
          item,
        })),
      ]
    : [];

  useEffect(() => {
    setSlashIndex(0);
  }, [slash.query, slashOpen]);

  const syncPresupuestoDraft = (items: CatalogoItem[]) => {
    if (items.length === 0) return;
    setMensaje(armarTextoPresupuestoCarrito(items, plantillaVars(), presupuestoPlantilla()));
  };

  const applySlashEntry = (entry: SlashEntry) => {
    if (entry.kind === 'categoria') {
      applyListaCategoria(entry.slug, entry.incluirSinStock);
      setSlashDismissed(true);
      return;
    }
    applyRespuesta(entry.item);
  };

  const applyRespuesta = (item: RespuestaRapida) => {
    const next = insertRespuestaInDraft(mensaje, item.texto, respuestaVars || {});
    setMensaje(next);
    setSlashDismissed(true);
    setCarrito([]);
    if (draftNeedsCatalog(next)) setCatalogOpen(true);
    onTyping?.(next.length > 0);
  };

  const applyCatalogItem = (item: CatalogoItem) => {
    if (item.tipo === 'propuesta') {
      const texto = armarTextoDesdeItemCatalogo(item, plantillaVars());
      setMensaje(texto);
      setCarrito([]);
      setListaPendingImages([]);
      setCatalogOpen(false);
      onTyping?.(true);
      return;
    }

    if (stockDisponible(item) <= 0) return;
    const nextCart = [...carrito, item];
    setCarrito(nextCart);
    setListaPendingImages([]);
    syncPresupuestoDraft(nextCart);
    setCatalogOpen(false);
    onTyping?.(true);
    setTimeout(() => {
      const input = inputRef.current?.querySelector('textarea') || inputRef.current?.querySelector('input');
      if (!input) return;
      input.focus();
      const end = armarTextoPresupuestoCarrito(nextCart, plantillaVars(), presupuestoPlantilla()).length;
      if (input.setSelectionRange) input.setSelectionRange(end, end);
    }, 0);
  };

  const applyListaCategoria = (categoria: string, incluirSinStock?: boolean) => {
    const cat = categorias.find((c) => c.slug === categoria);
    const incluir = incluirSinStock ?? cat?.incluir_sin_stock_en_lista ?? false;
    const { texto, imagenes } = armarListaCategoria(catalogo, categoria, { incluirSinStock: incluir });
    if (!texto) return;
    setMensaje(texto);
    setCarrito([]);
    setListaPendingImages(imagenes);
    setCatalogOpen(false);
    onTyping?.(true);
    setTimeout(() => {
      const input = inputRef.current?.querySelector('textarea') || inputRef.current?.querySelector('input');
      if (!input) return;
      input.focus();
      if (input.setSelectionRange) input.setSelectionRange(texto.length, texto.length);
    }, 0);
  };

  const removeFromCarrito = (index: number) => {
    const nextCart = carrito.filter((_, idx) => idx !== index);
    setCarrito(nextCart);
    if (nextCart.length === 0) {
      if (draftNeedsCatalog(mensaje)) setMensaje('');
    } else {
      syncPresupuestoDraft(nextCart);
    }
  };

  const handleSend = () => {
    if (disabled) return;
    if (slashOpen && slashEntries[slashIndex]) {
      applySlashEntry(slashEntries[slashIndex]);
      return;
    }
    const texto = mensaje.trim();
    if (!texto) return;
    if (notaInterna) {
      onSendInternalNote?.(texto);
      setMensaje('');
      setNotaInterna(false);
      onTyping?.(false);
      return;
    }
    const cartImages = carrito.length > 0 ? imagenesCatalogo(carrito) : [];
    const pendingImages = listaPendingImages;
    const allImages = cartImages.length > 0 ? cartImages : pendingImages;
    const imagenUrl = allImages[0] ?? null;
    const extraImages = allImages.slice(1);
    let scheduledFor: string | undefined;
    if (programar) {
      scheduledFor = resolveScheduledFor();
      if (!scheduledFor) return;
    }
    const presupuestoCatalogoIds = carrito.length > 0 ? carrito.map((item) => item.id) : undefined;
    const sendOptions = {
      ...(scheduledFor ? { scheduledFor } : {}),
      ...(presupuestoCatalogoIds ? { presupuestoCatalogoIds } : {}),
    };
    const attach = imagenUrl
      ? {
          url: imagenUrl,
          fileName: carrito[0]?.nombre || 'producto',
          fileType: 'image' as const,
        }
      : null;
    if (attach && onSendFile) {
      onSendFile(attach.url, attach.fileName, attach.fileType, undefined, texto, sendOptions);
      for (const url of extraImages) {
        onSendFile(url, 'lista', 'image', undefined, undefined, scheduledFor ? { scheduledFor } : undefined);
      }
      if (scheduledFor) void reloadProgramados();
    } else {
      onSendMessage(texto, Object.keys(sendOptions).length > 0 ? sendOptions : undefined);
      if (scheduledFor) {
        void reloadProgramados();
      }
    }
    setMensaje('');
    setCarrito([]);
    setListaPendingImages([]);
    setCatalogOpen(false);
    setSlashDismissed(false);
    setProgramar(false);
    onTyping?.(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (catalogOpen && e.key === 'Escape') {
      e.preventDefault();
      setCatalogOpen(false);
      return;
    }
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, Math.max(slashEntries.length - 1, 0)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (catalogOpen) {
          setCatalogOpen(false);
          return;
        }
        setSlashDismissed(true);
        return;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && slashEntries[slashIndex]) {
        e.preventDefault();
        applySlashEntry(slashEntries[slashIndex]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (programar && !mensaje.trim()) {
        return;
      }
      handleSend();
    }
  };

  const stopScheduleFieldEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMensaje(value);
    setSlashDismissed(false);
    const nowTyping = value.length > 0;
    if (onTyping) {
      onTyping(nowTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (nowTyping) {
        typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (inputRef.current) {
      const input = inputRef.current.querySelector('textarea') || inputRef.current.querySelector('input');
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newValue = mensaje.slice(0, start) + emoji + mensaje.slice(end);
        setMensaje(newValue);
        setTimeout(() => {
          input.focus();
          if (input.setSelectionRange) {
            input.setSelectionRange(start + emoji.length, start + emoji.length);
          }
        }, 0);
        return;
      }
    }
    setMensaje((prev) => prev + emoji);
  };

  useEffect(() => {
    if (inputRef.current && !disabled) inputRef.current.focus();
  }, [disabled]);

  const hasText = Boolean(mensaje.trim());

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1,
        py: 1,
        bgcolor: WA.inputBar,
        position: 'relative',
      }}
    >
      {slashOpen ? (
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
            zIndex: 20,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {slashEntries.length === 0 ? (
            <Typography sx={{ px: 1.5, py: 1, fontSize: '0.85rem', color: WA.muted }}>
              No hay coincidencias. Probá /categoría o Gestionar respuestas.
            </Typography>
          ) : (
            slashEntries.map((entry, index) => (
              <Box
                key={entry.kind === 'categoria' ? `cat-${entry.id}` : entry.item.id}
                onMouseEnter={() => setSlashIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySlashEntry(entry);
                }}
                sx={{
                  px: 1.5,
                  py: 0.9,
                  cursor: 'pointer',
                  bgcolor: index === slashIndex ? WA.selected : 'transparent',
                  '&:hover': { bgcolor: WA.selected },
                }}
              >
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: WA.accent }}>
                  {entry.kind === 'categoria' ? `/${entry.slug}` : `/${entry.item.atajo}`}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: WA.muted }} noWrap>
                  {entry.kind === 'categoria'
                    ? `Lista: ${entry.label}`
                    : entry.item.texto.slice(0, 80)}
                </Typography>
              </Box>
            ))
          )}
          <Box
            onMouseDown={(e) => {
              e.preventDefault();
              setManage(true);
            }}
            sx={{
              px: 1.5,
              py: 0.75,
              borderTop: `1px solid ${WA.border}`,
              color: WA.muted,
              fontSize: '0.75rem',
              cursor: 'pointer',
              '&:hover': { color: WA.text },
            }}
          >
            Gestionar respuestas
          </Box>
        </Box>
      ) : null}

      {catalogOpen && !slashOpen ? (
        <CatalogPicker
          items={catalogo}
          categorias={categorias}
          onSelect={applyCatalogItem}
          onSelectLista={applyListaCategoria}
          onManage={() => {
            setCatalogOpen(false);
            router.push('/catalogo');
          }}
        />
      ) : null}

      {conversationId && onSendFile ? (
        <FileUpload
          ref={fileRef}
          onFileUploaded={(url, fileName, fileType, mimeType) => {
            if (notaInterna) return;
            const scheduledFor = resolveScheduledFor();
            if (programar && !scheduledFor) return;
            onSendFile(
              url,
              fileName,
              fileType,
              mimeType,
              mensaje.trim() || undefined,
              scheduledFor ? { scheduledFor } : undefined,
            );
            if (scheduledFor) void reloadProgramados();
            setMensaje('');
            setProgramar(false);
          }}
          conversationId={conversationId}
          disabled={disabled || notaInterna}
        />
      ) : null}

      {(draftNeedsCatalog(mensaje) || carrito.length > 0) && !audioBusy ? (
        <Box sx={{ ml: 6, mb: 0.75 }}>
          {carrito.length > 0 ? (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
              {carrito.map((item, index) => (
                <Chip
                  key={`${item.id}-${index}`}
                  label={`${item.nombre}${item.precio != null ? ` · $${item.precio}` : ''}`}
                  size="small"
                  onDelete={() => removeFromCarrito(index)}
                  deleteIcon={<CloseIcon />}
                  sx={{ bgcolor: WA.inputField, color: WA.text }}
                />
              ))}
            </Stack>
          ) : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Box
              onClick={() => setCatalogOpen(true)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.4,
                borderRadius: 4,
                bgcolor: WA.inputField,
                color: WA.text,
                cursor: 'pointer',
                fontSize: '0.8rem',
                '&:hover': { bgcolor: WA.selected },
              }}
            >
              {carrito.length > 0 ? 'Agregar producto' : 'Elegir producto'}
            </Box>
            {carrito.length > 0 ? (
              <Typography sx={{ color: WA.muted, fontSize: '0.75rem' }}>
                Total: {armarPresupuesto(carrito).total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                {' · '}
                Podés editar el texto y después enviar
              </Typography>
            ) : null}
          </Box>
        </Box>
      ) : null}

      {replyTo ? (
        <Box
          sx={{
            mx: 0.5,
            mb: 0.75,
            px: 1.25,
            py: 0.75,
            borderLeft: `3px solid ${WA.accent}`,
            bgcolor: WA.inputField,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: WA.accent, fontWeight: 600, display: 'block' }}>
              Respondiendo
            </Typography>
            <Typography variant="body2" sx={{ color: WA.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {quotedPreviewLabel(replyTo)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onCancelReply} aria-label="Cancelar cita" sx={{ color: WA.icon }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : null}

      {programados.length > 0 ? (
        <Box sx={{ px: 0.5, pb: 0.75 }}>
          <Typography variant="caption" sx={{ color: WA.muted, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <ScheduleIcon sx={{ fontSize: 14 }} /> Programados
          </Typography>
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            {programados.map((item) => (
              <Chip
                key={item.id}
                size="small"
                label={`${(item.contenido || '').slice(0, 24)}${(item.contenido || '').length > 24 ? '…' : ''} · ${item.next_attempt_at ? formatScheduleLocal(item.next_attempt_at) : ''}`}
                onDelete={(e) => {
                  e.stopPropagation();
                  void cancelProgramado(item.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                sx={{ maxWidth: '100%' }}
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      {programar && !notaInterna ? (
        <Stack direction="row" spacing={1} sx={{ px: 0.5, pb: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            type="date"
            size="small"
            value={fechaProgramada}
            onChange={(e) => {
              setFechaProgramada(e.target.value);
              setScheduleError(null);
            }}
            onKeyDown={stopScheduleFieldEnter}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />
          <TextField
            type="time"
            size="small"
            value={horaProgramada}
            onChange={(e) => {
              setHoraProgramada(e.target.value);
              setScheduleError(null);
            }}
            onKeyDown={stopScheduleFieldEnter}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 120 }}
          />
          {scheduleError ? (
            <Typography variant="caption" sx={{ color: 'error.main', width: '100%' }}>
              {scheduleError}
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: WA.muted, width: '100%' }}>
              Se enviará en hora local (Argentina)
            </Typography>
          )}
        </Stack>
      ) : null}

      <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, pb: 0.25, gap: 1, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={notaInterna}
              onChange={(e) => {
                const on = e.target.checked;
                setNotaInterna(on);
                if (on) {
                  setProgramar(false);
                  onCancelReply?.();
                }
              }}
              disabled={disabled}
            />
          }
          label={(
            <Typography variant="caption" sx={{ color: WA.muted, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LockOutlinedIcon sx={{ fontSize: 14 }} /> Nota interna
            </Typography>
          )}
          sx={{ m: 0 }}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={programar}
              onChange={(e) => {
                const on = e.target.checked;
                setProgramar(on);
                if (on) {
                  setNotaInterna(false);
                  const now = currentScheduleFields();
                  setFechaProgramada(now.fecha);
                  setHoraProgramada(now.hora);
                  setScheduleError(null);
                }
              }}
              disabled={disabled || notaInterna}
            />
          }
          label={<Typography variant="caption" sx={{ color: WA.muted }}>Programar envío</Typography>}
          sx={{ m: 0 }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.25, width: '100%' }}>
        <Box
          sx={{
            display: audioBusy ? 'none' : 'flex',
            alignItems: 'flex-end',
            gap: 0.25,
            flex: 1,
            minWidth: 0,
          }}
        >
          {conversationId && onSendFile ? (
            <>
              <Tooltip title="Adjuntar">
                <span>
                  <IconButton
                    disabled={disabled}
                    onClick={(e) => setAttachEl(e.currentTarget)}
                    sx={{ color: WA.icon }}
                    aria-label="Adjuntar"
                  >
                    <AddIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Menu
                anchorEl={attachEl}
                open={Boolean(attachEl)}
                onClose={() => setAttachEl(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                PaperProps={{
                  sx: {
                    bgcolor: WA.menu,
                    color: WA.text,
                    borderRadius: 3,
                    minWidth: 220,
                    py: 1,
                  },
                }}
              >
                <MenuItem
                  disabled={disabled}
                  onClick={() => {
                    setAttachEl(null);
                    fileRef.current?.openDocuments();
                  }}
                >
                  <AttachCircle color="#7f66ff"><InsertDriveFileIcon fontSize="small" /></AttachCircle>
                  Documento
                </MenuItem>
                <MenuItem
                  disabled={disabled}
                  onClick={() => {
                    setAttachEl(null);
                    fileRef.current?.openImages();
                  }}
                >
                  <AttachCircle color="#007bfc"><PhotoLibraryIcon fontSize="small" /></AttachCircle>
                  Fotos y videos
                </MenuItem>
                {onSendAudio ? (
                  <MenuItem
                    disabled={disabled}
                    onClick={() => {
                      setAttachEl(null);
                      audioStartRef.current?.();
                    }}
                  >
                    <AttachCircle color="#ff8a00"><HeadsetIcon fontSize="small" /></AttachCircle>
                    Audio
                  </MenuItem>
                ) : null}
              </Menu>
            </>
          ) : null}

          <EmojiPickerComponent onEmojiSelect={handleEmojiSelect} disabled={disabled} />
          <Tooltip title="Respuestas rápidas">
            <span>
              <IconButton
                disabled={disabled}
                onClick={() => setManage(true)}
                sx={{ color: WA.icon }}
                aria-label="Respuestas rápidas"
              >
                <BoltIcon />
              </IconButton>
            </span>
          </Tooltip>

          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            value={mensaje}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
                bgcolor: WA.inputField,
                color: WA.text,
                '& fieldset': { border: 'none' },
                '&:hover fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' },
              },
              '& .MuiInputBase-input': {
                py: 1.15,
                px: 1.5,
                color: WA.text,
                '&::placeholder': { color: WA.muted, opacity: 1 },
              },
            }}
          />
        </Box>

        {onSendAudio ? (
          <Box
            sx={{
              display: hasText && !audioBusy ? 'none' : 'flex',
              flex: audioBusy ? 1 : undefined,
              width: audioBusy ? '100%' : 'auto',
              minWidth: audioBusy ? 0 : undefined,
            }}
          >
            <AudioRecorder
              onAudioRecorded={onSendAudio}
              disabled={disabled}
              startRef={audioStartRef}
              onBusyChange={setAudioBusy}
            />
          </Box>
        ) : null}

        {hasText && !audioBusy ? (
          <Tooltip title="Enviar mensaje">
            <span>
              <IconButton
                onClick={handleSend}
                disabled={disabled}
                sx={{ color: WA.accent }}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
      </Box>

      <QuickReplyManager
        open={manage}
        onClose={() => setManage(false)}
        items={respuestas}
        onChanged={() => { void loadRespuestas(); }}
        onOpenCatalog={() => router.push('/catalogo')}
      />
    </Paper>
  );
}
