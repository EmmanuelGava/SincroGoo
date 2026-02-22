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
  
  // Tipo de proyecto: ambos docs, solo hoja (generar presentación), solo presentación (generar hoja)
  const [tipoProyecto, setTipoProyecto] = useState<"ambos" | "solo_hoja" | "solo_presentacion">("ambos")
  const [generarPresentacionDesdeHoja, setGenerarPresentacionDesdeHoja] = useState(true)
  
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

  // Función para cargar presentaciones de Google Slides (usa /api/google/documents)
  const cargarPresentaciones = async () => {
    setCargandoPresentaciones(true)
    try {
      const response = await fetch('/api/google/documents?type=slides')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error detallado:', errorData)
        
        if (response.status === 401) {
          toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.")
          signIn("google")
          return
        }
        throw new Error("Error al cargar presentaciones")
      }
      
      const data = await response.json()
      // /api/google/documents devuelve { documents } con iconUrl, lastModified
      const docs = (data.documents || []).filter((d: { type: string }) => d.type === 'slides')
      setPresentaciones(docs.map((d: { id: string; name: string; iconUrl?: string; thumbnailLink?: string; lastModified?: string }) => ({
        id: d.id,
        name: d.name,
        iconLink: d.iconUrl,
        thumbnailLink: d.thumbnailLink,
        modifiedTime: d.lastModified
      })))
    } catch (error) {
      console.error("Error al cargar presentaciones:", error)
      toast.error("No se pudieron cargar tus presentaciones. Inténtalo de nuevo.")
    } finally {
      setCargandoPresentaciones(false)
    }
  }
  
  // Función para cargar hojas de cálculo de Google Sheets (usa /api/google/documents)
  const cargarHojas = async () => {
    setCargandoHojas(true)
    try {
      const response = await fetch('/api/google/documents?type=sheets')
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.")
          signIn("google")
          return
        }
        throw new Error("Error al cargar hojas de cálculo")
      }
      
      const data = await response.json()
      // /api/google/documents devuelve { documents } con iconUrl, lastModified
      const docs = (data.documents || []).filter((d: { type: string }) => d.type === 'sheets')
      setHojas(docs.map((d: { id: string; name: string; iconUrl?: string; lastModified?: string }) => ({
        id: d.id,
        name: d.name,
        iconLink: d.iconUrl,
        modifiedTime: d.lastModified
      })))
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
      if (tipoProyecto === "ambos" || tipoProyecto === "solo_presentacion") cargarPresentaciones()
      if (tipoProyecto === "ambos" || tipoProyecto === "solo_hoja") cargarHojas()
    }
  }, [status, metodoSeleccion, tipoProyecto])

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

      // Validar según tipo de proyecto
      if (tipoProyecto === "solo_hoja" && !idHojaCalculoFinal) {
        throw new Error("Selecciona una hoja de cálculo para este proyecto")
      }
      if (tipoProyecto === "solo_presentacion" && !idPresentacionFinal) {
        throw new Error("Selecciona una presentación para este proyecto")
      }
      if (tipoProyecto === "ambos" && !idPresentacionFinal && !idHojaCalculoFinal) {
        throw new Error("Selecciona al menos un documento (presentación o hoja de cálculo)")
      }

      console.log('🔄 IDs a guardar:', {
        presentacion: idPresentacionFinal,
        hojaCalculo: idHojaCalculoFinal,
        tipoProyecto
      })

      // Verificar usuario para obtener usuario_id (igual que proyectos/page)
      const auth_id = session?.user?.id
      const email = session?.user?.email
      const nombre = session?.user?.name
      if (!auth_id) {
        throw new Error('Sesión inválida. Por favor, inicia sesión de nuevo.')
      }
      const verifyRes = await fetch(
        `/api/supabase/users/verify?auth_id=${encodeURIComponent(auth_id)}&email=${encodeURIComponent(email || '')}&nombre=${encodeURIComponent(nombre || '')}`
      )
      if (!verifyRes.ok) {
        const err = await verifyRes.json()
        throw new Error(err.error || 'Error al verificar usuario')
      }
      const { user } = await verifyRes.json()
      const usuario_id = user?.id
      if (!usuario_id) {
        throw new Error('No se pudo obtener el ID del usuario')
      }

      // Crear proyecto con /api/supabase/projects
      const response = await fetch('/api/supabase/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: titulo.trim(),
          descripcion: descripcion.trim(),
          usuario_id,
          presentacion_id: idPresentacionFinal || null,
          hoja_calculo_id: idHojaCalculoFinal || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error al crear proyecto:', errorData)
        throw new Error(errorData.error || 'Error al crear el proyecto')
      }

      const proyecto = await response.json()
      console.log('✅ Proyecto creado:', proyecto)

      let idPresentacionParaEditor = idPresentacionFinal
      let idHojaParaEditor = idHojaCalculoFinal

      // Si solo hoja y se quiere generar presentación, llamar a sheets-to-slides
      if (tipoProyecto === "solo_hoja" && generarPresentacionDesdeHoja && idHojaCalculoFinal) {
        try {
          toast.info("Generando presentación desde los datos de la hoja...")
          const genRes = await fetch('/api/google/slides/sheets-to-slides', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spreadsheetId: idHojaCalculoFinal,
              nombrePresentacion: titulo.trim() || 'Presentación desde hoja'
            })
          })
          const genData = await genRes.json()
          if (genData.exito && genData.datos?.presentationId) {
            idPresentacionParaEditor = genData.datos.presentationId
            await fetch(`/api/supabase/projects/${proyecto.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ presentacion_id: idPresentacionParaEditor })
            })
            toast.success("Presentación generada y proyecto creado")
          } else {
            toast.warning("Proyecto creado, pero no se pudo generar la presentación. Puedes conectarla después.")
          }
        } catch (genErr) {
          console.error("Error al generar presentación:", genErr)
          toast.warning("Proyecto creado. Puedes generar la presentación más tarde desde Conectar documentos.")
        }
      } else {
        toast.success("Proyecto creado exitosamente")
      }

      // Redirigir: al editor si tenemos ambos docs, si no a la página del proyecto/conectar
      if (idPresentacionParaEditor && idHojaParaEditor) {
        const params = new URLSearchParams({
          idPresentacion: idPresentacionParaEditor,
          idHojaCalculo: idHojaParaEditor
        })
        router.push(`/editor-proyectos/${proyecto.id}?${params.toString()}`)
      } else {
        router.push(`/proyectos/${proyecto.id}`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error al crear el proyecto"
      console.error("Error al guardar proyecto:", error)
      toast.error(msg)
      setError(msg)
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
                  <FormLabel component="legend">Tipo de proyecto</FormLabel>
                  <RadioGroup 
                    value={tipoProyecto} 
                    onChange={(e) => setTipoProyecto(e.target.value as "ambos" | "solo_hoja" | "solo_presentacion")}
                  >
                    <FormControlLabel 
                      value="ambos" 
                      control={<Radio />} 
                      label="Conectar ambos (presentación + hoja de cálculo)" 
                    />
                    <FormControlLabel 
                      value="solo_hoja" 
                      control={<Radio />} 
                      label="Solo hoja de cálculo → generar presentación automáticamente" 
                    />
                    <FormControlLabel 
                      value="solo_presentacion" 
                      control={<Radio />} 
                      label="Solo presentación → generar hoja de cálculo (próximamente)" 
                    />
                  </RadioGroup>
                </FormControl>

                {tipoProyecto === "solo_hoja" && (
                  <FormControl component="fieldset" sx={{ mb: 3 }}>
                    <FormLabel component="legend">¿Generar presentación?</FormLabel>
                    <RadioGroup
                      value={generarPresentacionDesdeHoja ? "si" : "no"}
                      onChange={(e) => setGenerarPresentacionDesdeHoja(e.target.value === "si")}
                    >
                      <FormControlLabel value="si" control={<Radio />} label="Sí, generar presentación desde los datos de la hoja" />
                      <FormControlLabel value="no" control={<Radio />} label="No, solo guardar el proyecto (conectar presentación después)" />
                    </RadioGroup>
                  </FormControl>
                )}

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
                    {(tipoProyecto === "ambos" || tipoProyecto === "solo_presentacion") && (
                      <TextField
                        label="ID de Presentación"
                        value={presentacionId}
                        onChange={(e) => setPresentacionId(e.target.value)}
                        fullWidth
                        placeholder="URL o ID de Google Slides"
                        helperText="Pega la URL completa o el ID de la presentación"
                      />
                    )}
                    {(tipoProyecto === "ambos" || tipoProyecto === "solo_hoja") && (
                      <TextField
                        label="ID de Hoja de Cálculo"
                        value={hojaCalculoId}
                        onChange={(e) => setHojaCalculoId(e.target.value)}
                        fullWidth
                        placeholder="URL o ID de Google Sheets"
                        helperText={tipoProyecto === "solo_hoja" ? "La presentación se generará desde estos datos" : "Pega la URL completa o el ID de la hoja de cálculo"}
                      />
                    )}
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Resumen de selección */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
                        Archivos Seleccionados:
                      </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {(tipoProyecto === "ambos" || tipoProyecto === "solo_presentacion") && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <PresentationIcon color={presentacionSeleccionada ? "primary" : "disabled"} />
                            <Typography>
                              {presentacionSeleccionada ? 
                                presentaciones.find(p => p.id === presentacionSeleccionada)?.name || "Presentación seleccionada" :
                                "Ninguna presentación seleccionada"}
                            </Typography>
                          </Box>
                        )}
                        {(tipoProyecto === "ambos" || tipoProyecto === "solo_hoja") && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <SpreadsheetIcon color={hojaSeleccionada ? "primary" : "disabled"} />
                            <Typography>
                              {hojaSeleccionada ? 
                                hojas.find(h => h.id === hojaSeleccionada)?.name || "Hoja de cálculo seleccionada" :
                                tipoProyecto === "solo_hoja" ? "Selecciona una hoja (se generará la presentación)" : "Ninguna hoja de cálculo seleccionada"}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {(tipoProyecto === "ambos" || tipoProyecto === "solo_presentacion") && (
                    <Box sx={{ mb: 4 }}>
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
                            <Skeleton key={i} variant="rectangular" height={80} />
                          ))
                        ) : (
                          presentacionesFiltradas.map(doc => (
                            <Card
                              key={doc.id} 
                              sx={{
                                cursor: "pointer",
                                border: presentacionSeleccionada === doc.id ? 2 : 1,
                                borderColor: presentacionSeleccionada === doc.id ? "primary.main" : "divider",
                                overflow: "hidden",
                                transition: "all 0.2s",
                                "&:hover": { bgcolor: "action.hover" }
                              }}
                              onClick={() => setPresentacionSeleccionada(doc.id)}
                            >
                              {doc.id ? (
                                <Box sx={{ aspectRatio: "16/9", position: "relative", bgcolor: "grey.200" }}>
                                  <Box
                                    component="img"
                                    src={`/api/google/documents/thumbnail?fileId=${doc.id}&type=slides`}
                                    alt={doc.name}
                                    sx={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block"
                                    }}
                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                      const target = e.currentTarget
                                      target.style.display = "none"
                                      if (doc.iconLink) {
                                        target.src = doc.iconLink
                                        target.style.display = "block"
                                        target.style.objectFit = "contain"
                                        target.style.padding = "8px"
                                      }
                                    }}
                                  />
                                </Box>
                              ) : doc.iconLink && (
                                <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                                  <Box component="img" src={doc.iconLink} alt="" sx={{ width: 24, height: 24, flexShrink: 0 }} />
                                </Box>
                              )}
                              <Box sx={{ p: 1.5, minWidth: 0 }}>
                                <Typography noWrap variant="body2" fontWeight={500}>{doc.name}</Typography>
                                {doc.modifiedTime && (
                                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                    {new Date(doc.modifiedTime).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Box>
                            </Card>
                          ))
                        )}
                      </Box>
                    </Box>
                    )}

                    {(tipoProyecto === "ambos" || tipoProyecto === "solo_hoja") && (
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
                            <Skeleton key={i} variant="rectangular" height={80} />
                          ))
                        ) : (
                          hojasFiltradas.map(doc => (
                            <Card
                              key={doc.id} 
                              sx={{
                                cursor: "pointer",
                                border: hojaSeleccionada === doc.id ? 2 : 1,
                                borderColor: hojaSeleccionada === doc.id ? "primary.main" : "divider",
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                p: 2,
                                transition: "all 0.2s",
                                "&:hover": { bgcolor: "action.hover" }
                              }}
                              onClick={() => setHojaSeleccionada(doc.id)}
                            >
                              {doc.iconLink && (
                                <Box component="img" src={doc.iconLink} alt="" sx={{ width: 24, height: 24, flexShrink: 0 }} />
                              )}
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography noWrap variant="body2" fontWeight={500}>{doc.name}</Typography>
                                {doc.modifiedTime && (
                                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                    {new Date(doc.modifiedTime).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Box>
                            </Card>
                          ))
                        )}
                      </Box>
                    </Box>
                    )}
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