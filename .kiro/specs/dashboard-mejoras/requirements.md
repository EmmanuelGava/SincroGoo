# Requirements Document - Dashboard de Mensajería Unificada

## Introduction

El dashboard de SincroGoo debe evolucionar para convertirse en el centro de control principal de la plataforma de mensajería unificada. Los emprendedores necesitan una vista consolidada que les permita gestionar eficientemente todas sus conversaciones, leads y métricas de atención al cliente desde un solo lugar, evitando perder oportunidades comerciales por desorganización.

## Requirements

### Requirement 1

**User Story:** Como emprendedor, quiero ver un resumen ejecutivo de mi actividad de mensajería en tiempo real, para poder tomar decisiones rápidas sobre la atención a mis clientes.

#### Acceptance Criteria

1. WHEN el usuario accede al dashboard THEN el sistema SHALL mostrar métricas en tiempo real de conversaciones activas, mensajes pendientes de respuesta y tiempo promedio de respuesta
2. WHEN hay mensajes sin responder por más de 2 horas THEN el sistema SHALL mostrar una alerta visual prominente
3. WHEN el usuario visualiza las métricas THEN el sistema SHALL actualizar los datos automáticamente cada 30 segundos sin recargar la página
4. IF existen conversaciones de alta prioridad THEN el sistema SHALL destacarlas en la parte superior del dashboard
5. IF el usuario activa el modo concentración THEN el sistema SHALL pausar notificaciones visuales/sonoras pero seguir actualizando datos en tiempo real

### Requirement 2

**User Story:** Como emprendedor, quiero visualizar el estado de mis leads y conversaciones por plataforma, para entender qué canales están generando más oportunidades.

#### Acceptance Criteria

1. WHEN el usuario accede al dashboard THEN el sistema SHALL mostrar un breakdown visual por plataforma (WhatsApp, Telegram, Email, etc.)
2. WHEN el usuario selecciona una plataforma específica THEN el sistema SHALL filtrar todas las métricas para mostrar solo datos de esa plataforma
3. WHEN se reciben nuevos mensajes THEN el sistema SHALL actualizar los contadores por plataforma en tiempo real
4. IF una plataforma tiene problemas de conectividad THEN el sistema SHALL mostrar un indicador de estado de conexión
5. WHEN se visualizan los datos por plataforma THEN el sistema SHALL mostrar la tasa de respuesta, tiempo promedio y volumen por canal

### Requirement 3

**User Story:** Como emprendedor, quiero acceder rápidamente a las conversaciones más importantes, para no perder oportunidades de venta.

#### Acceptance Criteria

1. WHEN el usuario visualiza el dashboard THEN el sistema SHALL mostrar una lista de conversaciones prioritarias basada en tiempo sin respuesta y valor potencial del lead
2. WHEN el usuario hace clic en una conversación prioritaria THEN el sistema SHALL abrir directamente el chat correspondiente
3. WHEN hay mensajes nuevos de leads calificados THEN el sistema SHALL mostrarlos en la sección de alta prioridad
4. IF un lead no ha sido contactado en las últimas 24 horas THEN el sistema SHALL incluirlo en la lista de seguimiento requerido
5. IF el usuario marca una conversación como importante THEN el sistema SHALL mantenerla en la sección prioritaria hasta que el usuario la desmarque

### Requirement 4

**User Story:** Como emprendedor, quiero ver métricas de rendimiento de mi atención al cliente, para identificar áreas de mejora en mi proceso comercial.

#### Acceptance Criteria

1. WHEN el usuario accede a las métricas THEN el sistema SHALL mostrar tiempo promedio de primera respuesta, tasa de conversión de leads y distribución de conversaciones por hora del día
2. WHEN el usuario selecciona un período específico THEN el sistema SHALL actualizar todas las métricas para reflejar solo ese rango de fechas
3. WHEN las métricas muestran tendencias negativas THEN el sistema SHALL proporcionar sugerencias actionables para mejorar
4. IF el tiempo de respuesta supera los objetivos establecidos THEN el sistema SHALL mostrar alertas con recomendaciones específicas
5. WHEN el usuario habilita comparativa THEN el sistema SHALL mostrar la evolución porcentual de cada métrica respecto al período anterior

