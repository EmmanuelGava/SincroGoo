'use client';

import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Chip, SelectChangeEvent } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import type { MiembroOrganizacion } from '@/hooks/useOrganizacionMiembros';

type AssigneeSelectorProps = {
  value?: string | null;
  miembros: MiembroOrganizacion[];
  onChange: (usuarioId: string | null) => void;
  size?: 'small' | 'medium';
  allowUnassigned?: boolean;
  label?: string;
  variant?: 'select' | 'chip';
  disabled?: boolean;
};

export default function AssigneeSelector({
  value,
  miembros,
  onChange,
  size = 'small',
  allowUnassigned = true,
  label = 'Asignado',
  variant = 'select',
  disabled = false,
}: AssigneeSelectorProps) {
  const selected = miembros.find((m) => m.usuario_id === value);

  const handleChange = (e: SelectChangeEvent<string>) => {
    const v = e.target.value;
    onChange(v === '__none__' ? null : v);
  };

  if (variant === 'chip') {
    return (
      <Chip
        size="small"
        icon={<PersonOutlineIcon />}
        label={selected ? selected.nombre.split(' ')[0] : 'Sin asignar'}
        onClick={disabled ? undefined : () => {}}
        sx={{ maxWidth: 140 }}
      />
    );
  }

  return (
    <FormControl size={size} sx={{ minWidth: 140 }} disabled={disabled}>
      <InputLabel id="assignee-select-label">{label}</InputLabel>
      <Select
        labelId="assignee-select-label"
        label={label}
        value={value || '__none__'}
        onChange={handleChange}
      >
        {allowUnassigned && (
          <MenuItem value="__none__">
            <em>Sin asignar</em>
          </MenuItem>
        )}
        {miembros.map((m) => (
          <MenuItem key={m.usuario_id} value={m.usuario_id}>
            {m.nombre}
            {m.rol === 'admin' ? ' (admin)' : ''}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
