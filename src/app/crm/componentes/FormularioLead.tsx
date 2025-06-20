'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Grid, TextField, Button } from '@mui/material';
import { Lead } from '@/app/tipos/lead';
import { useLeadsKanbanContext } from '../contexts/LeadsKanbanContext';

// Esquema de validación con Zod
const formSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  empresa: z.string().optional(),
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }).optional().or(z.literal('')),
  telefono: z.string().optional(),
  cargo: z.string().optional(),
  origen: z.string().optional(),
  notas: z.string().optional(),
  valor_potencial: z.preprocess(
    (a) => (a === '' ? undefined : parseFloat(String(a))),
    z.number({ invalid_type_error: 'Debe ser un número' }).positive().optional()
  ),
});

type FormData = z.infer<typeof formSchema>;

interface FormularioLeadProps {
  estadoId: string;
  onClose: () => void;
  className?: string;
}

export function FormularioLead({ estadoId, onClose, className }: FormularioLeadProps) {
  const { agregarLead } = useLeadsKanbanContext();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      empresa: '',
      email: '',
      telefono: '',
      cargo: '',
      origen: '',
      notas: '',
      valor_potencial: 0,
    },
  });

  async function onSubmit(values: FormData) {
    try {
      const leadData = {
        ...values,
        valor_potencial: values.valor_potencial || undefined
      };
      
      const nuevoLead: Omit<Lead, 'id' | 'orden' | 'fecha_creacion' | 'usuario_id'> = {
        ...leadData,
        estado_id: estadoId,
        fecha_actualizacion: new Date().toISOString(),
      };
      await agregarLead(nuevoLead);
      onClose();
    } catch (error) {
      console.error('Error al crear el lead:', error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={className}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Controller
            name="nombre"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nombre del Lead"
                placeholder="Ej: Juan Pérez"
                fullWidth
                error={!!errors.nombre}
                helperText={errors.nombre?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="empresa"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Empresa"
                placeholder="Ej: Acme Inc."
                fullWidth
                error={!!errors.empresa}
                helperText={errors.empresa?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="email"
                label="Email"
                placeholder="juan.perez@email.com"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="telefono"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Teléfono"
                placeholder="+1 234 567 890"
                fullWidth
                error={!!errors.telefono}
                helperText={errors.telefono?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="cargo"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Cargo"
                placeholder="Ej: Gerente de Ventas"
                fullWidth
                error={!!errors.cargo}
                helperText={errors.cargo?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="origen"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Origen"
                placeholder="Ej: Conferencia, Web, etc."
                fullWidth
                error={!!errors.origen}
                helperText={errors.origen?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="valor_potencial"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Valor Potencial ($)"
                placeholder="1500"
                fullWidth
                error={!!errors.valor_potencial}
                helperText={errors.valor_potencial?.message}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="notas"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Notas"
                placeholder="Añade notas sobre el lead..."
                fullWidth
                multiline
                rows={3}
                error={!!errors.notas}
                helperText={errors.notas?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained">Crear Lead</Button>
        </Grid>
      </Grid>
    </form>
  );
} 