### Requirement 5

**User Story:** Como emprendedor, quiero gestionar rápidamente las tareas pendientes relacionadas con mis leads, para mantener un seguimiento efectivo de mis oportunidades comerciales.

#### Acceptance Criteria

1. WHEN el usuario visualiza el dashboard THEN el sistema SHALL mostrar una lista de tareas pendientes como seguimientos programados, respuestas requeridas y leads sin contactar
2. WHEN el usuario completa una tarea THEN el sistema SHALL actualizarla automáticamente y removerla de la lista de pendientes
3. WHEN se acerca la fecha límite de una tarea THEN el sistema SHALL mostrar notificaciones visuales progresivamente más prominentes
4. IF hay leads nuevos sin primera respuesta THEN el sistema SHALL crearlos automáticamente como tareas de alta prioridad
5. IF el usuario marca una tarea como recurrente THEN el sistema SHALL generar automáticamente la próxima instancia tras su finalización

### Requirement 6

**User Story:** Como emprendedor, quiero personalizar mi dashboard según mis necesidades específicas de negocio, para optimizar mi flujo de trabajo diario.

#### Acceptance Criteria

1. WHEN el usuario accede a las opciones de personalización THEN el sistema SHALL permitir reorganizar, ocultar o mostrar diferentes secciones del dashboard
2. WHEN el usuario modifica la configuración THEN el sistema SHALL guardar las preferencias automáticamente y aplicarlas en futuras sesiones
3. WHEN el usuario define objetivos personalizados THEN el sistema SHALL mostrar el progreso hacia esos objetivos en tiempo real
4. IF el usuario gestiona múltiples negocios THEN el sistema SHALL permitir cambiar entre diferentes configuraciones de dashboard
5. IF el usuario tiene permisos de administrador THEN el sistema SHALL permitir definir vistas por rol para otros miembros del equipo

### Requirement 7

**User Story:** Como emprendedor, quiero recibir notificaciones inteligentes sobre eventos importantes, para no perder oportunidades críticas mientras trabajo en otras tareas.

#### Acceptance Criteria

1. WHEN ocurren eventos críticos como mensajes de leads VIP o problemas de conectividad THEN el sistema SHALL enviar notificaciones push al navegador
2. WHEN el usuario está inactivo por más de 15 minutos THEN el sistema SHALL enviar un resumen de actividad pendiente
3. WHEN se detectan patrones inusuales en las conversaciones THEN el sistema SHALL alertar al usuario con contexto específico
4. IF el usuario tiene el dashboard abierto en múltiples pestañas THEN el sistema SHALL sincronizar las notificaciones para evitar duplicados
5. WHEN el usuario configura un canal externo THEN el sistema SHALL enviar también las alertas críticas a ese canal

### Requirement 8

**User Story:** Como emprendedor, quiero integrar mi dashboard con herramientas externas que ya uso, para centralizar toda mi información comercial.

#### Acceptance Criteria

1. WHEN el usuario conecta herramientas externas como CRM o calendarios THEN el sistema SHALL sincronizar datos relevantes automáticamente
2. WHEN se actualiza información en sistemas externos THEN el sistema SHALL reflejar los cambios en el dashboard en tiempo real
3. WHEN hay conflictos de datos entre sistemas THEN el sistema SHALL mostrar alertas y permitir resolución manual
4. IF la integración falla THEN el sistema SHALL notificar al usuario y proporcionar pasos para reconectar
5. WHEN el usuario conecta una herramienta prioritaria THEN el sistema SHALL ofrecer configuraciones rápidas predefinidas (plantillas de integración)

### Requirement 9

**User Story:** Como usuario del sistema, quiero que el dashboard funcione de manera segura y eficiente con la arquitectura existente de SincroGoo, para garantizar la protección de mis datos y la integración correcta con todas las funcionalidades.

#### Acceptance Criteria

