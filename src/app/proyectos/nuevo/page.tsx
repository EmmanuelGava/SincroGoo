"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { toast } from "sonner"

// Material UI
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import PresentationIcon from '@mui/icons-material/Slideshow'
import SpreadsheetIcon from '@mui/icons-material/TableChart'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'

// Componentes
import { EncabezadoSistema } from "@/componentes/EncabezadoSistema"

// Interfaces
interface GoogleDocument {
  id: string
  name: string
  thumbnailLink?: string
  iconLink?: string
  modifiedTime?: string
}

export default function NuevoProyecto() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [presentacionId, setPresentacionId] = useState("")
  const [hojaCalculoId, setHojaCalculoId] = useState("")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasoActual, setPasoActual] = useState<"datos" | "documentos">("datos")
  
  // Estados para la selección de documentos
  const [metodoSeleccion, setMetodoSeleccion] = useState<"manual" | "seleccionar">("manual")
  const [cargandoPresentaciones, setCargandoPresentaciones] = useState(false)
  const [cargandoHojas, setCargandoHojas] = useState(false)
  const [presentaciones, setPresentaciones] = useState<GoogleDocument[]>([])
  const [hojas, setHojas] = useState<GoogleDocument[]>([])
  const [presentacionSeleccionada, setPresentacionSeleccionada] = useState<string>("")
  const [hojaSeleccionada, setHojaSeleccionada] = useState<string>("")
  const [busquedaPresentacion, setBusquedaPresentacion] = useState("")
  const [busquedaHoja, setBusquedaHoja] = useState("")

  // Función para cargar presentaciones de Google Slides
  const cargarPresentaciones = async () => {
    setCargandoPresentaciones(true)
    try {
      const response = await fetch('/api/editor-proyectos/google/presentaciones')
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error detallado:', errorData)
        
        if (response.status === 401) {
          toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.")
          signIn("google")
          return
        }
        throw new Error("Error al cargar presentaciones")
      }
      
      const data = await response.json()
      setPresentaciones(data.files || [])
    } catch (error) {
      console.error("Error al cargar presentaciones:", error)
      toast.error("No se pudieron cargar tus presentaciones. Inténtalo de nuevo.")
    } finally {
      setCargandoPresentaciones(false)
    }
  }
  
  // Función para cargar hojas de cálculo de Google Sheets
  const cargarHojas = async () => {
    setCargandoHojas(true)
    try {
      const response = await fetch('/api/editor-proyectos/google/hojas')
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.")
          signIn("google")
          return
        }
        throw new Error("Error al cargar hojas de cálculo")
      }
      
      const data = await response.json()
      setHojas(data.files || [])
    } catch (error) {
      console.error("Error al cargar hojas de cálculo:", error)
      toast.error("No se pudieron cargar tus hojas de cálculo. Inténtalo de nuevo.")
    } finally {
      setCargandoHojas(false)
    }
  }

  // Cargar documentos de Google cuando el usuario está autenticado
  useEffect(() => {
    if (status === "authenticated" && metodoSeleccion === "seleccionar") {
      cargarPresentaciones()
      cargarHojas()
    }
  }, [status, metodoSeleccion])

  // Verificar estado de autenticación
  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin")
    return null
  }

  // Filtrar presentaciones según la búsqueda
  const presentacionesFiltradas = presentaciones.filter(doc => 
    doc.name.toLowerCase().includes(busquedaPresentacion.toLowerCase())
  )

  // Filtrar hojas según la búsqueda
  const hojasFiltradas = hojas.filter(doc => 
    doc.name.toLowerCase().includes(busquedaHoja.toLowerCase())
  )

  const validarDatos = () => {
    if (!titulo.trim()) {
      setError("El título del proyecto es obligatorio")
      return false
    }
    return true
  }

  const avanzarPaso = () => {
    if (validarDatos()) {
      setError(null)
      setPasoActual("documentos")
    }
  }

  const extraerIdDesdeUrl = (url: string): string => {
    try {
      // Si ya parece ser un ID, devolverlo directamente
      if (/^[-\w]{25,}$/.test(url)) {
        return url
      }

      // Patrones comunes para ambos tipos de documentos
      const patrones = [
        // Patrones para presentaciones
        /\/presentation\/d\/([-\w]{25,})/,     // Formato normal
        /\/presentation\/d\/([-\w]{25,})\//,   // Con slash al final
        /\/presentation\/d\/([-\w]{25,})\/edit/, // Con /edit
        
        // Patrones para hojas de cálculo
        /\/spreadsheets\/d\/([-\w]{25,})/,     // Formato normal
        /\/spreadsheets\/d\/([-\w]{25,})\//,   // Con slash al final
        /\/spreadsheets\/d\/([-\w]{25,})\/edit/, // Con /edit
        
        // Patrón genérico (último recurso)
        /([-\w]{25,})/                         // Solo ID en cualquier parte
      ]
      
      // Probar cada patrón
      for (const patron of patrones) {
        const coincidencia = url.match(patron)
        if (coincidencia && coincidencia[1]) {
          // Asegurarse de que no hay parámetros extra
          return coincidencia[1].split('?')[0].split('#')[0]
        }
      }
      
      return url  // Si no se puede extraer, devolver la URL original
    } catch (e) {
      console.error("Error al extraer ID desde URL:", e)
      return url  // En caso de error, devolver la URL original
    }
  }

  const handleGuardar = async () => {
    try {
      setCargando(true)
      setError(null)

      // Validar campos
      if (!titulo.trim()) {
        toast.error("El título del proyecto es obligatorio")
        setError("El título es requerido")
        return
      }

      // Obtener IDs de documentos
      let idPresentacionFinal = ""
      let idHojaCalculoFinal = ""

      if (metodoSeleccion === "manual") {
        idPresentacionFinal = extraerIdDesdeUrl(presentacionId)
        idHojaCalculoFinal = extraerIdDesdeUrl(hojaCalculoId)
      } else {
        idPresentacionFinal = presentacionSeleccionada
        idHojaCalculoFinal = hojaSeleccionada
      }

      console.log('🔄 IDs a guardar:', {
        presentacion: idPresentacionFinal,
        hojaCalculo: idHojaCalculoFinal
      })

      // Crear el proyecto usando el endpoint
      const response = await fetch('/api/editor-proyectos/proyectos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: titulo.trim(),
          descripcion: descripcion.trim(),
          slides_id: idPresentacionFinal || null,
          sheets_id: idHojaCalculoFinal || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error al crear proyecto:', errorData)
        throw new Error(errorData.error || 'Error al crear el proyecto')
      }

      const proyecto = await response.json()
      console.log('✅ Proyecto creado:', proyecto)

      toast.success("Proyecto creado exitosamente")
      
      // Construir URL con los IDs
      const params = new URLSearchParams({
        ...(idPresentacionFinal && { idPresentacion: idPresentacionFinal }),
        ...(idHojaCalculoFinal && { idHojaCalculo: idHojaCalculoFinal })
      })

      const url = `/editor-proyectos/${proyecto.id}${params.toString() ? `?${params.toString()}` : ''}`
      console.log('🔄 Redirigiendo a:', url)
      
      router.push(url)
    } catch (error) {
      console.error("Error al guardar proyecto:", error)
      toast.error("Error al crear el proyecto")
      setError(error instanceof Error ? error.message : "Error al crear el proyecto")
    } finally {
      setCargando(false)
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <EncabezadoSistema />
      
      <Box sx={{ maxWidth: 800, mx: "auto", px: 4, py: 8 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 6, gap: 2 }}>
          <IconButton onClick={() => router.back()} sx={{ color: "text.secondary" }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            Nuevo Proyecto
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Tabs value={pasoActual} onChange={(_, value) => setPasoActual(value)}>
              <Tab value="datos" label="Información Básica" />
              <Tab value="documentos" label="Documentos" disabled={!titulo.trim()} />
            </Tabs>

            {pasoActual === "datos" && (
              <Box sx={{ mt: 4 }}>
                <TextField
                  label="Título del Proyecto"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  fullWidth
                  required
                  error={!!error}
                  helperText={error}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Descripción"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  sx={{ mb: 2 }}
                />
              </Box>
            )}

            {pasoActual === "documentos" && (
              <Box sx={{ mt: 4 }}>
                <FormControl component="fieldset" sx={{ mb: 4 }}>
                  <FormLabel component="legend">Método de Selección</FormLabel>
                  <RadioGroup 
                    value={metodoSeleccion} 
                    onChange={(e) => setMetodoSeleccion(e.target.value as "manual" | "seleccionar")}
                  >
                    <FormControlLabel value="manual" control={<Radio />} label="Ingresar IDs manualmente" />
                    <FormControlLabel value="seleccionar" control={<Radio />} label="Seleccionar de mi Drive" />
                  </RadioGroup>
                </FormControl>
                  
                {metodoSeleccion === "manual" ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <TextField
                      label="ID de Presentación"
                      value={presentacionId}
                      onChange={(e) => setPresentacionId(e.target.value)}
                      fullWidth
                      placeholder="URL o ID de Google Slides"
                      helperText="Pega la URL completa o el ID de la presentación"
                    />
                    <TextField
                      label="ID de Hoja de Cálculo"
                      value={hojaCalculoId}
                      onChange={(e) => setHojaCalculoId(e.target.value)}
                      fullWidth
                      placeholder="URL o ID de Google Sheets"
                      helperText="Pega la URL completa o el ID de la hoja de cálculo"
                    />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Resumen de selección */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
                        Archivos Seleccionados:
                      </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PresentationIcon color={presentacionSeleccionada ? "primary" : "disabled"} />
                          <Typography>
                            {presentacionSeleccionada ? 
                              presentaciones.find(p => p.id === presentacionSeleccionada)?.name || "Presentación seleccionada" :
                              "Ninguna presentación seleccionada"}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <SpreadsheetIcon color={hojaSeleccionada ? "primary" : "disabled"} />
                          <Typography>
                            {hojaSeleccionada ? 
                              hojas.find(h => h.id === hojaSeleccionada)?.name || "Hoja de cálculo seleccionada" :
                              "Ninguna hoja de cálculo seleccionada"}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                        <PresentationIcon />
                        <Typography variant="h6">Presentaciones</Typography>
                        <IconButton onClick={cargarPresentaciones} disabled={cargandoPresentaciones}>
                          <RefreshIcon />
                        </IconButton>
                      </Box>
                      <TextField
                        placeholder="Buscar presentaciones..."
                        value={busquedaPresentacion}
                        onChange={(e) => setBusquedaPresentacion(e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          )
                        }}
                      />
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
                        {cargandoPresentaciones ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} variant="rectangular" height={100} />
                          ))
                        ) : (
                          presentacionesFiltradas.map(doc => (
                            <Card
                              key={doc.id} 
                              sx={{
                                cursor: "pointer",
                                border: presentacionSeleccionada === doc.id ? 2 : 1,
                                borderColor: presentacionSeleccionada === doc.id ? "primary.main" : "divider"
                              }}
                              onClick={() => setPresentacionSeleccionada(doc.id)}
                            >
                              <CardContent>
                                <Typography noWrap>{doc.name}</Typography>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </Box>
                    </Box>

                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                        <SpreadsheetIcon />
                        <Typography variant="h6">Hojas de Cálculo</Typography>
                        <IconButton onClick={cargarHojas} disabled={cargandoHojas}>
                          <RefreshIcon />
                        </IconButton>
                      </Box>
                      <TextField
                        placeholder="Buscar hojas de cálculo..."
                        value={busquedaHoja}
                        onChange={(e) => setBusquedaHoja(e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          )
                        }}
                      />
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
                        {cargandoHojas ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} variant="rectangular" height={100} />
                          ))
                        ) : (
                          hojasFiltradas.map(doc => (
                            <Card
                              key={doc.id} 
                              sx={{
                                cursor: "pointer",
                                border: hojaSeleccionada === doc.id ? 2 : 1,
                                borderColor: hojaSeleccionada === doc.id ? "primary.main" : "divider"
                              }}
                              onClick={() => setHojaSeleccionada(doc.id)}
                            >
                              <CardContent>
                                <Typography noWrap>{doc.name}</Typography>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}
          </CardContent>

          <CardActions sx={{ justifyContent: "flex-end", p: 2 }}>
            {pasoActual === "datos" ? (
              <Button
                variant="contained"
                onClick={avanzarPaso}
                disabled={!titulo.trim()}
              >
                Siguiente
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setPasoActual("datos")}
                  sx={{ mr: 1 }}
                >
                  Anterior
                </Button>
                <Button
                  variant="contained"
                  onClick={handleGuardar}
                  disabled={cargando}
                  startIcon={cargando ? <CircularProgress size={20} /> : <AddIcon />}
                >
                  Crear Proyecto
                </Button>
              </>
            )}
          </CardActions>
        </Card>
      </Box>
    </Box>
  )
} 