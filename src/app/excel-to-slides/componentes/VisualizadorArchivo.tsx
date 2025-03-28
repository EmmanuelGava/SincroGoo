import { Stack, Typography, Button } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

interface VisualizadorArchivoProps {
  nombreArchivo: string;
  onConfigurar: () => void;
}

export default function VisualizadorArchivo({ 
  nombreArchivo, 
  onConfigurar 
}: VisualizadorArchivoProps) {
  return (
    <Stack spacing={2} alignItems="center" width="100%">
      <Typography variant="h6">
        Archivo seleccionado: {nombreArchivo}
      </Typography>
      <Button
        variant="contained"
        startIcon={<SettingsIcon />}
        onClick={onConfigurar}
      >
        Configurar Plantilla
      </Button>
    </Stack>
  );
} 