1. WHEN el usuario accede al dashboard THEN el sistema SHALL validar la sesión JWT de NextAuth usando `getServerSession(authOptions)` antes de mostrar cualquier dato
2. WHEN se cargan datos del dashboard THEN el sistema SHALL aplicar Row Level Security (RLS) de Supabase usando el `supabaseToken` del JWT para mostrar solo información del usuario autenticado
3. WHEN el dashboard realiza consultas a la base de datos THEN el sistema SHALL utilizar las tablas existentes de la estructura actual: `usuarios`, `proyectos`, `leads`, `estados_lead`, `conversaciones`, `mensajes_conversacion`, `sheets`, `slides`, `celdas`, `elementos`, `diapositivas`, `asociaciones`, `historial_cambios`, `configuracion_proyecto`, y `cache`
4. IF el token de Google OAuth expira THEN el sistema SHALL usar `refreshAccessToken()` automáticamente para renovar el token sin interrumpir la sesión del usuario
5. WHEN se actualizan datos en tiempo real THEN el sistema SHALL utilizar Supabase Realtime con el `supabaseToken` del JWT para suscripciones filtradas por usuario_id
6. IF el usuario no tiene sesión válida THEN el middleware SHALL redirigir a `/auth/signin` con el `callbackUrl` del dashboard
7. WHEN el dashboard se ejecuta en desarrollo THEN el sistema SHALL respetar la variable `DEV_MODE_NO_AUTH=true` para bypass de autenticación
8. WHEN el dashboard necesita almacenar preferencias específicas THEN el sistema SHALL crear solo las tablas mínimas necesarias (`dashboard_preferences`, `tasks`) que complementen la estructura existente sin duplicar funcionalidad

### Requirement 10

**User Story:** Como desarrollador del sistema, quiero que el dashboard se integre correctamente con la estructura de APIs existente, para mantener la consistencia arquitectónica y reutilizar servicios ya implementados.

#### Acceptance Criteria

1. WHEN el dashboard necesita datos de conversaciones THEN el sistema SHALL utilizar los endpoints existentes en `/api/chat/` y `/api/conversaciones/`
2. WHEN se requieren datos de leads THEN el sistema SHALL consumir los servicios de `/api/leads/` ya implementados
3. WHEN el dashboard envía mensajes THEN el sistema SHALL utilizar el MessagingService existente que maneja Telegram, WhatsApp y Email
4. IF se necesitan nuevos endpoints THEN el sistema SHALL seguir la estructura de carpetas `/src/app/api/` con autenticación middleware
5. WHEN se almacenan preferencias del dashboard THEN el sistema SHALL crear una nueva tabla `dashboard_preferences` con RLS aplicado

### Requirement 11

**User Story:** Como usuario del sistema, quiero que el dashboard mantenga rendimiento óptimo y sincronización en tiempo real, para trabajar eficientemente sin demoras o inconsistencias.

#### Acceptance Criteria

1. WHEN el dashboard se carga inicialmente THEN el sistema SHALL utilizar Server-Side Rendering (SSR) de Next.js para optimizar el tiempo de carga
2. WHEN hay actualizaciones en tiempo real THEN el sistema SHALL usar React hooks personalizados (useChat, useConversations) ya implementados
3. WHEN se muestran métricas THEN el sistema SHALL implementar caching inteligente para reducir consultas innecesarias a la base de datos
4. IF hay múltiples usuarios conectados THEN el sistema SHALL sincronizar cambios usando Supabase channels con broadcast para notificaciones
5. WHEN el dashboard maneja grandes volúmenes de datos THEN el sistema SHALL implementar paginación y lazy loading para mantener performance

### Requirement 12

**User Story:** Como administrador del sistema, quiero que el dashboard sea compatible con la infraestructura de deployment existente, para facilitar el mantenimiento y las actualizaciones.

#### Acceptance Criteria

1. WHEN se despliega el dashboard THEN el sistema SHALL ser compatible con Vercel y las variables de entorno ya configuradas
2. WHEN se utilizan recursos estáticos THEN el sistema SHALL aprovechar Supabase Storage ya configurado para archivos y assets
3. WHEN se requieren nuevas variables de entorno THEN el sistema SHALL documentarlas en los archivos `.env.development` y `.env.production`
4. IF se añaden nuevas dependencias THEN el sistema SHALL mantener compatibilidad con la versión de Node.js y Next.js existente
5. WHEN se implementan nuevas funcionalidades THEN el sistema SHALL seguir las convenciones de TypeScript y estructura de carpetas ya establecidas