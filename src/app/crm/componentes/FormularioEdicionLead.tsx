'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, TextField, Button, Typography, Drawer, IconButton, Select, MenuItem, InputLabel, FormControl, FormHelperText } from '@mui/material';
import { Lead } from '@/app/tipos/lead';
import { Estado, useLeadsKanbanContext } from '../contexts/LeadsKanbanContext';
import { useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from 'next/navigation';
import { leadFormEmail, leadFormPhone } from '@/lib/chat/conversationIdentity';
import { LEAD_SCORE_LABEL, LEAD_SCORES } from '@/lib/crm/leadKanbanFilters';

const formSchema = z.object({
  id: z.string(),
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  empresa: z.string().optional(),
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }).optional().or(z.literal('')),
  telefono: z.string().optional(),
  cargo: z.string().optional(),
  origen: z.string().optional(),
  notas: z.string().optional(),
  valor_potencial: z.preprocess(
    (a) => (a === '' || a === null || a === undefined ? undefined : parseFloat(String(a))),
    z.number({ invalid_type_error: 'Debe ser un número' }).nonnegative().optional()
  ),
  fecha_cierre: z.string().optional().or(z.literal('')),
  score: z.enum(['alta', 'media', 'baja']).optional().nullable(),
  estado_id: z.string().min(1, { message: 'Debes seleccionar un estado.'}),
});

type FormData = z.infer<typeof formSchema>;

interface FormularioEdicionLeadProps {
  lead: Lead | null;
  estados: Estado[];
  open: boolean;
  onClose: () => void;
}

export function FormularioEdicionLead({ lead, estados, open, onClose }: FormularioEdicionLeadProps) {
  const { actualizarLead } = useLeadsKanbanContext();
  const router = useRouter();
  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (lead) {
      reset({
        id: lead.id,
        nombre: lead.nombre,
        empresa: lead.empresa || '',
        email: leadFormEmail(lead.email),
        telefono: leadFormPhone(lead.telefono),
        cargo: lead.cargo || '',
        origen: lead.origen || '',
        notas: lead.notas || '',
        valor_potencial: lead.valor_potencial ?? undefined,
        fecha_cierre: lead.fecha_cierre ? String(lead.fecha_cierre).slice(0, 10) : '',
        score: lead.score || 'media',
        estado_id: lead.estado_id,
      });
    }
  }, [lead, open, reset]);

  async function onSubmit(values: FormData) {
    if (!lead) return;
    try {
      const { id: _id, ...rest } = values;
      await actualizarLead(lead.id, {
        ...rest,
        valor_potencial: values.valor_potencial ?? null,
        fecha_cierre: values.fecha_cierre || null,
        score: values.score || 'media',
      });
      onClose();
    } catch (error) {
      console.error('Error al actualizar el lead:', error);
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: '100%', maxWidth: 500, bgcolor: '#191919', p: 3, color: '#E0E0E0' } }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Editar Lead</Typography>
            <IconButton onClick={onClose}>
                <CloseIcon />
            </IconButton>
        </Box>
        {lead && (
             <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Controller name="nombre" control={control} render={({ field }) => ( <TextField {...field} label="Nombre del Lead" error={!!errors.nombre} helperText={errors.nombre?.message} /> )} />
                    <Controller name="empresa" control={control} render={({ field }) => ( <TextField {...field} label="Empresa" error={!!errors.empresa} helperText={errors.empresa?.message} /> )} />
                    <Controller name="email" control={control} render={({ field }) => ( <TextField {...field} type="email" label="Email" placeholder="Opcional" error={!!errors.email} helperText={errors.email?.message || 'Si no lo tenés, dejalo vacío'} /> )} />
                    <Controller name="telefono" control={control} render={({ field }) => ( <TextField {...field} label="Teléfono" placeholder="Ej: +54 9 11 1234 5678" error={!!errors.telefono} helperText={errors.telefono?.message || 'Número real, no el ID interno de WhatsApp'} /> )} />
                    <Controller name="cargo" control={control} render={({ field }) => ( <TextField {...field} label="Cargo" error={!!errors.cargo} helperText={errors.cargo?.message} /> )} />
                    <Controller name="origen" control={control} render={({ field }) => ( <TextField {...field} label="Origen" error={!!errors.origen} helperText={errors.origen?.message} /> )} />
                    <Controller name="valor_potencial" control={control} render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value ?? ''}
                        type="number"
                        label="Valor potencial ($)"
                        error={!!errors.valor_potencial}
                        helperText={errors.valor_potencial?.message}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                    )} />
                    <Controller name="fecha_cierre" control={control} render={({ field }) => (
                      <TextField
                        {...field}
                        type="date"
                        label="Fecha de cierre"
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.fecha_cierre}
                        helperText={errors.fecha_cierre?.message}
                      />
                    )} />
                    <Controller
                      name="score"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.score}>
                          <InputLabel id="score-label">Prioridad</InputLabel>
                          <Select
                            {...field}
                            value={field.value || 'media'}
                            labelId="score-label"
                            label="Prioridad"
                          >
                            {LEAD_SCORES.map((score) => (
                              <MenuItem key={score} value={score}>{LEAD_SCORE_LABEL[score]}</MenuItem>
                            ))}
                          </Select>
                          {errors.score && <FormHelperText>{errors.score.message}</FormHelperText>}
                        </FormControl>
                      )}
                    />
                    <Controller
                        name="estado_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.estado_id}>
                                <InputLabel id="estado-label">Estado</InputLabel>
                                <Select
                                    {...field}
                                    labelId="estado-label"
                                    label="Estado"
                                >
                                    {estados.map((estado) => (
                                        <MenuItem key={estado.id} value={estado.id}>{estado.nombre}</MenuItem>
                                    ))}
                                </Select>
                                {errors.estado_id && <FormHelperText>{errors.estado_id.message}</FormHelperText>}
                            </FormControl>
                        )}
                    />
                    <Controller name="notas" control={control} render={({ field }) => ( <TextField {...field} label="Notas" multiline rows={4} error={!!errors.notas} helperText={errors.notas?.message} /> )} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 2 }}>
                        <Button
                          variant="outlined"
                          disabled={!lead.conversacion_id}
                          onClick={() => {
                            if (lead.conversacion_id) {
                              router.push(`/chat?conversacion=${lead.conversacion_id}`);
                            }
                          }}
                        >
                          Abrir chat
                        </Button>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button onClick={onClose}>Cancelar</Button>
                          <Button type="submit" variant="contained">Guardar Cambios</Button>
                        </Box>
                    </Box>
                </Box>
            </form>
        )}
    </Drawer>
  );
}
