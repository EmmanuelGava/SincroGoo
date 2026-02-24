'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  TableChart as TableChartIcon,
  Slideshow as SlideshowIcon,
  Preview as PreviewIcon,
  Link as LinkIcon,
  OpenInNew as OpenInNewIcon,
  AutoAwesome as AutoAwesomeIcon,
  PictureAsPdf as PdfIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { EncabezadoSistema } from '@/app/componentes/EncabezadoSistema';
import { PreviewSlideCSS } from '@/app/editor-proyectos/componentes/plantilla/PreviewSlideCSS';
import { PLANTILLAS } from '@/app/editor-proyectos/plantilla/templates';
import type { ColumnaHoja, FilaHoja } from '@/app/editor-proyectos/types';
import { toast } from 'sonner';

const pasos = [
  'Conectar Google Sheets',
  'Configurar plantilla',
  'Previsualizar',
  'Generar presentación',
];

const SLIDES_EDIT_URL = (id: string) =>
  `https://docs.google.com/presentation/d/${id}/edit`;
const SLIDES_VIEW_URL = (id: string) =>
  `https://docs.google.com/presentation/d/${id}/view`;

/** Extrae el spreadsheetId de una URL de Google Sheets */
function extractSpreadsheetId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes('docs.google.com')) return null;
    const match = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Convierte respuesta de API Sheets (getData) a columnas y filas para PreviewSlideCSS */
function sheetDataToColumnasFilas(datos: {
  encabezados: string[];
  filas: Array<{ valores: Array<{ valor?: unknown }>; indice?: number }>;
}): { columnas: ColumnaHoja[]; filas: FilaHoja[] } {
  const columnas: ColumnaHoja[] = (datos.encabezados || []).map((titulo, i) => ({
    id: `col-${i + 1}`,
    titulo: (titulo && String(titulo).trim()) || `Columna ${i + 1}`,
  }));
  const filas: FilaHoja[] = (datos.filas || []).map((fila, rowIndex) => ({
    id: `fila-${rowIndex + 1}`,
    numeroFila: fila.indice ?? rowIndex + 2,
    valores: (fila.valores || []).map((v, colIndex) => ({
      columnaId: `col-${colIndex + 1}`,
      valor: v.valor != null ? String(v.valor) : '',
      tipo: undefined,
    })),
  }));
  return { columnas, filas };
}

