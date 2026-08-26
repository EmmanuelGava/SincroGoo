"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent, useTheme, Badge, FormControlLabel, Radio, RadioGroup, Chip } from "@mui/material";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import BusinessIcon from '@mui/icons-material/Business';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { IconButton, Tooltip } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import AlarmIcon from '@mui/icons-material/Alarm';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import Autocomplete from '@mui/material/Autocomplete';
import { useLeadsKanbanContext } from '../contexts/LeadsKanbanContext';
import { Lead } from '@/app/tipos/lead';
import { Estado } from '../contexts/LeadsKanbanContext';
import { FormularioLead } from './FormularioLead';
import { FormularioEdicionLead } from './FormularioEdicionLead';
import SidebarMensajesEntrantes from './SidebarMensajesEntrantes';
import InboxStatsPanel from './InboxStatsPanel';
import { isEstadoPerdido, MOTIVOS_PERDIDO, MOTIVO_PERDIDO_LABEL, type MotivoPerdido } from '@/lib/contactos/estadoLead';
import {
  filtrarLeadsKanban,
  formatFechaCierreLead,
  formatValorLead,
  hayFiltrosKanbanActivos,
  collectEtiquetasUnicas,
  LEAD_SCORE_LABEL,
  type KanbanCanalFiltro,
  type LeadKanbanFiltros,
  type LeadScore,
} from '@/lib/crm/leadKanbanFilters';
import { humanizeSeguimientoHoras } from '@/lib/crm/seguimientoInbox';
import { resolveTaskBadgeKind, TASK_BADGE_LABEL } from '@/lib/crm/leadTaskBadge';
import RecordatorioLeadModal from './RecordatorioLeadModal';
import { buildLeadsPorEstado } from '@/lib/crm/kanbanOrder';

const scoreChipColor: Record<LeadScore, 'error' | 'warning' | 'default'> = {
  alta: 'error',
  media: 'warning',
  baja: 'default',
};

const colorPalette = [
  '#4ECCA3', // Mint Green
  '#F06292', // Pink
  '#FFD54F', // Yellow
  '#7986CB', // Indigo
  '#4FC3F7', // Light Blue
  '#FF8A65', // Orange
  '#A1887F', // Brown
  '#90A4AE', // Blue Grey
];

const iconMap: { [key: string]: React.ElementType } = {
  'RadioButtonUnchecked': RadioButtonUncheckedIcon,
  'HourglassEmpty': HourglassEmptyIcon,
  'Autorenew': AutorenewIcon,
  'TrendingUp': TrendingUpIcon,
  'WorkOutline': WorkOutlineIcon,
  'CheckCircleOutline': CheckCircleOutlineIcon,
  'ThumbUpOffAlt': ThumbUpOffAltIcon,
  'Cancel': CancelIcon,
  'ThumbDownOffAlt': ThumbDownOffAltIcon,
  'FlagOutlined': FlagOutlinedIcon,
  'Add': AddIcon,
  'Delete': DeleteIcon,
};

const iconList = Object.keys(iconMap);

// Remove hardcoded colors - will use theme colors instead

