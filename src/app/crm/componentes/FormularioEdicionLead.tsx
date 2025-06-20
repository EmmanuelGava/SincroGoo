'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, TextField, Button, Typography, Drawer, IconButton, Select, MenuItem, InputLabel, FormControl, FormHelperText } from '@mui/material';
import { Lead } from '@/app/tipos/lead';
import { Estado, useLeadsKanbanContext } from '../contexts/LeadsKanbanContext';
import { useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';

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
    (a) => (a === '' || a === null || a === undefined ? 0 : parseFloat(String(a))),
    z.number({ invalid_type_error: 'Debe ser un número' }).positive().optional()
  ),
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
  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (lead) {
      reset({
        id: lead.id,
        nombre: lead.nombre,
        empresa: lead.empresa || '',
        email: lead.email || '',
        telefono: lead.telefono || '',
        cargo: lead.cargo || '',
        origen: lead.origen || '',
        notas: lead.notas || '',
        valor_potencial: lead.valor_potencial || 0,
        estado_id: lead.estado_id,
      });
    }
  }, [lead, open, reset]);

  async function onSubmit(values: FormData) {
    if (!lead) return;
    try {
      const datosActualizados = {
        ...values,
        valor_potencial: values.valor_potencial || undefined,
      };
      await actualizarLead(lead.id, datosActualizados);
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
                    <Controller name="email" control={control} render={({ field }) => ( <TextField {...field} type="email" label="Email" error={!!errors.email} helperText={errors.email?.message} /> )} />
                    <Controller name="telefono" control={control} render={({ field }) => ( <TextField {...field} label="Teléfono" error={!!errors.telefono} helperText={errors.telefono?.message} /> )} />
                    <Controller name="cargo" control={control} render={({ field }) => ( <TextField {...field} label="Cargo" error={!!errors.cargo} helperText={errors.cargo?.message} /> )} />
                    <Controller name="origen" control={control} render={({ field }) => ( <TextField {...field} label="Origen" error={!!errors.origen} helperText={errors.origen?.message} /> )} />
                    <Controller name="valor_potencial" control={control} render={({ field }) => ( <TextField {...field} type="number" label="Valor Potencial ($)" error={!!errors.valor_potencial} helperText={errors.valor_potencial?.message} onChange={(e) => field.onChange(parseFloat(e.target.value))} /> )} />
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

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <Button onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="contained">Guardar Cambios</Button>
                    </Box>
                </Box>
            </form>
        )}
    </Drawer>
  );
} 