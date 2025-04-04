'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Paper,
  Divider,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import {
  TableChart as TableChartIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { HojaExcel } from '@/app/servicios/google/conversions/excel-to-slides/types';
import { VistaPrevia } from './VistaPrevia';

interface ConfiguradorHojasProps {
  hojas: HojaExcel[];
  onHojasChange: (hojas: HojaExcel[]) => void;
  loading?: boolean;
  onVerDatos: (nombreHoja: string) => Promise<void>;
}

export const ConfiguradorHojas: React.FC<ConfiguradorHojasProps> = ({
  hojas,
  onHojasChange,
  loading = false,
  onVerDatos,
}) => {
  const [hojaPreview, setHojaPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleToggleHoja = (index: number) => {
    const nuevasHojas = [...hojas];
    nuevasHojas[index].seleccionada = !nuevasHojas[index].seleccionada;
    onHojasChange(nuevasHojas);
  };

  const handleNombreDestinoChange = (index: number, nuevoNombre: string) => {
    const nuevasHojas = [...hojas];
    nuevasHojas[index].nombreDestino = nuevoNombre;
    onHojasChange(nuevasHojas);
  };

  const handleVerDatos = async (nombreHoja: string) => {
    setHojaPreview(nombreHoja);
    setLoadingPreview(true);
    await onVerDatos(nombreHoja);
    setLoadingPreview(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  const hojaActual = hojas.find(h => h.nombre === hojaPreview);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configurar hojas
      </Typography>
      <List>
        {hojas.map((hoja, index) => (
          <Paper key={hoja.nombre} sx={{ mb: 2 }}>
            <ListItem>
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={hoja.seleccionada}
                  onChange={() => handleToggleHoja(index)}
                />
              </ListItemIcon>
              <ListItemIcon>
                <TableChartIcon color="primary" />
              </ListItemIcon>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1">
                  {hoja.nombre}
                </Typography>
                <TextField
                  size="small"
                  label="Nombre en Google Sheets"
                  value={hoja.nombreDestino}
                  onChange={(e) => handleNombreDestinoChange(index, e.target.value)}
                  disabled={!hoja.seleccionada}
                  fullWidth
                  sx={{ mt: 1 }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {loadingPreview ? (
                  <CircularProgress size={24} sx={{ mx: 1 }} />
                ) : (
                  <Tooltip title="Vista previa">
                    <span>
                      <IconButton
                        edge="end"
                        onClick={() => handleVerDatos(hoja.nombre)}
                        disabled={loadingPreview}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                <Tooltip title="Configuración avanzada">
                  <span>
                    <IconButton edge="end" disabled>
                      <SettingsIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </ListItem>
          </Paper>
        ))}
      </List>

      <Dialog
        open={hojaPreview !== null}
        onClose={() => setHojaPreview(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Vista previa</DialogTitle>
        <DialogContent>
          {hojaActual && (
            <VistaPrevia
              datos={hojaActual.datos}
              nombreHoja={hojaActual.nombre}
              loading={loadingPreview}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}; 