function TarjetaLead({
  lead,
  index,
  onEdit,
  onDelete,
  onRecordatorio,
  onCompleteTask,
  colors,
  highlighted,
}: {
  lead: Lead;
  index: number;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onRecordatorio: (lead: Lead) => void;
  onCompleteTask: (lead: Lead) => void;
  colors: any;
  highlighted?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const seguimiento = Boolean(lead.esperando_seguimiento);
  const seguimientoHint = seguimiento
    ? `Esperando tu respuesta hace ${humanizeSeguimientoHoras(lead.seguimiento_horas)}`
    : '';
  const taskBadge = resolveTaskBadgeKind(lead.proxima_tarea);
  const etiquetas = lead.contacto_etiquetas || [];
  const visibleTags = etiquetas.slice(0, 2);
  const extraTags = etiquetas.length - visibleTags.length;

  return (
    <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
      {(provided, snapshot) => (
        <Paper
          id={`kanban-lead-${lead.id}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          elevation={0}
          sx={{
            p: 1.5,
            bgcolor: highlighted
              ? theme.palette.action.selected
              : seguimiento
                ? 'rgba(237, 108, 2, 0.08)'
                : colors.card,
            border: highlighted
              ? `2px solid ${theme.palette.primary.main}`
              : seguimiento
                ? '2px solid #ed6c02'
                : `1px solid ${colors.border}`,
            borderLeft: seguimiento ? '4px solid #ed6c02' : undefined,
            boxShadow: highlighted ? `0 0 0 2px ${theme.palette.primary.main}33` : 'none',
            borderRadius: 2,
            cursor: 'grab',
            position: 'relative',
            transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
            '&:hover': {
              bgcolor: theme.palette.action.hover,
              '& .actions': { opacity: 1 }
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pr: 8 }}>
            <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: 500, flex: 1, minWidth: 0 }}>
              {lead.nombre}
            </Typography>
            {seguimiento && (
              <Tooltip title={seguimientoHint}>
                <Chip
                  label="Seguimiento"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: 'rgba(237, 108, 2, 0.15)',
                    color: '#ffb74d',
                    border: '1px solid rgba(237, 108, 2, 0.4)',
                  }}
                />
              </Tooltip>
            )}
            {taskBadge === 'overdue' || taskBadge === 'today' ? (
              <Tooltip title={lead.proxima_tarea?.title || TASK_BADGE_LABEL[taskBadge]}>
                <Chip
                  label={taskBadge === 'overdue' ? '🔴 Vencida' : '🟡 Hoy'}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompleteTask(lead);
                  }}
                  sx={{ height: 20, fontSize: '0.65rem', cursor: 'pointer' }}
                />
              </Tooltip>
            ) : null}
            {(lead.unread_count || 0) > 0 && (
              <Badge
                badgeContent={lead.unread_count}
                color="primary"
                max={99}
                sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none' } }}
              />
            )}
          </Box>

          {visibleTags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
              {visibleTags.map((tag) => (
                <Chip
                  key={tag}
                  icon={<LocalOfferOutlinedIcon sx={{ fontSize: '0.75rem !important' }} />}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.65rem' }}
                />
              ))}
              {extraTags > 0 ? (
                <Chip label={`+${extraTags}`} size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
              ) : null}
            </Box>
          )}

          {lead.empresa && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <BusinessIcon sx={{ fontSize: '0.875rem', color: colors.textSecondary }} />
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                {lead.empresa}
              </Typography>
            </Box>
          )}

          {(lead.score || lead.valor_potencial != null || lead.fecha_cierre) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
              {lead.score && (
                <Chip
                  size="small"
                  label={LEAD_SCORE_LABEL[lead.score]}
                  color={scoreChipColor[lead.score]}
                  variant={lead.score === 'baja' ? 'outlined' : 'filled'}
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                />
              )}
              {formatValorLead(lead.valor_potencial) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <AttachMoneyIcon sx={{ fontSize: '0.85rem', color: colors.textSecondary }} />
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 500 }}>
                    {formatValorLead(lead.valor_potencial)}
                  </Typography>
                </Box>
              )}
              {formatFechaCierreLead(lead.fecha_cierre) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <EventIcon sx={{ fontSize: '0.85rem', color: colors.textSecondary }} />
                  <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                    {formatFechaCierreLead(lead.fecha_cierre)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {lead.ultimo_mensaje ? (
            <Typography
              variant="body2"
              sx={{
                color: colors.textSecondary,
                mt: 1,
                fontSize: '0.8rem',
                lineHeight: 1.35,
                whiteSpace: 'pre-line',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word',
              }}
            >
              {lead.ultimo_mensaje}
            </Typography>
          ) : lead.conversacion_id ? (
            <Typography variant="caption" sx={{ color: colors.textSecondary, mt: 1, display: 'block' }}>
              Sin mensajes
            </Typography>
          ) : null}
          <Box 
            className="actions"
            sx={{ 
              position: 'absolute',
              top: 4, right: 4,
              display: 'flex',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
          >
            <Tooltip title="Recordarme">
              <IconButton size="small" onClick={() => onRecordatorio(lead)}>
                <AlarmIcon sx={{ fontSize: '1rem', color: colors.textSecondary }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Abrir chat">
              <span>
                <IconButton
                  size="small"
                  disabled={!lead.conversacion_id}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (lead.conversacion_id) {
                      router.push(`/chat?conversacion=${lead.conversacion_id}`);
                    }
                  }}
                >
                  <ChatIcon sx={{ fontSize: '1rem', color: colors.textSecondary }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Editar lead">
              <IconButton size="small" onClick={() => onEdit(lead)}>
                <EditIcon sx={{ fontSize: '1rem', color: colors.textSecondary }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar lead">
              <IconButton size="small" onClick={() => onDelete(lead)}>
                <DeleteIcon sx={{ fontSize: '1rem', color: colors.textSecondary }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      )}
    </Draggable>
  );
}

export default function KanbanLeads() {
  const theme = useTheme();
  const router = useRouter();
  
  // Theme-aware colors
  const colors = {
    background: theme.palette.background.default,
    textPrimary: theme.palette.text.primary,
    textSecondary: theme.palette.text.secondary,
    card: theme.palette.background.paper,
    border: theme.palette.divider,
    column: theme.palette.background.paper,
    primaryAccent: theme.palette.primary.main,
  };
  
  const {
    estados: estadosGlobal,
    leads,
    loading,
    error,
    moverLead,
    agregarEstado: crearEstado,
    actualizarEstado,
    eliminarEstado,
    eliminarLead,
    convertirIncomingEnLead,
    setDragLock,
    refrescarLeads,
  } = useLeadsKanbanContext();

  const [estados, setEstados] = useState<Estado[]>(estadosGlobal);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!isDragging.current) {
      setEstados(estadosGlobal);
    }
  }, [estadosGlobal]);

  const [open, setOpen] = useState(false);
  const [nuevoLeadEstadoId, setNuevoLeadEstadoId] = useState<string | null>(null);
  const [openEstado, setOpenEstado] = useState(false);
  const [editEstado, setEditEstado] = useState<null | { id?: string; nombre: string; color?: string; orden: number, icono?: string }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { id: string; nombre: string }>(null);
  const [editLead, setEditLead] = useState<null | Lead>(null);
  const [highlightLeadId, setHighlightLeadId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const handledLeadParamRef = useRef<string | null>(null);

  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (!leadId) {
      handledLeadParamRef.current = null;
      return;
    }
    if (leads.length === 0) return;
    if (handledLeadParamRef.current === leadId) return;

    const match = leads.find((item) => item.id === leadId);
    if (!match) return;

    handledLeadParamRef.current = leadId;
    setHighlightLeadId(leadId);

    window.requestAnimationFrame(() => {
      document.getElementById(`kanban-lead-${leadId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });

    router.replace('/crm', { scroll: false });

    const timer = window.setTimeout(() => setHighlightLeadId(null), 3500);
    return () => window.clearTimeout(timer);
  }, [searchParams, leads, router]);
  const [confirmDeleteLead, setConfirmDeleteLead] = useState<null | Lead>(null);
  const [pendingIncomingChoice, setPendingIncomingChoice] = useState<null | {
    conversationId: string;
    estadoId: string;
    destIndex: number;
    contactoId: string;
    openLead: { id: string; nombre: string; estado_id: string };
  }>(null);
  const [pendingPerdido, setPendingPerdido] = useState<null | {
    leadId: string;
    destEstadoId: string;
    sourceEstadoId: string;
    destIndex: number;
    leadNombre: string;
  }>(null);
  const [motivoPerdido, setMotivoPerdido] = useState<MotivoPerdido>('precio');
  
  // Estado para columnas colapsadas
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [filtros, setFiltros] = useState<LeadKanbanFiltros>({
    canal: '',
    valorMin: null,
    valorMax: null,
    fechaCierreDesde: null,
    fechaCierreHasta: null,
    query: '',
    soloSeguimiento: false,
    etiquetas: [],
  });
  const [busquedaInput, setBusquedaInput] = useState('');
  const [recordatorioLead, setRecordatorioLead] = useState<Lead | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFiltros((prev) => ({ ...prev, query: busquedaInput.trim() }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [busquedaInput]);

  const parseOptionalNumber = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const hayFiltrosActivos = hayFiltrosKanbanActivos(filtros);
  const etiquetaOpciones = collectEtiquetasUnicas(leads);
  const leadsFiltrados = filtrarLeadsKanban(leads, filtros);

  // Función para alternar el colapso de una columna
  const toggleColumnCollapse = (estadoId: string) => {
    const newCollapsed = new Set(collapsedColumns);
    if (newCollapsed.has(estadoId)) {
      newCollapsed.delete(estadoId);
    } else {
      newCollapsed.add(estadoId);
    }
    setCollapsedColumns(newCollapsed);
  };

  const leadsPorEstado = buildLeadsPorEstado(
    leadsFiltrados,
    estados.map((estado) => estado.id),
  );

  const onDragEnd = async (result: DropResult) => {
    isDragging.current = false;
    if (!result.destination) {
      setDragLock(false);
      return;
    }
    if (result.type === 'COLUMN') {
      const sourceIdx = result.source.index;
      const destIdx = result.destination.index;
      if (sourceIdx === destIdx) {
        setDragLock(false);
        return;
      }
      const newEstados = Array.from(estados);
      const [removed] = newEstados.splice(sourceIdx, 1);
      newEstados.splice(destIdx, 0, removed);
      setEstados(newEstados);
      await Promise.all(newEstados.map((estado, idx) => actualizarEstado(estado.id, { orden: idx })));
      setDragLock(false);
      return;
    }
    const { source, destination, draggableId } = result;
    const sourceEstadoId = source.droppableId;
    const destEstadoId = destination.droppableId;
    const destIndex = destination.index;

    // La lista de entrantes solo es origen; no se puede soltar leads ahí.
    if (destEstadoId === 'incoming-chats') {
      setDragLock(false);
      return;
    }

    if (String(draggableId).startsWith('incoming:')) {
      const conversationId = String(draggableId).slice('incoming:'.length);
      try {
        const result = await convertirIncomingEnLead(conversationId, destEstadoId, { destIndex });
        if (result?.needsChoice) {
          setPendingIncomingChoice({
            conversationId,
            estadoId: destEstadoId,
            destIndex,
            contactoId: result.contactoId,
            openLead: result.openLead,
          });
        }
      } catch (error) {
        console.error('Error pasando chat al Kanban:', error);
      } finally {
        setDragLock(false);
      }
      return;
    }
    
    const leadToMove = leads.find(lead => String(lead.id) === String(draggableId));
    if (!leadToMove) {
      setDragLock(false);
      return;
    }
    // Card optimista aún sin UUID real: no pegarle al API.
    if (String(draggableId).startsWith('optimistic:')) {
      setDragLock(false);
      return;
    }

    const destEstado = estados.find((estado) => estado.id === destEstadoId);
    if (!destEstado) {
      setDragLock(false);
      return;
    }
    if (destEstado && isEstadoPerdido(destEstado.nombre)) {
      setMotivoPerdido('precio');
      setPendingPerdido({
        leadId: draggableId,
        destEstadoId,
        sourceEstadoId,
        destIndex,
        leadNombre: leadToMove.nombre || 'Lead',
      });
      setDragLock(false);
      return;
    }
    
    try {
      await moverLead(draggableId, destEstadoId, { destIndex, sourceEstadoId });
    } catch (error) {
      console.error('Error moviendo lead:', error);
    } finally {
      setDragLock(false);
    }
  };

  const onBeforeDragStart = () => {
    isDragging.current = true;
    setDragLock(true);
  };
  const handleOpen = (estadoId?: string) => {
    setNuevoLeadEstadoId(estadoId || estados[0]?.id || null);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setNuevoLeadEstadoId(null);
  };
  const handleOpenEstado = (estado?: typeof editEstado) => {
    setEditEstado(estado || { nombre: '', color: colorPalette[0], orden: estados.length, icono: iconList[0] });
    setOpenEstado(true);
  };
  const handleCloseEstado = () => { setOpenEstado(false); setEditEstado(null); };
  const handleChangeEstado = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editEstado) return;
    setEditEstado({ ...editEstado, [e.target.name]: e.target.value });
  };
  const handleColorChange = (newColor: string) => {
    if (!editEstado) return;
    setEditEstado({ ...editEstado, color: newColor });
  };
  const handleIconChange = (newIcon: string) => {
    if (!editEstado) return;
    setEditEstado({ ...editEstado, icono: newIcon });
  };
  const handleGuardarEstado = async () => {
    if (!editEstado?.nombre) return;
    const estadoData = { nombre: editEstado.nombre, color: editEstado.color, orden: editEstado.orden, icono: editEstado.icono };
    if (editEstado.id) {
      await actualizarEstado(editEstado.id, estadoData);
    } else {
      await crearEstado(estadoData);
    }
    handleCloseEstado();
  };
  const handleDeleteEstado = async () => {
    if (confirmDelete) {
      await eliminarEstado(confirmDelete.id);
      setConfirmDelete(null);
    }
  };
  const handleOpenEditLead = (lead: Lead) => setEditLead(lead);
  const handleCloseEditLead = () => setEditLead(null);
  const handleDeleteLead = async () => {
    if (!confirmDeleteLead) return;
    await eliminarLead(confirmDeleteLead.id);
    setConfirmDeleteLead(null);
  };

  const pendingEtapaNombre = pendingIncomingChoice
    ? (estados.find((estado) => estado.id === pendingIncomingChoice.openLead.estado_id)?.nombre || 'otra etapa')
    : '';

  const handleMoverLeadAbierto = async () => {
    if (!pendingIncomingChoice) return;
    const pending = pendingIncomingChoice;
    setPendingIncomingChoice(null);
    try {
      await convertirIncomingEnLead(pending.conversationId, pending.estadoId, {
        reuseLeadId: pending.openLead.id,
        destIndex: pending.destIndex,
      });
    } catch (error) {
      console.error('Error moviendo el deal existente:', error);
    }
  };

  const handleCrearLeadNuevo = async () => {
    if (!pendingIncomingChoice) return;
    const pending = pendingIncomingChoice;
    setPendingIncomingChoice(null);
    try {
      await convertirIncomingEnLead(pending.conversationId, pending.estadoId, {
        forceNewLead: true,
        destIndex: pending.destIndex,
      });
    } catch (error) {
      console.error('Error creando un deal nuevo:', error);
    }
  };

  const handleCompleteTask = async (lead: Lead) => {
    if (!lead.proxima_tarea?.id) return;
    try {
      await fetch('/api/dashboard/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: lead.proxima_tarea.id, status: 'completed' }),
      });
      refrescarLeads();
    } catch (error) {
      console.error('Error completando tarea:', error);
    }
  };

  const handleConfirmarPerdido = async () => {
    if (!pendingPerdido) return;
    const pending = pendingPerdido;
    setPendingPerdido(null);
    try {
      await moverLead(pending.leadId, pending.destEstadoId, {
        destIndex: pending.destIndex,
        sourceEstadoId: pending.sourceEstadoId,
        motivo: motivoPerdido,
      });
    } catch (error) {
      console.error('Error moviendo lead a Perdido:', error);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd} onBeforeDragStart={onBeforeDragStart}>
    <Box sx={{ display: 'flex', flexDirection: 'row', bgcolor: colors.background, color: colors.textPrimary, height: '100%', width: '100%' }}>
      <SidebarMensajesEntrantes />
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Cargando Kanban...</Typography></Box>
      ) : error ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="error">{error}</Typography></Box>
      ) : (
      <>
      {/* Kanban principal */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 2, pt: 1, pb: 1 }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.25,
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              borderRadius: 2,
              border: `1px solid ${colors.border}`,
              bgcolor: colors.card,
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', minWidth: 0 }}>
              <TextField
                size="small"
                placeholder="Buscar nombre, teléfono…"
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ fontSize: 18, color: colors.textSecondary, mr: 0.5 }} />,
                }}
                sx={{ minWidth: 180, maxWidth: 220 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="filtro-canal-label">Canal</InputLabel>
                <Select
                  labelId="filtro-canal-label"
                  label="Canal"
                  value={filtros.canal || ''}
                  onChange={(e: SelectChangeEvent) =>
                    setFiltros((prev) => ({ ...prev, canal: e.target.value as KanbanCanalFiltro | '' }))
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="telegram">Telegram</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                type="number"
                label="Valor mín."
                value={filtros.valorMin ?? ''}
                onChange={(e) => setFiltros((prev) => ({ ...prev, valorMin: parseOptionalNumber(e.target.value) }))}
                sx={{ width: 100 }}
              />
              <TextField
                size="small"
                type="number"
                label="Valor máx."
                value={filtros.valorMax ?? ''}
                onChange={(e) => setFiltros((prev) => ({ ...prev, valorMax: parseOptionalNumber(e.target.value) }))}
                sx={{ width: 100 }}
              />
              <TextField
                size="small"
                type="date"
                label="Cierre desde"
                InputLabelProps={{ shrink: true }}
                value={filtros.fechaCierreDesde || ''}
                onChange={(e) => setFiltros((prev) => ({ ...prev, fechaCierreDesde: e.target.value || null }))}
                sx={{ width: 145 }}
              />
              <TextField
                size="small"
                type="date"
                label="Cierre hasta"
                InputLabelProps={{ shrink: true }}
                value={filtros.fechaCierreHasta || ''}
                onChange={(e) => setFiltros((prev) => ({ ...prev, fechaCierreHasta: e.target.value || null }))}
                sx={{ width: 145 }}
              />
              <Chip
                icon={<FilterAltOutlinedIcon />}
                label="Solo seguimiento"
                size="small"
                clickable
                color={filtros.soloSeguimiento ? 'warning' : 'default'}
                variant={filtros.soloSeguimiento ? 'filled' : 'outlined'}
                onClick={() => setFiltros((prev) => ({ ...prev, soloSeguimiento: !prev.soloSeguimiento }))}
              />
              <Autocomplete
                multiple
                size="small"
                options={etiquetaOpciones}
                value={filtros.etiquetas || []}
                onChange={(_e, value) => setFiltros((prev) => ({ ...prev, etiquetas: value }))}
                renderInput={(params) => (
                  <TextField {...params} label="Etiquetas" placeholder="Filtrar" />
                )}
                sx={{ minWidth: 160, maxWidth: 240 }}
              />
              {hayFiltrosActivos && (
                <Button
                  size="small"
                  onClick={() => {
                    setBusquedaInput('');
                    setFiltros({
                      canal: '',
                      valorMin: null,
                      valorMax: null,
                      fechaCierreDesde: null,
                      fechaCierreHasta: null,
                      query: '',
                      soloSeguimiento: false,
                      etiquetas: [],
                    });
                  }}
                  sx={{ textTransform: 'none', color: colors.textSecondary }}
                >
                  Limpiar
                </Button>
              )}
              {hayFiltrosActivos && (
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  {leadsFiltrados.length}/{leads.length}
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: '1 1 220px', minWidth: 0, display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <InboxStatsPanel />
            </Box>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflowX: 'auto', overflowY: 'hidden', px: 2, pb: 2, pt: 0 }}>
            <Droppable droppableId="kanban-columns" direction="horizontal" type="COLUMN">
              {(provided) => (
                <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ display: 'flex', gap: 2, height: '100%' }}>
                  {estados.map((estado, idx) => {
                    const isCollapsed = collapsedColumns.has(estado.id);
                    return (
                      <Draggable draggableId={"col-" + estado.id} index={idx} key={estado.id}>
                        {(provided) => (
                          <Box 
                            ref={provided.innerRef} 
                            {...provided.draggableProps} 
                            sx={{ 
                              minWidth: isCollapsed ? 80 : 280, 
                              maxWidth: isCollapsed ? 80 : 280, 
                              ...provided.draggableProps.style, 
                              height: '100%',
                              transition: 'all 0.3s ease-in-out'
                            }}
                          >
                            {isCollapsed ? (
                              // Vista colapsada - altura mínima sin fondo de card
                              <Box 
                                sx={{ 
                                  height: 'fit-content',
                                  minHeight: '200px', // Altura mínima como en Plane.so
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  bgcolor: 'transparent', // Sin fondo de card
                                  p: 1,
                                  position: 'relative',
                                  cursor: 'pointer'
                                }}
                                onClick={() => toggleColumnCollapse(estado.id)}
                              >
                                {/* Botón de expandir sin fondo para consistencia */}
                                <Tooltip title="Clic para expandir columna" placement="right">
                                  <IconButton 
                                    sx={{ 
                                      width: '100%',
                                      py: 1,
                                      mb: 1,
                                      borderRadius: 1,
                                      color: colors.textSecondary,
                                      '&:hover': {
                                        bgcolor: theme.palette.action.hover,
                                        color: colors.primaryAccent
                                      }
                                    }}
                                  >
                                    <UnfoldMoreIcon sx={{ fontSize: '1.2rem' }} />
                                  </IconButton>
                                </Tooltip>

                                {/* Icono y contador en la parte superior */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                                  {/* Icono */}
                                  {estado.icono && React.createElement(iconMap[estado.icono] || RadioButtonUncheckedIcon, { 
                                    sx: { color: estado.color || colors.textSecondary, fontSize: '1.2rem', mb: 0.5 } 
                                  })}
                                  {!estado.icono && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: estado.color || colors.textSecondary, mb: 0.5 }} />}
                                  
                                  {/* Contador */}
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: colors.textPrimary, 
                                      fontWeight: 700,
                                      fontSize: '0.8rem',
                                      border: `1px solid ${colors.border}`,
                                      px: 0.75,
                                      py: 0.25,
                                      borderRadius: '50%',
                                      minWidth: '20px',
                                      textAlign: 'center',
                                      bgcolor: colors.background
                                    }}
                                  >
                                    {leadsPorEstado[estado.id]?.length || 0}
                                  </Typography>
                                </Box>

                                {/* Título vertical alineado con los otros elementos */}
                                <Box sx={{ 
                                  flexGrow: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'visible', // Permitir que el texto se vea completo
                                  width: '100%',
                                  position: 'relative',
                                  minHeight: `${Math.max(estado.nombre.length * 8, 80)}px` // Altura dinámica para el texto
                                }}>
                                  <Box sx={{
                                    transform: 'rotate(90deg)',
                                    transformOrigin: 'center center',
                                    whiteSpace: 'nowrap',
                                    width: 'max-content',
                                    position: 'absolute' // Posicionamiento absoluto para evitar restricciones
                                  }}>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        fontWeight: 600, 
                                        color: colors.textPrimary,
                                        letterSpacing: '1px',
                                        fontSize: '0.8rem',
                                        textTransform: 'uppercase'
                                      }}
                                    >
                                      {estado.nombre}
                                    </Typography>
                                  </Box>
                                </Box>

                                {/* Espaciador para empujar el botón de editar hacia abajo */}
                                <Box sx={{ flexGrow: 1 }} />

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                                  <Tooltip title="Nuevo lead" placement="right">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpen(estado.id);
                                      }}
                                      sx={{
                                        bgcolor: colors.background,
                                        '&:hover': { bgcolor: colors.border },
                                      }}
                                    >
                                      <AddIcon sx={{ color: colors.textSecondary, fontSize: '1rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Editar columna" placement="right">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEstado({ ...estado });
                                      }}
                                      sx={{
                                        bgcolor: colors.background,
                                        '&:hover': { bgcolor: colors.border },
                                      }}
                                    >
                                      <EditIcon sx={{ color: colors.textSecondary, fontSize: '1rem' }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>

                                {/* Droppable oculto para permitir drop en columnas colapsadas */}
                                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, pointerEvents: 'none' }}>
                                  <Droppable droppableId={estado.id.toString()} type="LEAD">
                                    {(provided) => (
                                      <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ height: '100%' }}>
                                        {provided.placeholder}
                                      </Box>
                                    )}
                                  </Droppable>
                                </Box>
                              </Box>
                            ) : (
                              // Vista expandida - normal
                              <Box sx={{ p: 1.5, width: '100%', bgcolor: 'transparent', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box {...provided.dragHandleProps} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, cursor: 'grab' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    {estado.icono && React.createElement(iconMap[estado.icono] || RadioButtonUncheckedIcon, { sx: { color: estado.color || colors.textSecondary, fontSize: '1rem' } })}
                                    {!estado.icono && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: estado.color || colors.textSecondary }} />}
                                    <Typography variant="body1" sx={{ fontWeight: 500, color: colors.textPrimary }}>{estado.nombre}</Typography>
                                    <Typography component="span" sx={{ color: colors.textSecondary, fontWeight: 400, fontSize: '0.875rem' }}>
                                      {leadsPorEstado[estado.id]?.length || 0}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <Tooltip title="Colapsar columna">
                                      <IconButton size="small" onClick={() => toggleColumnCollapse(estado.id)}>
                                        <UnfoldLessIcon sx={{ color: colors.textSecondary, fontSize: '1rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Nuevo lead en esta columna">
                                      <IconButton size="small" onClick={() => handleOpen(estado.id)}>
                                        <AddIcon sx={{ color: colors.textSecondary, fontSize: '1.1rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Editar columna">
                                      <IconButton size="small" onClick={() => handleOpenEstado({ ...estado })}>
                                        <EditIcon sx={{ color: colors.textSecondary, fontSize: '1rem' }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                                <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', p: '0 4px', m: '0 -4px' }}>
                                  <Droppable droppableId={estado.id.toString()} type="LEAD">
                                    {(provided) => (
                                      <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 160 }}>
                                        {leadsPorEstado[estado.id]?.map((lead, idx) => (
                                          <TarjetaLead
                                            key={lead.id}
                                            lead={lead}
                                            index={idx}
                                            onEdit={handleOpenEditLead}
                                            onDelete={setConfirmDeleteLead}
                                            onRecordatorio={setRecordatorioLead}
                                            onCompleteTask={handleCompleteTask}
                                            colors={colors}
                                            highlighted={highlightLeadId === lead.id}
                                          />
                                        ))}
                                        {provided.placeholder}
                                      </Box>
                                    )}
                                  </Droppable>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Draggable>
                    );
                  })}
                  <Box sx={{ minWidth: 280, maxWidth: 280 }}>
                    <Button fullWidth onClick={() => handleOpenEstado()} sx={{ color: colors.textSecondary, bgcolor: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 3, p: 1, textTransform: 'none', '&:hover': { bgcolor: colors.column, borderColor: colors.textSecondary }, height: '48px' }}>
                      <AddIcon sx={{ mr: 1 }} /> Nueva columna
                    </Button>
                  </Box>
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
        </Box>
        
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: colors.column, color: colors.textPrimary } }}>
          <DialogTitle>Nuevo Lead</DialogTitle>
          <DialogContent>
            {nuevoLeadEstadoId || estados.length > 0
              ? <FormularioLead key={nuevoLeadEstadoId || estados[0].id} estadoId={nuevoLeadEstadoId || estados[0].id} onClose={handleClose} />
              : <Typography>Crea una columna para añadir un lead.</Typography>}
          </DialogContent>
        </Dialog>
        
        <Dialog open={openEstado} onClose={handleCloseEstado} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: colors.column, color: colors.textPrimary } }}>
          <DialogTitle>{editEstado?.id ? 'Editar columna' : 'Nueva columna'}</DialogTitle>
          <DialogContent>
            <TextField 
              autoFocus 
              margin="dense" 
              label="Nombre" 
              name="nombre" 
              fullWidth 
              value={editEstado?.nombre || ''} 
              onChange={handleChangeEstado}
              inputProps={{ maxLength: 20 }}
              helperText={`${editEstado?.nombre?.length || 0}/20 caracteres`}
              error={!!(editEstado?.nombre && editEstado.nombre.length > 20)}
            />
            
            <Typography variant="body2" sx={{ mt: 2, mb: 1, color: colors.textSecondary }}>Color</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {colorPalette.map((color) => (
                <Tooltip title={color} key={color}>
                  <IconButton 
                    onClick={() => handleColorChange(color)}
                    sx={{ 
                      p: 0, 
                      width: 32, 
                      height: 32, 
                      border: editEstado?.color === color ? `2px solid ${colors.primaryAccent}` : `2px solid transparent`,
                      borderRadius: '50%',
                      transition: 'border 0.2s'
                    }}
                  >
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: color }} />
                  </IconButton>
                </Tooltip>
              ))}
            </Box>

            <Typography variant="body2" sx={{ mt: 2, mb: 1, color: colors.textSecondary }}>Icono</Typography>
             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {iconList.map((iconName) => {
                const IconComponent = iconMap[iconName];
                return (
                  <Tooltip title={iconName} key={iconName}>
                    <IconButton 
                      onClick={() => handleIconChange(iconName)}
                      sx={{ 
                        p: 0.5,
                        border: editEstado?.icono === iconName ? `2px solid ${colors.primaryAccent}` : `2px solid transparent`,
                        borderRadius: 1,
                        transition: 'border 0.2s'
                      }}
                    >
                      <IconComponent sx={{ color: colors.textSecondary }} />
                    </IconButton>
                  </Tooltip>
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', pt: 2, px: 3, pb: 2 }}>
             <Box>
              {editEstado?.id && (
                <Button 
                  onClick={() => {
                    if(editEstado.id) {
                       setConfirmDelete({ id: editEstado.id, nombre: editEstado.nombre });
                       handleCloseEstado();
                    }
                  }}
                  variant="outlined"
                  color="error"
                >
                  Eliminar
                </Button>
              )}
            </Box>
            <Box>
              <Button onClick={handleCloseEstado} sx={{ color: colors.textSecondary, mr: 1 }}>Cancelar</Button>
              <Button onClick={handleGuardarEstado} variant="contained" sx={{ bgcolor: colors.primaryAccent, '&:hover': { bgcolor: '#8c5fd0' } }}>Guardar</Button>
            </Box>
          </DialogActions>
        </Dialog>
        
        <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: colors.column, color: colors.textPrimary } }}>
          <DialogTitle>Eliminar columna</DialogTitle>
          <DialogContent>
            <Typography>¿Seguro que quieres eliminar la columna "{confirmDelete?.nombre}"?</Typography>
            {confirmDelete && leads.filter((l) => l.estado_id === confirmDelete.id).length > 0 && <Typography color="error" fontWeight={600}>Debes mover los leads antes de eliminarla.</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(null)} sx={{ color: colors.textSecondary }}>Cancelar</Button>
            <Button onClick={handleDeleteEstado} variant="contained" color="error" disabled={!!(confirmDelete && leads.filter((l) => l.estado_id === confirmDelete.id).length > 0)}>Eliminar</Button>
          </DialogActions>
        </Dialog>
        
        <FormularioEdicionLead lead={editLead} estados={estados} open={!!editLead} onClose={handleCloseEditLead} />
        
        <Dialog open={!!confirmDeleteLead} onClose={() => setConfirmDeleteLead(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: colors.column, color: colors.textPrimary } }}>
          <DialogTitle>Eliminar Lead</DialogTitle>
          <DialogContent>
            <Typography>¿Seguro que quieres eliminar el lead "{confirmDeleteLead?.nombre}"?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDeleteLead(null)} sx={{ color: colors.textSecondary }}>Cancelar</Button>
            <Button onClick={handleDeleteLead} variant="contained" color="error">Eliminar</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={!!pendingIncomingChoice}
          onClose={() => setPendingIncomingChoice(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { bgcolor: colors.column, color: colors.textPrimary } }}
        >
          <DialogTitle>Este contacto ya tiene un deal</DialogTitle>
          <DialogContent>
            <Typography>
              Este contacto ya tiene un deal en {pendingEtapaNombre}. ¿Mover ese deal acá o crear uno nuevo?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPendingIncomingChoice(null)} sx={{ color: colors.textSecondary }}>Cancelar</Button>
            <Button onClick={handleCrearLeadNuevo} sx={{ color: colors.textSecondary }}>Crear nuevo</Button>
            <Button onClick={handleMoverLeadAbierto} variant="contained" sx={{ bgcolor: colors.primaryAccent, '&:hover': { bgcolor: '#8c5fd0' } }}>
              Mover
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={!!pendingPerdido}
          onClose={() => setPendingPerdido(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { bgcolor: colors.column, color: colors.textPrimary } }}
        >
          <DialogTitle>Motivo de pérdida</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              ¿Por qué se perdió {pendingPerdido?.leadNombre || 'este lead'}?
            </Typography>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={motivoPerdido}
                onChange={(event) => setMotivoPerdido(event.target.value as MotivoPerdido)}
              >
                {MOTIVOS_PERDIDO.map((motivo) => (
                  <FormControlLabel
                    key={motivo}
                    value={motivo}
                    control={<Radio size="small" />}
                    label={MOTIVO_PERDIDO_LABEL[motivo]}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPendingPerdido(null)} sx={{ color: colors.textSecondary }}>Cancelar</Button>
            <Button
              onClick={() => void handleConfirmarPerdido()}
              variant="contained"
              sx={{ bgcolor: colors.primaryAccent, '&:hover': { bgcolor: '#8c5fd0' } }}
            >
              Marcar como Perdido
            </Button>
          </DialogActions>
        </Dialog>
        {recordatorioLead ? (
          <RecordatorioLeadModal
            open={Boolean(recordatorioLead)}
            onClose={() => setRecordatorioLead(null)}
            leadId={recordatorioLead.id}
            leadNombre={recordatorioLead.nombre}
            conversationId={recordatorioLead.conversacion_id}
            onCreated={() => refrescarLeads()}
          />
        ) : null}
      </Box>
      </>
      )}
      </Box>
    </Box>
    </DragDropContext>
  );
}