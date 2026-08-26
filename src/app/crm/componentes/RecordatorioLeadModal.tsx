'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
} from '@mui/material';

type RecordatorioLeadModalProps = {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadNombre: string;
  conversationId?: string | null;
  onCreated?: () => void;
};

export default function RecordatorioLeadModal({
  open,
  onClose,
  leadId,
  leadNombre,
  conversationId,
  onCreated,
}: RecordatorioLeadModalProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);

  const [titulo, setTitulo] = useState(`Seguimiento ${leadNombre}`);
  const [fecha, setFecha] = useState(defaultDate);
  const [hora, setHora] = useState('09:00');
  const [prioridad, setPrioridad] = useState<'medium' | 'high'>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (saving) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const due = new Date(`${fecha}T${hora}:00`);
      if (Number.isNaN(due.getTime())) {
        throw new Error('Fecha u hora inválida');
      }
      const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titulo.trim() || `Seguimiento ${leadNombre}`,
          due_date: due.toISOString(),
          priority: prioridad === 'high' ? 'high' : 'medium',
          conversation_id: conversationId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el recordatorio');
      onCreated?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Recordarme</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
          <TextField
            label="Hora"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="prioridad-label">Prioridad</InputLabel>
            <Select
              labelId="prioridad-label"
              label="Prioridad"
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as 'medium' | 'high')}
            >
              <MenuItem value="medium">Normal</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