export default function SheetsToSlidesPage() {
  const { data: session, status } = useSession();
  const [urlSheet, setUrlSheet] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [pasoActivo, setPasoActivo] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Datos del Sheet (paso 1+)
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [columnas, setColumnas] = useState<ColumnaHoja[]>([]);
  const [filas, setFilas] = useState<FilaHoja[]>([]);
  const [templateType, setTemplateType] = useState<string>('ficha_local');
  const [tituloPresentacion, setTituloPresentacion] = useState('');

  // Generación (paso 4)
  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [dialogoGenerarAbierto, setDialogoGenerarAbierto] = useState(false);
  const [resultado, setResultado] = useState<{
    generadas: number;
    total: number;
    fallidas: number;
    errores: { fila: number; error: string }[];
    presentationId?: string;
    proyectoId?: string;
  } | null>(null);

  const columnMapping: Record<string, string> = {}; // Por nombre de columna = placeholder

  const handleConectarSheet = useCallback(() => {
    if (!urlSheet.trim()) {
      setError('Por favor ingresa la URL de Google Sheets');
      return;
    }
    const id = extractSpreadsheetId(urlSheet);
    if (!id) {
      setError('URL no válida. Debe ser un enlace de Google Sheets (docs.google.com/spreadsheets/d/...)');
      return;
    }
    setSpreadsheetId(id);
    setError(null);
    setPasoActivo(1);
  }, [urlSheet]);

  // Cargar datos del Sheet al pasar al paso 1
  useEffect(() => {
    if (pasoActivo !== 1 || !spreadsheetId || status !== 'authenticated') return;
    setCargandoDatos(true);
    setError(null);
    fetch(
      `/api/google/sheets?action=getData&spreadsheetId=${encodeURIComponent(spreadsheetId)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!data.exito || !data.datos) {
          setError(data.error || 'No se pudieron cargar los datos de la hoja');
          return;
        }
        const { columnas: c, filas: f } = sheetDataToColumnasFilas(data.datos);
        setColumnas(c);
        setFilas(f);
        if (f.length === 0) {
          setError('La hoja no tiene filas de datos');
        }
      })
      .catch(() => setError('Error al conectar con la hoja'))
      .finally(() => setCargandoDatos(false));
  }, [pasoActivo, spreadsheetId, status]);

  const pollJob = useCallback((jobId: string) => {
    const interval = 2000;
    const poll = (): void => {
      fetch(`/api/google/slides/plantilla/job/${jobId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.exito || !data.datos) {
            setTimeout(poll, interval);
            return;
          }
          const {
            estado,
            total_filas,
            filas_procesadas,
            filas_error,
            errores,
            presentation_id,
          } = data.datos;
          const pct =
            total_filas > 0
              ? Math.round(((filas_procesadas + filas_error) / total_filas) * 100)
              : 0;
          setProgreso(Math.min(pct, 99));
          setResultado({
            generadas: filas_procesadas,
            total: total_filas,
            fallidas: filas_error,
            errores: Array.isArray(errores) ? errores : [],
          });
          if (estado === 'completado') {
            setProgreso(100);
            setGenerando(false);
            toast.success(`Se generaron ${filas_procesadas} diapositivas correctamente`);
            if (filas_error > 0) {
              toast.warning(`${filas_error} filas fallaron. Revisa el resumen.`);
            }
            setResultado((r) =>
              r ? { ...r, presentationId: presentation_id } : r
            );
            return;
          }
          if (estado === 'error') {
            setGenerando(false);
            toast.error('Error en la generación');
            return;
          }
          setTimeout(poll, interval);
        })
        .catch(() => setTimeout(poll, interval));
    };
    poll();
  }, []);

  const handleGenerarConfirmar = useCallback(async () => {
    if (!spreadsheetId || !session?.user?.id) {
      toast.error('Faltan datos o sesión');
      return;
    }
    setGenerando(true);
    setProgreso(0);
    setResultado(null);
    try {
      const auth_id = session.user.id;
      const email = session.user.email ?? '';
      const nombre = session.user.name ?? '';
      const verifyRes = await fetch(
        `/api/supabase/users/verify?auth_id=${encodeURIComponent(auth_id)}&email=${encodeURIComponent(email)}&nombre=${encodeURIComponent(nombre)}`
      );
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Error al verificar usuario');
      }
      const { user } = await verifyRes.json();
      const usuario_id = user?.id;
      if (!usuario_id) throw new Error('No se pudo obtener el ID del usuario');

      const nombreProyecto =
        tituloPresentacion.trim() || `Sheets a Slides ${new Date().toLocaleDateString()}`;
      const createRes = await fetch('/api/supabase/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreProyecto,
          usuario_id,
          hoja_calculo_id: spreadsheetId,
          modo: 'plantilla',
          metadata: { plantilla_template_id: templateType },
        }),
      });
      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(errData.error || 'Error al crear el proyecto');
      }
      const { id: proyectoId } = await createRes.json();

      const encabezados = columnas.map((c) => c.titulo);
      const body: Record<string, unknown> = {
        spreadsheetId,
        proyectoId,
        templateType,
        tituloPresentacion: nombreProyecto,
        columnMapping: Object.keys(columnMapping).length > 0 ? columnMapping : undefined,
      };
      if (Object.keys(columnMapping).length === 0) {
        body.encabezados = encabezados;
      }

      const genRes = await fetch('/api/google/slides/plantilla/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const genData = await genRes.json();
      if (!genData.exito || !genData.datos?.job_id) {
        throw new Error(genData.error || 'Error al iniciar generación');
      }
      toast.info('Generación iniciada. Procesando en segundo plano...');
      setResultado((r) =>
        r ? { ...r, proyectoId } : { generadas: 0, total: filas.length, fallidas: 0, errores: [], proyectoId }
      );
      pollJob(genData.datos.job_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al generar';
      toast.error(msg);
      setGenerando(false);
    }
  }, [
    spreadsheetId,
    session?.user?.id,
    session?.user?.email,
    session?.user?.name,
    tituloPresentacion,
    templateType,
    columnas,
    filas.length,
    pollJob,
  ]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (status === 'unauthenticated') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <EncabezadoSistema />
        <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
          <Alert severity="info">
            Inicia sesión para usar Sheets a Slides con plantillas.
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <EncabezadoSistema />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} mb={4}>
            <SlideshowIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Google Sheets a Slides
            </Typography>
          </Stack>
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Convierte tus datos de Google Sheets en presentaciones con plantillas.
            Conecta tu hoja, elige plantilla y genera una diapositiva por fila.
          </Typography>

          <Stepper activeStep={pasoActivo} sx={{ mb: 4 }}>
            {pasos.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 4 }}>
            {pasoActivo === 0 && (
              <Stack spacing={2} alignItems="center" width="100%" maxWidth={600}>
                <TextField
                  fullWidth
                  label="URL de Google Sheets"
                  variant="outlined"
                  value={urlSheet}
                  onChange={(e) => setUrlSheet(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  InputProps={{
                    startAdornment: (
                      <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<TableChartIcon />}
                  onClick={handleConectarSheet}
                  size="large"
                >
                  Conectar Google Sheets
                </Button>
              </Stack>
            )}

            {pasoActivo === 1 && (
              <Stack spacing={3} maxWidth={600}>
                {cargandoDatos ? (
                  <Stack alignItems="center" py={4}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Cargando datos de la hoja...
                    </Typography>
                  </Stack>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {columnas.length} columnas, {filas.length} filas cargadas.
                    </Typography>
                    <FormControl fullWidth>
                      <InputLabel>Plantilla</InputLabel>
                      <Select
                        value={templateType}
                        label="Plantilla"
                        onChange={(e) => setTemplateType(e.target.value)}
                      >
                        {PLANTILLAS.filter((p) => p.id !== 'blanco').map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Título de la presentación"
                      value={tituloPresentacion}
                      onChange={(e) => setTituloPresentacion(e.target.value)}
                      placeholder="Ej: Mi catálogo de productos"
                    />
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                      <Button onClick={() => setPasoActivo(0)}>Atrás</Button>
                      <Button
                        variant="contained"
                        startIcon={<PreviewIcon />}
                        onClick={() => setPasoActivo(2)}
                        disabled={filas.length === 0}
                      >
                        Ver vista previa
                      </Button>
                    </Stack>
                  </>
                )}
              </Stack>
            )}

            {pasoActivo === 2 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Vista previa (primera fila)
                </Typography>
                <PreviewSlideCSS
                  templateType={templateType}
                  columnMapping={columnMapping}
                  columnas={columnas}
                  primeraFila={filas[0] ?? null}
                />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button onClick={() => setPasoActivo(1)}>Atrás</Button>
                  <Button
                    variant="contained"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => {
                      setDialogoGenerarAbierto(true);
                      setResultado(null);
                    }}
                    disabled={filas.length === 0}
                  >
                    Generar presentación
                  </Button>
                </Stack>
              </Stack>
            )}

            {pasoActivo === 3 && resultado?.presentationId && (
              <Stack spacing={2} alignItems="center" py={2}>
                <Typography color="success.main" fontWeight={600}>
                  Listo. Se generaron {resultado.generadas} diapositivas.
                </Typography>
                {resultado.fallidas > 0 && (
                  <Typography color="warning.main">
                    {resultado.fallidas} filas fallaron.
                  </Typography>
                )}
                <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
                  <Button
                    variant="contained"
                    href={SLIDES_EDIT_URL(resultado.presentationId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<OpenInNewIcon />}
                  >
                    Abrir en Google Slides
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PdfIcon />}
                    onClick={() => {
                      const url = `/api/google/slides/export-pdf?presentationId=${resultado.presentationId}&nombre=presentacion`;
                      window.open(url, '_blank');
                    }}
                  >
                    Exportar a PDF
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => {
                      const link = SLIDES_VIEW_URL(resultado.presentationId!);
                      navigator.clipboard.writeText(link);
                      toast.success('Enlace copiado al portapapeles');
                    }}
                  >
                    Copiar enlace
                  </Button>
                </Stack>
                {resultado.proyectoId && (
                  <Button
                    variant="outlined"
                    href={`/proyectos/${resultado.proyectoId}`}
                  >
                    Ir al proyecto
                  </Button>
                )}
              </Stack>
            )}
          </Box>
        </Paper>
      </Container>

      <Dialog
        open={dialogoGenerarAbierto}
        onClose={() => !generando && setDialogoGenerarAbierto(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generar presentación</DialogTitle>
        <DialogContent>
          {!generando && !resultado ? (
            <Typography sx={{ mb: 2 }}>
              Se generarán {filas.length} diapositivas, una por cada fila del
              Sheet. Se creará un proyecto y el proceso se ejecuta en segundo
              plano. ¿Continuar?
            </Typography>
          ) : generando || (resultado && resultado.generadas + resultado.fallidas < resultado.total) ? (
            <Box>
              <Typography sx={{ mb: 1 }}>
                Procesando fila{' '}
                {(resultado?.generadas ?? 0) + (resultado?.fallidas ?? 0) + 1} de{' '}
                {resultado?.total ?? filas.length}...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progreso}
                sx={{ mt: 2 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {progreso}%
              </Typography>
            </Box>
          ) : resultado ? (
            <Box>
              <Typography color="success.main" fontWeight={600}>
                Se generaron {resultado.generadas} diapositivas correctamente.
              </Typography>
              {resultado.fallidas > 0 && (
                <Box component="ul" sx={{ pl: 2, mt: 1, maxHeight: 120, overflow: 'auto' }}>
                  {resultado.errores.slice(0, 5).map((e) => (
                    <li key={e.fila}>
                      <Typography variant="body2" color="text.secondary">
                        Fila {e.fila}: {e.error}
                      </Typography>
                    </li>
                  ))}
                  {resultado.errores.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      ... y {resultado.errores.length - 5} más
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {!resultado || resultado.generadas + resultado.fallidas < resultado.total ? (
            <>
              <Button
                onClick={() => setDialogoGenerarAbierto(false)}
                disabled={generando}
              >
                Cancelar
              </Button>
              {!generando && (
                <Button variant="contained" onClick={handleGenerarConfirmar}>
                  Continuar
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="contained"
                href={resultado?.presentationId ? SLIDES_EDIT_URL(resultado.presentationId) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<OpenInNewIcon />}
              >
                Abrir presentación
              </Button>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={() => {
                  if (resultado?.presentationId) {
                    window.open(
                      `/api/google/slides/export-pdf?presentationId=${resultado.presentationId}&nombre=presentacion`,
                      '_blank'
                    );
                  }
                }}
              >
                Exportar PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={() => {
                  if (resultado?.presentationId) {
                    navigator.clipboard.writeText(SLIDES_VIEW_URL(resultado.presentationId));
                    toast.success('Enlace copiado');
                  }
                }}
              >
                Copiar enlace
              </Button>
              <Button
                onClick={() => {
                  setDialogoGenerarAbierto(false);
                  setPasoActivo(3);
                }}
              >
                Cerrar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
