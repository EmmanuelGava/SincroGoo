"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { EncabezadoSitio } from "@/components/EncabezadoSitio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Plus, PresentationIcon, FileSpreadsheet, RefreshCw, Search } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { redirect } from "next/navigation"
import { toast } from "sonner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"

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
  
  const [nombre, setNombre] = useState("")
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
  
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (status === "unauthenticated") {
    redirect("/auth/login")
  }
  
  // Cargar documentos de Google cuando el usuario está autenticado
  useEffect(() => {
    if (status === "authenticated" && session?.accessToken && metodoSeleccion === "seleccionar") {
      cargarPresentaciones()
      cargarHojas()
    }
  }, [status, session, metodoSeleccion])
  
  // Función para cargar presentaciones de Google Slides
  const cargarPresentaciones = async () => {
    if (!session?.accessToken) {
      toast.error("No hay sesión activa. Por favor, inicia sesión nuevamente.")
      return
    }
    
    setCargandoPresentaciones(true)
    try {
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.presentation'&fields=files(id,name,thumbnailLink,iconLink,modifiedTime)&pageSize=50",
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
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
    if (!session?.accessToken) {
      toast.error("No hay sesión activa. Por favor, inicia sesión nuevamente.")
      return
    }
    
    setCargandoHojas(true)
    try {
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,thumbnailLink,iconLink,modifiedTime)&pageSize=50",
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
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
  
  // Filtrar presentaciones según la búsqueda
  const presentacionesFiltradas = presentaciones.filter(doc => 
    doc.name.toLowerCase().includes(busquedaPresentacion.toLowerCase())
  )
  
  // Filtrar hojas según la búsqueda
  const hojasFiltradas = hojas.filter(doc => 
    doc.name.toLowerCase().includes(busquedaHoja.toLowerCase())
  )
  
  const validarDatos = () => {
    if (!nombre.trim()) {
      setError("El nombre del proyecto es obligatorio")
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
    if (!nombre.trim()) {
      setError("El nombre del proyecto es obligatorio")
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
    if (!validarFormulario()) return
    
    try {
      setCargando(true)
      setError(null)
      
      // Simulación de guardado en base de datos
      // En una implementación real, aquí se enviaría la información a tu API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Determinar los IDs según el método de selección
      const idPresentacion = metodoSeleccion === "manual" 
        ? presentacionId ? extraerIdDesdeUrl(presentacionId, "presentation") : ""
        : presentacionSeleccionada;
        
      const idHoja = metodoSeleccion === "manual"
        ? hojaCalculoId ? extraerIdDesdeUrl(hojaCalculoId, "spreadsheet") : ""
        : hojaSeleccionada;
      
      console.log("IDs extraídos:", { idPresentacion, idHoja })
      
      if (!idPresentacion && !idHoja) {
        setError("Debes proporcionar al menos un documento (presentación o hoja de cálculo).")
        return
      }
      
      // Obtener títulos de los documentos
      let presentacionTitulo = "";
      let hojasTitulo = "";
      
      if (metodoSeleccion === "seleccionar") {
        // Buscar títulos en las listas de documentos
        if (idPresentacion) {
          const presentacionDoc = presentaciones.find(p => p.id === idPresentacion);
          if (presentacionDoc) presentacionTitulo = presentacionDoc.name;
        }
        
        if (idHoja) {
          const hojaDoc = hojas.find(h => h.id === idHoja);
          if (hojaDoc) hojasTitulo = hojaDoc.name;
        }
      } else {
        // Para método manual, intentar obtener títulos mediante API si hay token
        if (session?.accessToken) {
          try {
            if (idPresentacion) {
              const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${idPresentacion}?fields=name`,
                {
                  headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              if (response.ok) {
                const data = await response.json();
                presentacionTitulo = data.name || "";
              }
            }
            
            if (idHoja) {
              const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${idHoja}?fields=name`,
                {
                  headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              if (response.ok) {
                const data = await response.json();
                hojasTitulo = data.name || "";
              }
            }
          } catch (error) {
            console.error("Error al obtener títulos de documentos:", error);
            // No bloqueamos el flujo si falla la obtención de títulos
          }
        }
      }
      
      // Crear objeto de proyecto
      const fechaActual = new Date().toISOString();
      const nuevoProyecto = {
        nombre: nombre,
        descripcion: descripcion,
        sheetsid: idHoja,
        slidesid: idPresentacion,
        presentaciontitulo: presentacionTitulo,
        hojastitulo: hojasTitulo,
        fechacreacion: fechaActual,
        ultimamodificacion: fechaActual,
        userid: session?.user?.email || ""
      };
      
      // Guardar en Supabase si hay sesión
      let proyectoId = "";
      if (session?.user?.email) {
        try {
          const { data, error } = await supabase
            .from('proyectos')
            .insert([nuevoProyecto])
            .select();
            
          if (error) {
            console.error('Error al guardar proyecto en Supabase:', error);
            toast.error('Error al guardar el proyecto en el servidor');
          } else {
            console.log('Proyecto guardado en Supabase:', data);
            
            if (data && data.length > 0) {
              // Usar el ID generado por Supabase
              proyectoId = data[0].id;
              
              // Actualizar el localStorage con los datos completos de Supabase
              const proyectosGuardados = JSON.parse(localStorage.getItem('proyectos') || '[]');
              proyectosGuardados.push(data[0]);
              localStorage.setItem('proyectos', JSON.stringify(proyectosGuardados));
              
              // Almacenar los IDs en localStorage para uso futuro
              localStorage.setItem("connectedSlides", idPresentacion);
              localStorage.setItem("connectedSheets", idHoja);
              localStorage.setItem("projectName", nombre);
              localStorage.setItem("proyectoActual", proyectoId);
              
              toast.success('Proyecto guardado correctamente');
              
              // Verificar que los IDs se guardaron correctamente
              const slidesGuardado = localStorage.getItem("connectedSlides");
              const sheetsGuardado = localStorage.getItem("connectedSheets");
              
              console.log("IDs guardados en localStorage:", { slidesGuardado, sheetsGuardado });
              
              // Redirigir al editor con los IDs como parámetros de consulta
              const url = `/editor?proyectoId=${proyectoId}&presentacionId=${idPresentacion}&hojaCalculoId=${idHoja}`;
              console.log("Redirigiendo a:", url);
              
              router.push(url);
            }
          }
        } catch (supabaseError) {
          console.error('Error en la operación con Supabase:', supabaseError);
          setError("Error al guardar el proyecto en el servidor. Inténtalo de nuevo.");
        }
      } else {
        // Si no hay sesión, mostrar error
        setError("No hay sesión activa. Por favor, inicia sesión para guardar el proyecto.");
        toast.error("No hay sesión activa");
      }
    } catch (err) {
      console.error("Error al guardar el proyecto:", err)
      setError("Ocurrió un error al guardar el proyecto. Inténtalo de nuevo.")
    } finally {
      setCargando(false)
    }
  }
  
  const extraerIdDesdeUrl = (url: string, tipo: "presentation" | "spreadsheet"): string => {
    try {
      // Si ya parece ser un ID, devolverlo directamente
      if (/^[-\w]{25,}$/.test(url)) {
        return url
      }

      // Patrones específicos por tipo de documento
      let patrones
      if (tipo === "presentation") {
        patrones = [
          /\/presentation\/d\/([-\w]{25,})/,  // Formato normal
          /\/presentation\/d\/([-\w]{25,})\//,  // Con slash al final
          /\/presentation\/d\/([-\w]{25,})\/edit/,  // Con /edit
          /([-\w]{25,})/  // Solo ID en cualquier parte
        ]
      } else {
        patrones = [
          /\/spreadsheets\/d\/([-\w]{25,})/,  // Formato normal
          /\/spreadsheets\/d\/([-\w]{25,})\//,  // Con slash al final
          /\/spreadsheets\/d\/([-\w]{25,})\/edit/,  // Con /edit
          /([-\w]{25,})/  // Solo ID en cualquier parte
        ]
      }
      
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

  // Componente para mostrar un documento de Google
  const DocumentoItem = ({ documento, seleccionado, onClick }: { 
    documento: GoogleDocument, 
    seleccionado: boolean,
    onClick: () => void 
  }) => (
    <div 
      className={`p-3 border rounded-md cursor-pointer transition-colors ${
        seleccionado ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {documento.thumbnailLink ? (
            <img 
              src={documento.thumbnailLink} 
              alt={documento.name} 
              className="w-12 h-12 object-cover rounded-sm border"
            />
          ) : (
            <div className="w-12 h-12 bg-muted flex items-center justify-center rounded-sm">
              {documento.iconLink ? (
                <img src={documento.iconLink} alt="Icono" className="w-6 h-6" />
              ) : (
                documento.id.includes("presentation") ? (
                  <PresentationIcon className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
                )
              )}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{documento.name}</p>
          {documento.modifiedTime && (
            <p className="text-xs text-muted-foreground">
              Modificado: {new Date(documento.modifiedTime).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <EncabezadoSitio />
      
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-8">
          <Button variant="outline" onClick={() => router.push("/proyectos")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Proyectos
          </Button>
          <h1 className="ml-4 text-2xl font-bold">Crear Nuevo Proyecto</h1>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Tabs value={pasoActual} onValueChange={(v) => setPasoActual(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="datos">1. Datos del Proyecto</TabsTrigger>
              <TabsTrigger value="documentos" disabled={!nombre.trim()}>2. Conectar Documentos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="datos">
              <Card>
                <CardHeader>
                  <CardTitle>Información del Proyecto</CardTitle>
                  <CardDescription>
                    Proporciona los detalles básicos para tu nuevo proyecto de sincronización
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Proyecto <span className="text-destructive">*</span></Label>
                    <Input
                      id="nombre"
                      placeholder="Ej: Presentación de Ventas Q1"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Descripción breve del proyecto y su propósito"
                      rows={4}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                    />
                  </div>
                  
                  {error && pasoActual === "datos" && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={avanzarPaso}>
                    Continuar
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="documentos">
              <Card>
                <CardHeader>
                  <CardTitle>Conectar Documentos</CardTitle>
                  <CardDescription>
                    Conecta los documentos de Google para sincronizarlos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Método de selección</Label>
                    <RadioGroup 
                      value={metodoSeleccion} 
                      onValueChange={(v) => setMetodoSeleccion(v as "manual" | "seleccionar")}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual" />
                        <Label htmlFor="manual" className="cursor-pointer">Ingresar URL o ID manualmente</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="seleccionar" id="seleccionar" />
                        <Label htmlFor="seleccionar" className="cursor-pointer">Seleccionar de mis documentos</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {metodoSeleccion === "manual" ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <PresentationIcon className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">Presentación de Google Slides</h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="presentacion-id">ID o URL de la Presentación</Label>
                          <Input
                            id="presentacion-id"
                            placeholder="Ej: https://docs.google.com/presentation/d/1AbCdEfG..."
                            value={presentacionId}
                            onChange={(e) => setPresentacionId(e.target.value)}
                          />
                          <p className="text-sm text-muted-foreground">
                            Pega la URL completa o el ID de tu presentación de Google Slides
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">Hoja de Cálculo de Google Sheets</h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="hoja-id">ID o URL de la Hoja de Cálculo</Label>
                          <Input
                            id="hoja-id"
                            placeholder="Ej: https://docs.google.com/spreadsheets/d/1AbCdEfG..."
                            value={hojaCalculoId}
                            onChange={(e) => setHojaCalculoId(e.target.value)}
                          />
                          <p className="text-sm text-muted-foreground">
                            Pega la URL completa o el ID de tu hoja de cálculo de Google Sheets
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PresentationIcon className="h-5 w-5 text-primary" />
                            <h3 className="font-medium">Presentación de Google Slides</h3>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={cargarPresentaciones}
                            disabled={cargandoPresentaciones}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${cargandoPresentaciones ? 'animate-spin' : ''}`} />
                            Actualizar
                          </Button>
                        </div>
                        
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar presentaciones..."
                            className="pl-9"
                            value={busquedaPresentacion}
                            onChange={(e) => setBusquedaPresentacion(e.target.value)}
                          />
                        </div>
                        
                        <div className="border rounded-md p-1 max-h-60 overflow-y-auto">
                          {cargandoPresentaciones ? (
                            <div className="space-y-2 p-2">
                              {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <Skeleton className="h-12 w-12 rounded-sm" />
                                  <div className="space-y-1 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-24" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : presentacionesFiltradas.length > 0 ? (
                            <div className="space-y-2 p-2">
                              {presentacionesFiltradas.map(doc => (
                                <DocumentoItem 
                                  key={doc.id} 
                                  documento={doc} 
                                  seleccionado={presentacionSeleccionada === doc.id}
                                  onClick={() => setPresentacionSeleccionada(
                                    presentacionSeleccionada === doc.id ? "" : doc.id
                                  )}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-muted-foreground">
                              {presentaciones.length === 0 
                                ? "No se encontraron presentaciones. Haz clic en Actualizar para cargar tus documentos."
                                : "No se encontraron resultados para tu búsqueda."}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            <h3 className="font-medium">Hoja de Cálculo de Google Sheets</h3>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={cargarHojas}
                            disabled={cargandoHojas}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${cargandoHojas ? 'animate-spin' : ''}`} />
                            Actualizar
                          </Button>
                        </div>
                        
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar hojas de cálculo..."
                            className="pl-9"
                            value={busquedaHoja}
                            onChange={(e) => setBusquedaHoja(e.target.value)}
                          />
                        </div>
                        
                        <div className="border rounded-md p-1 max-h-60 overflow-y-auto">
                          {cargandoHojas ? (
                            <div className="space-y-2 p-2">
                              {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <Skeleton className="h-12 w-12 rounded-sm" />
                                  <div className="space-y-1 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-24" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : hojasFiltradas.length > 0 ? (
                            <div className="space-y-2 p-2">
                              {hojasFiltradas.map(doc => (
                                <DocumentoItem 
                                  key={doc.id} 
                                  documento={doc} 
                                  seleccionado={hojaSeleccionada === doc.id}
                                  onClick={() => setHojaSeleccionada(
                                    hojaSeleccionada === doc.id ? "" : doc.id
                                  )}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-muted-foreground">
                              {hojas.length === 0 
                                ? "No se encontraron hojas de cálculo. Haz clic en Actualizar para cargar tus documentos."
                                : "No se encontraron resultados para tu búsqueda."}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {error && pasoActual === "documentos" && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => setPasoActual("datos")}>
                    Volver
                  </Button>
                  <Button onClick={guardarProyecto} disabled={cargando}>
                    {cargando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Proyecto
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
} 

