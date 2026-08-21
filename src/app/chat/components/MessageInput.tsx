import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import HeadsetIcon from '@mui/icons-material/Headset';
import SendIcon from '@mui/icons-material/Send';
import BoltIcon from '@mui/icons-material/Bolt';
import FileUpload, { type FileUploadHandle } from './FileUpload';
import EmojiPickerComponent from './EmojiPicker';
import AudioRecorder from './AudioRecorder';
import { QuickReplyManager, QuickReplyPicker } from './QuickReplies';
import { CatalogManager, CatalogPicker } from './CatalogPicker';
import { WA } from '@/app/chat/chatTheme';
import {
  draftNeedsCatalog,
  fillCatalogPlaceholders,
  filterRespuestasRapidas,
  insertRespuestaInDraft,
  parseSlashDraft,
  type RespuestaRapida,
  type RespuestaVars,
} from '@/lib/chat/respuestasRapidas';
import { catalogAttachment, type CatalogoItem } from '@/lib/chat/catalogoVentas';

interface MessageInputProps {
  onSendMessage: (contenido: string) => void;
  onSendFile?: (url: string, fileName: string, fileType: string, mimeType?: string, caption?: string) => void;
  onSendAudio?: (audioBlob: Blob, duration: number) => void;
  conversationId?: string;
  disabled?: boolean;
  placeholder?: string;
  enviando?: boolean;
  onTyping?: (isTyping: boolean) => void;
  respuestaVars?: RespuestaVars;
  manageOpen?: boolean;
  onManageOpenChange?: (open: boolean) => void;
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
  onSendFile,
  onSendAudio,
  conversationId,
  disabled = false,
  placeholder = 'Escribe un mensaje o / para respuestas',
  onTyping,
  respuestaVars,
  manageOpen,
  onManageOpenChange,
}: MessageInputProps) {
  const [mensaje, setMensaje] = useState('');
  const [attachEl, setAttachEl] = useState<HTMLElement | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [respuestas, setRespuestas] = useState<RespuestaRapida[]>([]);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const [localManageOpen, setLocalManageOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogManageOpen, setCatalogManageOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogoItem | null>(null);
  const manage = manageOpen ?? localManageOpen;
  const setManage = onManageOpenChange ?? setLocalManageOpen;
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<FileUploadHandle>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioStartRef = useRef<(() => void) | null>(null);

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

  useEffect(() => {
    void loadRespuestas();
    void loadCatalogo();
  }, []);

  const slash = parseSlashDraft(mensaje);
  const slashOpen = slash.active && !slashDismissed && !audioBusy;
  const slashItems = slashOpen ? filterRespuestasRapidas(respuestas, slash.query) : [];

  useEffect(() => {
    setSlashIndex(0);
  }, [slash.query, slashOpen]);

  const applyRespuesta = (item: RespuestaRapida) => {
    const next = insertRespuestaInDraft(mensaje, item.texto, respuestaVars || {});
    setMensaje(next);
    setSlashDismissed(true);
    setSelectedCatalog(null);
    if (draftNeedsCatalog(next)) setCatalogOpen(true);
    onTyping?.(next.length > 0);
  };

  const applyCatalogItem = (item: CatalogoItem) => {
    const next = fillCatalogPlaceholders(mensaje, {
      nombre: respuestaVars?.nombre,
      telefono: respuestaVars?.telefono,
      item: { nombre: item.nombre, precio: item.precio },
    });
    setMensaje(next);
    setSelectedCatalog(item);
    setCatalogOpen(false);
    onTyping?.(next.length > 0);
  };

  const handleSend = () => {
    if (disabled) return;
    if (slashOpen && slashItems[slashIndex]) {
      applyRespuesta(slashItems[slashIndex]);
      return;
    }
    const texto = mensaje.trim();
    if (!texto) return;
    const attach = selectedCatalog ? catalogAttachment(selectedCatalog) : null;
    if (attach && onSendFile) {
      onSendFile(attach.url, attach.fileName, attach.fileType, undefined, texto);
    } else {
      onSendMessage(texto);
    }
    setMensaje('');
    setSelectedCatalog(null);
    setCatalogOpen(false);
    setSlashDismissed(false);
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
        setSlashIndex((i) => Math.min(i + 1, Math.max(slashItems.length - 1, 0)));
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
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && slashItems[slashIndex]) {
        e.preventDefault();
        applyRespuesta(slashItems[slashIndex]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
        <QuickReplyPicker
          items={slashItems}
          selectedIndex={slashIndex}
          onHover={setSlashIndex}
          onSelect={applyRespuesta}
          onManage={() => setManage(true)}
        />
      ) : null}

      {catalogOpen && !slashOpen ? (
        <CatalogPicker
          items={catalogo}
          onSelect={applyCatalogItem}
          onManage={() => {
            setCatalogOpen(false);
            setCatalogManageOpen(true);
          }}
        />
      ) : null}

      {conversationId && onSendFile ? (
        <FileUpload
          ref={fileRef}
          onFileUploaded={onSendFile}
          conversationId={conversationId}
          disabled={disabled}
        />
      ) : null}

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

      {(draftNeedsCatalog(mensaje) || selectedCatalog) && !audioBusy ? (
        <Box
          onClick={() => setCatalogOpen(true)}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            ml: 6,
            mt: 0.75,
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
          {selectedCatalog ? `${selectedCatalog.nombre} · cambiar` : 'Elegir producto'}
        </Box>
      ) : null}

      <QuickReplyManager
        open={manage}
        onClose={() => setManage(false)}
        items={respuestas}
        onChanged={() => { void loadRespuestas(); }}
        onOpenCatalog={() => setCatalogManageOpen(true)}
      />
      <CatalogManager
        open={catalogManageOpen}
        onClose={() => setCatalogManageOpen(false)}
        items={catalogo}
        onChanged={() => { void loadCatalogo(); }}
      />
    </Paper>
  );
}
