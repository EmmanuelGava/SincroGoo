"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent, useTheme, Badge } from "@mui/material";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import BusinessIcon from '@mui/icons-material/Business';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
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
import { useLeadsKanbanContext } from '../contexts/LeadsKanbanContext';
import { Lead } from '@/app/tipos/lead';
import { Estado } from '../contexts/LeadsKanbanContext';
import { FormularioLead } from './FormularioLead';
import { FormularioEdicionLead } from './FormularioEdicionLead';
import { supabase } from '@/lib/supabase/browserClient';
import SidebarMensajesEntrantes from './SidebarMensajesEntrantes';

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

function TarjetaLead({ lead, index, onEdit, onDelete, colors }: { lead: Lead; index: number, onEdit: (lead: Lead) => void, onDelete: (lead:Lead) => void, colors: any }) {
  const theme = useTheme();
  const router = useRouter();
  
  return (
    <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          elevation={0}
          sx={{
            p: 1.5,
            bgcolor: colors.card,
            border: `1px solid ${colors.border}`,
            boxShadow: 'none',
            borderRadius: 2,
            cursor: 'grab',
            position: 'relative',
            '&:hover': {
              bgcolor: theme.palette.action.hover,
              '& .actions': { opacity: 1 }
            },
            transition: 'background-color 0.2s'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pr: 8 }}>
            <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: 500, flex: 1, minWidth: 0 }}>
              {lead.nombre}
            </Typography>
            {(lead.unread_count || 0) > 0 && (
              <Badge
                badgeContent={lead.unread_count}
                color="primary"
                max={99}
                sx={{ '& .MuiBadge-badge': { position: 'static', transform: 'none' } }}
              />
            )}
          </Box>

          {lead.empresa && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <BusinessIcon sx={{ fontSize: '0.875rem', color: colors.textSecondary }} />
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                {lead.empresa}
              </Typography>
            </Box>
          )}

          {/* Mostrar el último mensaje si existe */}
          {lead.ultimo_mensaje && (
            <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 1, fontStyle: 'italic' }}>
              Último mensaje: {lead.ultimo_mensaje}
            </Typography>
          )}

              {lead.valor_potencial && (
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AttachMoneyIcon sx={{ fontSize: '0.875rem', color: colors.textSecondary }} />
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                {lead.valor_potencial}
              </Typography>
            </Box>
          )}
          
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
    leads: leadsGlobal,
    loading,
    error,
    moverLead,
    agregarEstado: crearEstado,
    actualizarEstado,
    eliminarEstado,
    eliminarLead,
    refrescarLeads,
    convertirIncomingEnLead,
  } = useLeadsKanbanContext();

  const [estados, setEstados] = useState<Estado[]>(estadosGlobal);
  const [leads, setLeads] = useState<Lead[]>(leadsGlobal);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!isDragging.current) {
      setEstados(estadosGlobal);
    }
  }, [estadosGlobal]);

  useEffect(() => {
    if (!isDragging.current) {
      setLeads(leadsGlobal);
    }
  }, [leadsGlobal]);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    
    console.log('Intentando suscribirse a realtime (leads)...');
    const channel = supabase
      .channel('mensajes_conversacion_leads')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_conversacion' },
        (payload) => {
          console.log('Evento realtime recibido en leads', payload);
          // Usar una función estable para refrescar
          refrescarLeads();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('Lead actualizado:', payload);
          refrescarLeads();
        }
      )
      .subscribe((status) => {
        console.log('Estado de la suscripción realtime (leads):', status);
      });
      
    return () => {
      console.log('Eliminando canal realtime (leads)...');
      channel.unsubscribe();
    };
  }, []); // Sin dependencias para evitar recrear la suscripción

  const [open, setOpen] = useState(false);
  const [nuevoLeadEstadoId, setNuevoLeadEstadoId] = useState<string | null>(null);
  const [openEstado, setOpenEstado] = useState(false);
  const [editEstado, setEditEstado] = useState<null | { id?: string; nombre: string; color?: string; orden: number, icono?: string }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { id: string; nombre: string }>(null);
  const [editLead, setEditLead] = useState<null | Lead>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (!leadId || leads.length === 0) return;
    const match = leads.find((item) => item.id === leadId);
    if (match) setEditLead(match);
  }, [searchParams, leads]);
  const [confirmDeleteLead, setConfirmDeleteLead] = useState<null | Lead>(null);
  const [pendingIncomingChoice, setPendingIncomingChoice] = useState<null | {
    conversationId: string;
    estadoId: string;
    contactoId: string;
    openLead: { id: string; nombre: string; estado_id: string };
  }>(null);
  
  // Estado para columnas colapsadas
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

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

  const leadsPorEstado: Record<string, Lead[]> = {};
  estados.forEach((estado) => {
    leadsPorEstado[estado.id] = [];
  });
  leads.forEach((lead) => {
    if (lead.estado_id && leadsPorEstado[lead.estado_id]) {
      leadsPorEstado[lead.estado_id].push(lead);
    }
  });

  const onDragEnd = async (result: DropResult) => {
    isDragging.current = false;
    if (!result.destination) return;
    if (result.type === 'COLUMN') {
      const sourceIdx = result.source.index;
      const destIdx = result.destination.index;
      if (sourceIdx === destIdx) return;
      const newEstados = Array.from(estados);
      const [removed] = newEstados.splice(sourceIdx, 1);
      newEstados.splice(destIdx, 0, removed);
      setEstados(newEstados);
      await Promise.all(newEstados.map((estado, idx) => actualizarEstado(estado.id, { orden: idx })));
      return;
    }
    const { source, destination, draggableId } = result;
    const sourceEstadoId = source.droppableId;
    const destEstadoId = destination.droppableId;
    if (sourceEstadoId === destEstadoId) return;

    if (String(draggableId).startsWith('incoming:')) {
      const conversationId = String(draggableId).slice('incoming:'.length);
      if (destEstadoId === 'incoming-chats') return;
      try {
        const result = await convertirIncomingEnLead(conversationId, destEstadoId);
        if (result?.needsChoice) {
          setPendingIncomingChoice({
            conversationId,
            estadoId: destEstadoId,
            contactoId: result.contactoId,
            openLead: result.openLead,
          });
        }
      } catch (error) {
        console.error('Error pasando chat al Kanban:', error);
      }
      return;
    }
    
    const leadToMove = leads.find(lead => String(lead.id) === String(draggableId));
    if (!leadToMove) return;
    
    const newLeads = leads.map(lead => String(lead.id) === String(draggableId) ? { ...lead, estado_id: destEstadoId } : lead);
    setLeads(newLeads);
    
    try {
      await moverLead(draggableId, destEstadoId);
    } catch (error) {
      setLeads(leads); // Revert on error
    }
  };

  const onBeforeDragStart = () => { isDragging.current = true; };
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
      });
    } catch (error) {
      console.error('Error creando un deal nuevo:', error);
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
        <Box sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 500 }}>Kanban de Leads</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => handleOpen()}
            sx={{ bgcolor: colors.primaryAccent, '&:hover': { bgcolor: '#8c5fd0' }, textTransform: 'none', fontWeight: 500, borderRadius: 2, boxShadow: 'none' }}
          >
            Nuevo Lead
          </Button>
        </Box>

        <Box sx={{ flexGrow: 1, overflowX: 'auto', overflowY: 'hidden', p: 3, pt: 0 }}>
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

                                {/* Botón de editar en la parte inferior */}
                                <Tooltip title="Editar columna" placement="right">
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => {
                                      e.stopPropagation(); // Evitar que se expanda al hacer clic en editar
                                      handleOpenEstado({ ...estado });
                                    }}
                                    sx={{
                                      mt: 1,
                                      bgcolor: colors.background,
                                      '&:hover': {
                                        bgcolor: colors.border
                                      }
                                    }}
                                  >
                                    <EditIcon sx={{ color: colors.textSecondary, fontSize: '1rem' }} />
                                  </IconButton>
                                </Tooltip>

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
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Tooltip title="Colapsar columna">
                                      <IconButton size="small" onClick={() => toggleColumnCollapse(estado.id)}>
                                        <UnfoldLessIcon sx={{ color: colors.textSecondary, fontSize: '1rem' }} />
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
                                          <TarjetaLead key={lead.id} lead={lead} index={idx} onEdit={handleOpenEditLead} onDelete={setConfirmDeleteLead} colors={colors} />
                                        ))}
                                        {provided.placeholder}
                                      </Box>
                                    )}
                                  </Droppable>
                                </Box>
                                <Button
                                  startIcon={<AddIcon />}
                                  onClick={() => handleOpen(estado.id)}
                                  sx={{ color: colors.textSecondary, textTransform: 'none', justifyContent: 'flex-start', p: 1, mt: 1, '&:hover': { bgcolor: colors.card } }}
                                >
                                  Nuevo elemento
                                </Button>
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
            {confirmDelete && leadsPorEstado[confirmDelete.id]?.length > 0 && <Typography color="error" fontWeight={600}>Debes mover los leads antes de eliminarla.</Typography>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(null)} sx={{ color: colors.textSecondary }}>Cancelar</Button>
            <Button onClick={handleDeleteEstado} variant="contained" color="error" disabled={!!(confirmDelete && leadsPorEstado[confirmDelete.id]?.length > 0)}>Eliminar</Button>
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
      </Box>
      </>
      )}
      </Box>
    </Box>
    </DragDropContext>
  );
} 