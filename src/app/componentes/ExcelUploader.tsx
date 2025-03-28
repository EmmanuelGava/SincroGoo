'use client';

import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Tooltip,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

interface ExcelUploaderProps {
  onFileSelected: (archivo: File) => void;
  loading?: boolean;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({
  onFileSelected,
  loading = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Lista de tipos MIME válidos
    const validTypes = [
      'application/vnd.ms-excel',                                     // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/csv',                                                    // .csv
      'application/vnd.oasis.opendocument.spreadsheet',              // .ods
      'text/tab-separated-values',                                   // .tsv
      'application/vnd.ms-excel.sheet.macroEnabled.12',             // .xlsm
      'application/vnd.ms-excel.template.macroEnabled.12',          // .xltm
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12'       // .xlsb
    ];

    // Lista de extensiones válidas
    const validExtensions = ['.xlsx', '.xls', '.csv', '.ods', '.tsv', '.xlsm', '.xltm', '.xlsb'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

    if (!validTypes.includes(selectedFile.type) && !validExtensions.some(ext => fileExtension === ext)) {
      setError('Por favor selecciona un archivo válido (.xlsx, .xls, .csv, .ods, .tsv, .xlsm, .xltm, .xlsb)');
      return;
    }

    setFile(selectedFile);
    setError(null);
    onFileSelected(selectedFile);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatosAceptados = '.xlsx, .xls, .csv, .ods, .tsv, .xlsm, .xltm, .xlsb';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 3,
        border: '2px dashed',
        borderColor: 'grey.300',
        borderRadius: 2,
        bgcolor: 'grey.50',
        position: 'relative',
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={formatosAceptados}
        style={{ display: 'none' }}
        disabled={loading}
      />

      {loading ? (
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Procesando archivo...</Typography>
        </Box>
      ) : (
        <>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {file ? file.name : 'Selecciona un archivo'}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" gutterBottom>
            Arrastra y suelta tu archivo aquí o
          </Typography>
          <Tooltip title={`Formatos aceptados: ${formatosAceptados}`}>
            <Button
              variant="contained"
              onClick={handleClick}
              sx={{ mt: 2 }}
              disabled={loading}
            >
              Seleccionar archivo
            </Button>
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Formatos soportados: {formatosAceptados}
          </Typography>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}; 