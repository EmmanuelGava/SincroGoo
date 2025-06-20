"use client";

import React, { useState, useEffect, useRef } from "react";
import { Box, Button, Typography, Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent } from "@mui/material";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
import { useLeadsKanbanContext } from '../contexts/LeadsKanbanContext';
import { Lead } from '@/app/tipos/lead';
import { Estado } from '../contexts/LeadsKanbanContext';
import { FormularioLead } from './FormularioLead';
import { FormularioEdicionLead } from './FormularioEdicionLead';
import { supabase } from '@/lib/supabase/browserClient';

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

const colors = {
  background: '#202020',
  column: '#202020',
  card: '#191919',
  border: '#303030',
  textPrimary: '#E0E0E0',
  textSecondary: '#888888',
  primaryAccent: '#6534ac',
};

function TarjetaLead({ lead, index, onEdit, onDelete }: { lead: Lead; index: number, onEdit: (lead: Lead) => void, onDelete: (lead:Lead) => void }) {
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
              bgcolor: '#2C2C2C',
              '& .actions': { opacity: 1 }
            },
            transition: 'background-color 0.2s'
          }}
        >
          <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: 500, mb: 1 }}>
            {lead.nombre}
          </Typography>

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
    if (supabase) {
      console.log('Intentando suscribirse a realtime (leads)...');
      const channel = supabase
        .channel('mensajes_conversacion_leads')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mensajes_conversacion' },
          (payload) => {
            console.log('Evento realtime recibido en leads', payload);
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
    }
  }, [refrescarLeads]);

  const [open, setOpen] = useState(false);
  const [openEstado, setOpenEstado] = useState(false);
  const [editEstado, setEditEstado] = useState<null | { id?: string; nombre: string; color?: string; orden: number, icono?: string }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { id: string; nombre: string }>(null);
  const [editLead, setEditLead] = useState<null | Lead>(null);
  const [confirmDeleteLead, setConfirmDeleteLead] = useState<null | Lead>(null);

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
  const handleOpen = () => setOpen(true);
  const handleClose = () => { setOpen(false); };
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

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography>Cargando Kanban...</Typography></Box>;
  if (error) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="error">{error}</Typography></Box>;

  return (
    <Box sx={{ bgcolor: colors.background, color: colors.textPrimary, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Kanban principal */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 500 }}>Kanban de Leads</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleOpen}
            sx={{ bgcolor: colors.primaryAccent, '&:hover': { bgcolor: '#8c5fd0' }, textTransform: 'none', fontWeight: 500, borderRadius: 2, boxShadow: 'none' }}
          >
            Nuevo Lead
          </Button>
        </Box>

        <Box sx={{ flexGrow: 1, overflowX: 'auto', overflowY: 'hidden', p: 3, pt: 0 }}>
          <DragDropContext onDragEnd={onDragEnd} onBeforeDragStart={onBeforeDragStart}>
            <Droppable droppableId="kanban-columns" direction="horizontal" type="COLUMN">
              {(provided) => (
                <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ display: 'flex', gap: 2, height: '100%' }}>
                  {estados.map((estado, idx) => (
                    <Draggable draggableId={"col-" + estado.id} index={idx} key={estado.id}>
                      {(provided) => (
                        <Box ref={provided.innerRef} {...provided.draggableProps} sx={{ minWidth: 280, maxWidth: 280, ...provided.draggableProps.style, height: '100%' }}>
                          <Box {...provided.dragHandleProps} sx={{ p: 1.5, width: '100%', bgcolor: 'transparent', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {estado.icono && React.createElement(iconMap[estado.icono] || RadioButtonUncheckedIcon, { sx: { color: estado.color || colors.textSecondary, fontSize: '1rem' } })}
                                {!estado.icono && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: estado.color || colors.textSecondary }} />}
                                <Typography variant="body1" sx={{ fontWeight: 500, color: colors.textPrimary }}>{estado.nombre}</Typography>
                                <Typography component="span" sx={{ color: colors.textSecondary, fontWeight: 400, fontSize: '0.875rem' }}>
                                  {leadsPorEstado[estado.id]?.length || 0}
                                </Typography>
                              </Box>
                              <Box>
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
                                  <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: '1px' }}>
                                    {leadsPorEstado[estado.id]?.map((lead, idx) => (
                                      <TarjetaLead key={lead.id} lead={lead} index={idx} onEdit={handleOpenEditLead} onDelete={setConfirmDeleteLead} />
                                    ))}
                                    {provided.placeholder}
                                  </Box>
                                )}
                              </Droppable>
                            </Box>
                            <Button startIcon={<AddIcon />} sx={{ color: colors.textSecondary, textTransform: 'none', justifyContent: 'flex-start', p: 1, mt: 1, '&:hover': { bgcolor: colors.card } }}>
                              Nuevo elemento
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  <Box sx={{ minWidth: 280, maxWidth: 280 }}>
                    <Button fullWidth onClick={() => handleOpenEstado()} sx={{ color: colors.textSecondary, bgcolor: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: 3, p: 1, textTransform: 'none', '&:hover': { bgcolor: colors.column, borderColor: colors.textSecondary }, height: '48px' }}>
                      <AddIcon sx={{ mr: 1 }} /> Nueva columna
                    </Button>
                  </Box>
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </DragDropContext>
        </Box>
        
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: colors.column, color: colors.textPrimary } }}>
          <DialogTitle>Nuevo Lead</DialogTitle>
          <DialogContent>
            {estados.length > 0 ? <FormularioLead estadoId={estados[0].id} onClose={handleClose} /> : <Typography>Crea una columna para añadir un lead.</Typography>}
          </DialogContent>
        </Dialog>
        
        <Dialog open={openEstado} onClose={handleCloseEstado} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: colors.column, color: colors.textPrimary } }}>
          <DialogTitle>{editEstado?.id ? 'Editar columna' : 'Nueva columna'}</DialogTitle>
          <DialogContent>
            <TextField autoFocus margin="dense" label="Nombre" name="nombre" fullWidth value={editEstado?.nombre || ''} onChange={handleChangeEstado} />
            
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
      </Box>
    </Box>
  );
} 