import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';
import { LugarExportable } from '../tipos';
import { signIn, useSession } from 'next-auth/react';

interface ExportarEstablecimientosProps {
  establecimientos: LugarExportable[];
  onClose: () => void;
  onSheetCreated: (id: string) => void;
}

export function ExportarEstablecimientos({ 
  establecimientos, 
  onClose,
  onSheetCreated 
}: ExportarEstablecimientosProps) {
  const { data: session } = useSession();
  const [nombreHoja, setNombreHoja] = useState('Establecimientos');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prepararDatosExportacion = (establecimientos: LugarExportable[]): any[][] => {
    // Encabezados
    const headers = [
      'Nombre',
      'Dirección',
      'Teléfono',
      'Sitio Web',
      'Calificación',
      'Total Reseñas',
      'Horarios'
    ];

    // Datos de los establecimientos
    const rows = establecimientos.map(est => {
      console.log('Procesando establecimiento para exportación:', est); // Para debugging
      
      // Formatear horarios de manera más legible
      const horariosFormateados = est.horarios?.join('\n') || 'No disponible';

      return [
        est.nombre || 'No disponible',
        est.direccion || 'No disponible',
        est.telefono || 'No disponible',
        est.sitioWeb || 'No disponible',
        // Formatear calificación con un decimal si existe
        est.rating ? est.rating.toFixed(1) : 'No disponible',
        // Formatear total de reseñas como número entero
        est.totalRatings ? est.totalRatings.toString() : 'No disponible',
        horariosFormateados
      ];
    });

    console.log('Datos preparados para exportación:', rows); // Para debugging
    return [headers, ...rows];
  };

  const handleExportar = async () => {
    if (!session?.accessToken) {
      setError('No hay sesión activa. Por favor, inicia sesión.');
      return;
    }

    try {
      setCargando(true);
      setError(null);

      console.log('Establecimientos a exportar:', establecimientos); // Para debugging

      const datos = prepararDatosExportacion(establecimientos);

      const response = await fetch('/api/google/places/sheets/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          titulo: nombreHoja,
          datos
        })
      });

      const resultado = await response.json();

      if (!resultado.exito) {
        throw new Error(resultado.error || 'Error al exportar los establecimientos');
      }

      if (onSheetCreated && resultado.datos) {
        onSheetCreated(resultado.datos.spreadsheetId);
      }

      // Guardar el ID en localStorage
      if (resultado.datos) {
        localStorage.setItem('lastSpreadsheetId', resultado.datos.spreadsheetId);
        // Abrir la hoja en una nueva pestaña
        window.open(resultado.datos.url, '_blank');
      }
      
      onClose();
    } catch (error) {
      console.error('Error al exportar:', error);
      if (error instanceof Error && error.message.includes('invalid authentication credentials')) {
        setError('Se requieren permisos adicionales para exportar a Google Sheets. Por favor, inicia sesión nuevamente.');
        // Cerrar el diálogo actual
        onClose();
        // Iniciar sesión nuevamente con los permisos necesarios
        await signIn('google', {
          callbackUrl: window.location.href,
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file'
        });
      } else {
        setError(error instanceof Error ? error.message : 'Error al exportar los establecimientos');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Exportar a Google Sheets</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2" gutterBottom>
          Se exportarán {establecimientos.length} establecimientos a una nueva hoja de cálculo.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Nombre de la hoja de cálculo"
          fullWidth
          value={nombreHoja}
          onChange={(e) => setNombreHoja(e.target.value)}
          disabled={cargando}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={cargando}>
          Cancelar
        </Button>
        <Button
          onClick={handleExportar}
          variant="contained"
          disabled={cargando || !nombreHoja.trim()}
        >
          {cargando ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Exportando...
            </>
          ) : (
            'Exportar'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 