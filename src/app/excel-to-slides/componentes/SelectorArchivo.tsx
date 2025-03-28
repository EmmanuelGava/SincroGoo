import { Button } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

interface SelectorArchivoProps {
  onSeleccionArchivo: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SelectorArchivo({ onSeleccionArchivo }: SelectorArchivoProps) {
  return (
    <Button
      component="label"
      variant="contained"
      startIcon={<CloudUploadIcon />}
      size="large"
      sx={{ minWidth: 200 }}
    >
      Seleccionar Archivo
      <VisuallyHiddenInput 
        type="file" 
        accept=".xlsx,.xls,.csv"
        onChange={onSeleccionArchivo}
      />
    </Button>
  );
} 