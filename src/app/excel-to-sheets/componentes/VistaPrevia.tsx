import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';

interface VistaPreviaProps {
  datos: any[][] | undefined;
  nombreHoja: string;
  loading?: boolean;
}

export const VistaPrevia: React.FC<VistaPreviaProps> = ({
  datos,
  nombreHoja,
  loading = false,
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!datos || datos.length === 0) {
    return (
      <Box p={3}>
        <Typography variant="body1" color="text.secondary">
          No hay datos disponibles para mostrar
        </Typography>
      </Box>
    );
  }

  // Limitar la cantidad de filas mostradas para la vista previa
  const filasPreview = datos.slice(0, 10);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Vista previa de {nombreHoja}
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {filasPreview[0].map((celda: any, index: number) => (
                <TableCell key={index}>
                  {celda || `Columna ${index + 1}`}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filasPreview.slice(1).map((fila: any[], indexFila: number) => (
              <TableRow key={indexFila}>
                {fila.map((celda: any, indexCelda: number) => (
                  <TableCell key={indexCelda}>{celda}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {datos.length > 10 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Mostrando 10 de {datos.length} filas
        </Typography>
      )}
    </Box>
  );
}; 