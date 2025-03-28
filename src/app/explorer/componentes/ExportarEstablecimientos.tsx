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
  Typography
} from '@mui/material';
import { Lugar } from '../servicios/google-places-service';
import { GoogleSheetsService } from '@/servicios/google/googleSheets';
import { signIn } from 'next-auth/react';

interface ExportarEstablecimientosProps {
  establecimientos: Lugar[];
  onClose: () => void;
  onSheetCreated?: (spreadsheetId: string) => void;
}

export function ExportarEstablecimientos({ 
  establecimientos, 
  onClose,
  onSheetCreated 
}: ExportarEstablecimientosProps) {
  const [nombreHoja, setNombreHoja] = useState('Establecimientos');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatearHorarios = (horarios: string[] | undefined): string => {
    if (!horarios || !Array.isArray(horarios)) {
      return 'No disponible';
    }
    return horarios.join('\n');
  };

  const handleExportar = async () => {
    try {
      setCargando(true);
      setError(null);

      console.log('Establecimientos a exportar:', establecimientos);

      // Preparar los datos para exportar
      const datosParaExportar = establecimientos.map(establecimiento => {
        console.log('Procesando establecimiento:', establecimiento);
        
        // Asegurarnos de que todos los campos tengan valores válidos
        const nombre = establecimiento.nombre || 'No disponible';
        const direccion = establecimiento.direccion || 'No disponible';
        const telefono = establecimiento.telefono || 'No disponible';
        const sitioWeb = establecimiento.sitioWeb || 'No disponible';
        const horarios = (establecimiento.horarios || []).join('\n') || 'No disponible';
        const puntuacion = establecimiento.puntuacion?.toString() || 'No disponible';
        const totalPuntuaciones = establecimiento.totalPuntuaciones?.toString() || 'No disponible';
        const nivelPrecio = establecimiento.nivelPrecio ? '€'.repeat(establecimiento.nivelPrecio) : 'No disponible';
        const completitud = `${Math.round(establecimiento.completitud)}%`;

        const fila = [
          nombre,
          direccion,
          telefono,
          sitioWeb,
          horarios,
          puntuacion,
          totalPuntuaciones,
          nivelPrecio,
          completitud
        ];

        console.log('Fila preparada:', fila);
        return fila;
      });

      console.log('Datos finales para exportar:', datosParaExportar);

      // Crear la hoja de cálculo
      const spreadsheetId = await GoogleSheetsService.getInstance().crearHojaCalculo(
        nombreHoja,
        [
          ['Nombre', 'Dirección', 'Teléfono', 'Sitio Web', 'Horarios', 'Puntuación', 'Total Puntuaciones', 'Nivel de Precio', 'Completitud'],
          ...datosParaExportar
        ]
      );

      // Guardar el ID en localStorage
      localStorage.setItem('lastSpreadsheetId', spreadsheetId);
      
      if (onSheetCreated) {
        onSheetCreated(spreadsheetId);
      }

      // Abrir la hoja en una nueva pestaña
      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
      
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
        setError('Error al exportar los establecimientos');
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