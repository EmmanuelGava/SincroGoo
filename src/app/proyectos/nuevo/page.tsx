"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, getSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { toast } from "sonner"
import { authService } from "@/servicios/supabase/globales/auth-service"
import { supabase } from "@/servicios/supabase/globales/auth-service"
import { SincroGooAPI } from "@/servicios/supabase/globales/sincroGooAPI"
import { SlidesAPI, SheetsAPI } from "@/servicios/supabase/globales/index-service"

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

// Servicios y utilidades
import { EncabezadoSistema } from "@/componentes/EncabezadoSistema"

// Interfaces para los documentos de Google
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
    const accessToken = session?.accessToken as string | undefined
    
    if (!accessToken) {
      toast.error("No hay sesión activa. Por favor, inicia sesión nuevamente.")
      return
    }
    
    setCargandoPresentaciones(true)
    try {
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.presentation'&fields=files(id,name,thumbnailLink,iconLink,modifiedTime)&pageSize=50",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.")
          authService.signIn("google")
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
    const accessToken = session?.accessToken as string | undefined
    
    if (!accessToken) {
      toast.error("No hay sesión activa. Por favor, inicia sesión nuevamente.")
      return
    }
    
    setCargandoHojas(true)
    try {
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,thumbnailLink,iconLink,modifiedTime)&pageSize=50",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.")
          authService.signIn("google")
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
    const accessToken = session?.accessToken as string | undefined
    
    if (status === "authenticated" && accessToken && metodoSeleccion === "seleccionar") {
      cargarPresentaciones()
      cargarHojas()
      
      // Sincronizar usuario con Supabase
      if (session?.user) {
        authService.sincronizarUsuario(session.user).then(usuario => {
          if (!usuario) {
            console.error("No se pudo sincronizar el usuario con Supabase")
            toast.error("Error al sincronizar el usuario")
          }
        }).catch(err => {
          console.error("Error al sincronizar usuario:", err)
          toast.error("Error al sincronizar el usuario")
        })
      }
    }
  }, [status, session, metodoSeleccion])
  
  // Verificar estado de autenticación
  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    )
  }
  
  if (status === "unauthenticated") {
    redirect("/auth/login")
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
  
  const validarFormulario = () => {
    if (!titulo.trim()) {
      setError("El título del proyecto es obligatorio")
      return false
    }
    
    if (metodoSeleccion === "manual") {
      if (!presentacionId.trim() && !hojaCalculoId.trim()) {
        setError("Debe proporcionar al menos un ID de documento (presentación o hoja de cálculo)")
        return false
      }
    } else {
      if (!presentacionSeleccionada && !hojaSeleccionada) {
        setError("Debe seleccionar al menos un documento (presentación o hoja de cálculo)")
        return false
      }
    }
    
    return true
  }
  
  const guardarProyecto = async () => {
    try {
      setCargando(true)
      setError("")
      
      // Validar campos
      if (!titulo.trim()) {
        toast.error("El título del proyecto es obligatorio")
        setError("El título es requerido")
        return
      }
      
      // Extraer IDs de los documentos
      const { idPresentacion, idHoja } = extraerIdsDocumentos()
      console.log('IDs extraídos:', { idPresentacion, idHoja })
      
      if (!idPresentacion && !idHoja) {
        toast.error("Debe seleccionar al menos una presentación o una hoja de cálculo")
        setError("Debes proporcionar al menos un documento (presentación o hoja de cálculo)")
        return
      }
      
      // Obtener el ID del usuario de Google
      const googleId = session?.user?.id || (session?.user as any)?.sub
      if (!googleId) {
        toast.error("No se pudo obtener el ID del usuario")
        setError("Error de autenticación")
        return
      }
      
      // Sincronizar usuario para obtener el UUID
      let usuarioUUID: string | null = null
      try {
        if (session?.user) {
          const usuario = await authService.sincronizarUsuario(session.user)
          usuarioUUID = usuario?.id || null
        }
      } catch (error) {
        console.error("Error al sincronizar usuario:", error)
        // No bloquear la creación si no podemos obtener el UUID
      }
      
      console.log('Usando ID de Google para crear proyecto:', googleId)
      console.log('UUID de usuario (opcional):', usuarioUUID)
      
      // Obtener títulos para sheets y slides si existen
      let tituloHoja = "Hoja de cálculo"
      let tituloPresentacion = "Presentación"
      
      if (metodoSeleccion === "seleccionar") {
        if (idHoja) {
          tituloHoja = hojas.find(h => h.id === hojaSeleccionada)?.name || tituloHoja
        }
        if (idPresentacion) {
          tituloPresentacion = presentaciones.find(p => p.id === presentacionSeleccionada)?.name || tituloPresentacion
        }
      }
      
      // Crear el proyecto
      const nuevoProyecto = {
        userid: googleId, // ID de Google como TEXT
        usuario_id: usuarioUUID, // UUID de la tabla usuarios (opcional)
        nombre: titulo.trim(),
        descripcion: descripcion.trim() || null,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        sheets_id: idHoja || null,
        slides_id: idPresentacion || null,
        hojastitulo: idHoja ? tituloHoja : null,
        presentaciontitulo: idPresentacion ? tituloPresentacion : null
      }
      
      console.log('Creando proyecto:', nuevoProyecto)
      
      // Guardar en Supabase
      const { data: proyecto, error } = await supabase
        .from('proyectos')
        .insert([nuevoProyecto])
        .select()
        .single()
      
      if (error) {
        console.error('Error al crear proyecto:', error)
        toast.error("Error al crear el proyecto")
        setError(error.message)
        return
      }
      
      if (!proyecto) {
        toast.error("No se pudo crear el proyecto")
        setError("Error al crear el proyecto")
        return
      }
      
      // IMPORTANTE: Guardar los slides y sheets en Supabase
      console.log('Sincronizando slides y sheets con Supabase...')
      
      try {
        // Guardar slide si existe
        if (idPresentacion) {
          console.log('Guardando slide en Supabase:', idPresentacion)
            
          const slideResult = await SincroGooAPI.guardarSlide({
            proyecto_id: proyecto.id || '',
            google_presentation_id: idPresentacion,
            titulo: tituloPresentacion,
            url: `https://docs.google.com/presentation/d/${idPresentacion}/edit`,
            google_id: idPresentacion
          })
          
          console.log('Resultado de guardar slide:', slideResult)
          
          // Llamar también al API REST para asegurar la sincronización
          try {
            const apiResult = await fetch('/api/slides', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                proyectoId: proyecto.id,
                slidesId: idPresentacion,
                titulo: tituloPresentacion,
                url: `https://docs.google.com/presentation/d/${idPresentacion}/edit`
              })
            })
            
            if (!apiResult.ok) {
              console.warn('Advertencia: No se pudo sincronizar correctamente con la API:', await apiResult.text())
            } else {
              console.log('Sincronización con API exitosa:', await apiResult.json())
            }
          } catch (apiError) {
            console.warn('Error al sincronizar con API:', apiError)
          }
        }
        
        // Guardar sheet si existe
        if (idHoja) {
          console.log('Guardando sheet en Supabase:', idHoja)
            
          const sheetResult = await SheetsAPI.crearSheet({
            proyecto_id: proyecto.id || '',
            sheets_id: idHoja,
            titulo: tituloHoja,
            nombre: tituloHoja,
            google_id: idHoja,
            url: `https://docs.google.com/spreadsheets/d/${idHoja}/edit`
          })
          
          console.log('Resultado de guardar sheet:', sheetResult)
          
          // Llamar también al API REST para asegurar la sincronización
          try {
            const apiResult = await fetch('/api/sheets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                proyectoId: proyecto.id,
                sheetsId: idHoja,
                titulo: tituloHoja,
                url: `https://docs.google.com/spreadsheets/d/${idHoja}/edit`
              })
            })
            
            if (!apiResult.ok) {
              console.warn('Advertencia: No se pudo sincronizar correctamente con la API:', await apiResult.text())
            } else {
              console.log('Sincronización con API exitosa:', await apiResult.json())
            }
          } catch (apiError) {
            console.warn('Error al sincronizar con API:', apiError)
          }
        }
      } catch (syncError) {
        console.error('Error al sincronizar con Supabase:', syncError)
        // No bloquear la redirección si falla la sincronización
      }
      
      // Mostrar mensaje de éxito
      toast.success("Proyecto creado correctamente")
      
      // Redirigir al editor del proyecto con los parámetros correctos
      router.push(`/editor-proyectos?idProyectoActual=${proyecto.id}&idPresentacion=${idPresentacion || ''}&idHojaCalculo=${idHoja || ''}`);
      
    } catch (error) {
      console.error('Error al guardar proyecto:', error)
      toast.error("Error al crear el proyecto")
      setError("Error al crear el proyecto")
    } finally {
      setCargando(false)
    }
  }

  const extraerIdsDocumentos = () => {
    let idPresentacion = ""
    let idHoja = ""
    
    if (metodoSeleccion === "manual") {
      // Si es manual, usar los IDs ingresados directamente
      idPresentacion = presentacionId.trim()
      idHoja = hojaCalculoId.trim()
    } else {
      // Si es selección, usar los IDs de los documentos seleccionados
      idPresentacion = presentacionSeleccionada
      idHoja = hojaSeleccionada
    }
    
    // Si los IDs son URLs, extraer el ID
    if (idPresentacion.includes("docs.google.com")) {
      idPresentacion = extraerIdDesdeUrl(idPresentacion)
    }
    if (idHoja.includes("docs.google.com")) {
      idHoja = extraerIdDesdeUrl(idHoja)
    }
    
    return { idPresentacion, idHoja }
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
      
      console.error(`No se pudo extraer ID de ${url}`)
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

      // Validar formulario
      if (!validarFormulario()) {
        setCargando(false)
        return
      }

      // Crear el proyecto
      await guardarProyecto()
      
    } catch (error) {
      console.error('Error al guardar proyecto:', error)
      setError('Error al guardar el proyecto. Por favor, inténtalo de nuevo.')
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

        <Card sx={{ mb: 4 }}>
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
                    />
                    <TextField
                      label="ID de Hoja de Cálculo"
                            value={hojaCalculoId}
                            onChange={(e) => setHojaCalculoId(e.target.value)}
                      fullWidth
                      placeholder="URL o ID de Google Sheets"
                    />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
