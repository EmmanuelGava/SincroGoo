# WhatsApp Lite Integration Tasks

## Contexto
El sistema de chat ya está completamente implementado con soporte para Telegram, Email y SMS. Solo necesitamos integrar WhatsApp Lite para que los usuarios puedan conectar sus números personales de WhatsApp al CRM. La base de datos ya tiene las tablas necesarias: `configuracion_mensajeria_usuario`, `conversaciones`, `mensajes_conversacion`, y `leads`.

## Fase 1: Backend - WhatsApp Lite Service

### Tarea 1.1: Implementar WhatsApp Lite Service Core ✅ COMPLETADA
**Prioridad**: Alta
**Estimación**: 3 días
**Responsable**: Backend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Instalar Puppeteer/Playwright
- [x] Crear clase `WhatsAppLiteService` en `/src/app/servicios/messaging/whatsapp/`
- [x] Implementar método de conexión con QR code
- [x] Implementar escucha de mensajes entrantes
- [x] Implementar envío de mensajes salientes
- [x] Manejo de archivos multimedia
- [x] Gestión de sesiones y reconexión automática
- [x] Integración con sistema de configuración existente

**Archivos creados/modificados**:
- ✅ `src/app/servicios/messaging/whatsapp/WhatsAppLiteService.ts` (NUEVO)
- ✅ `package.json` (agregado puppeteer)

### Tarea 1.2: API Endpoints para WhatsApp Lite ✅ COMPLETADA
**Prioridad**: Alta
**Estimación**: 1 día
**Responsable**: Backend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Crear endpoint `/api/whatsapp/lite/connect`
- [x] Crear endpoint `/api/whatsapp/lite/disconnect`
- [x] Crear endpoint `/api/whatsapp/lite/status`
- [x] Crear endpoint `/api/whatsapp/lite/qr-code`
- [x] Integrar con `configuracion_mensajeria_usuario` existente
- [x] Manejo de errores y respuestas

**Archivos creados**:
- ✅ `src/app/api/whatsapp/lite/connect/route.ts` (NUEVO)
- ✅ `src/app/api/whatsapp/lite/disconnect/route.ts` (NUEVO)
- ✅ `src/app/api/whatsapp/lite/status/route.ts` (NUEVO)
- ✅ `src/app/api/whatsapp/lite/qr-code/route.ts` (NUEVO)

### Tarea 1.3: Integrar con MessagingService existente ✅ COMPLETADA
**Prioridad**: Alta
**Estimación**: 1 día
**Responsable**: Backend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Modificar `MessagingService.ts` para soportar WhatsApp Lite
- [x] Actualizar el método `enviarWhatsApp` para usar WhatsApp Lite
- [x] Integrar con el sistema de configuración de usuarios
- [x] Manejo de sesiones múltiples por usuario
- [x] Integración con tablas `conversaciones` y `mensajes_conversacion`

**Archivos modificados**:
- ✅ `src/app/servicios/messaging/MessagingService.ts` (ACTUALIZADO)
- ✅ `src/app/servicios/messaging/whatsapp/WhatsAppLiteService.ts` (INTEGRADO)

## Fase 2: Base de Datos - Extender Configuración Existente

### Tarea 2.1: Crear tabla para sesiones de WhatsApp Lite ✅ COMPLETADA
**Prioridad**: Alta
**Estimación**: 0.5 días
**Responsable**: Backend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Crear tabla `whatsapp_lite_sessions` para persistir sesiones
- [x] Configurar RLS (Row Level Security)
- [x] Configurar triggers para limpieza automática
- [x] Crear índices para consultas eficientes

**Archivos creados**:
- ✅ `sql/whatsapp_lite_tables.sql` (NUEVO)
- ✅ Migración aplicada en Supabase: `create_whatsapp_lite_tables`

### Tarea 2.2: Crear tabla para templates de WhatsApp Business ✅ COMPLETADA
**Prioridad**: Media
**Estimación**: 0.5 días
**Responsable**: Backend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Crear tabla `whatsapp_templates` para templates de Business API
- [x] Configurar RLS y relaciones
- [x] Crear índices necesarios

**Archivos creados**:
- ✅ `sql/whatsapp_lite_tables.sql` (incluye tabla whatsapp_templates)
- ✅ Migración aplicada en Supabase: `create_whatsapp_lite_tables`

### Tarea 2.3: Migración para extender configuración existente ✅ COMPLETADA
**Prioridad**: Media
**Estimación**: 0.5 días
**Responsable**: Backend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Verificar que `configuracion_mensajeria_usuario` soporte 'whatsapp' en plataforma
- [x] Documentar estructura JSONB para configuración de WhatsApp
- [x] Crear funciones helper para manejo de configuración

**Archivos creados**:
- ✅ `src/app/servicios/messaging/whatsapp/WhatsAppLiteSessionService.ts` (NUEVO)

### Tarea 2.4: Servicio de Sesiones de WhatsApp Lite ✅ COMPLETADA
**Prioridad**: Alta
**Estimación**: 1 día
**Responsable**: Backend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Crear servicio para manejar sesiones en base de datos
- [x] Implementar CRUD completo para sesiones
- [x] Integrar con endpoints de API
- [x] Manejo de sesiones múltiples por usuario
- [x] Limpieza automática de sesiones expiradas

**Archivos creados**:
- ✅ `src/app/servicios/messaging/whatsapp/WhatsAppLiteSessionService.ts` (NUEVO)

## Fase 3: Frontend - Componente de Conexión WhatsApp Lite

### Tarea 3.1: Crear componente WhatsAppConnect ✅ COMPLETADA
**Prioridad**: Alta
**Estimación**: 2 días
**Responsable**: Frontend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Crear `/src/app/configuracion/mensajeria/components/WhatsAppConnect.tsx`
- [x] Implementar selector de tipo de conexión (Lite vs Business)
- [x] Mostrar estado de conexión actual
- [x] Implementar botones de conectar/desconectar
- [x] Mostrar información de la cuenta conectada
- [x] Integrar con sistema de configuración existente

**Archivos modificados**:
- ✅ `src/app/configuracion/mensajeria/components/WhatsAppConnect.tsx` (ACTUALIZADO)

**Funcionalidades agregadas**:
- ✅ Selector entre WhatsApp Lite y WhatsApp Business
- ✅ Integración con endpoints de WhatsApp Lite
- ✅ Diálogo de QR code para WhatsApp Lite
- ✅ Polling de estado de conexión
- ✅ Instrucciones específicas para cada tipo

### Tarea 3.2: Componente QR Code para WhatsApp Lite ✅ COMPLETADA
**Prioridad**: Alta
**Estimación**: 1.5 días
**Responsable**: Frontend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Crear componente para mostrar QR code
- [x] Implementar polling para actualizar QR cada 5 segundos
- [x] Mostrar instrucciones de escaneo
- [x] Indicador de estado de conexión
- [x] Manejo de errores de conexión
- [x] Botón de reconexión

**Nota**: Esta funcionalidad se integró directamente en el componente WhatsAppConnect

### Tarea 3.3: Integrar en página de configuración existente ✅ COMPLETADA
**Prioridad**: Media
**Estimación**: 0.5 días
**Responsable**: Frontend Developer
**Estado**: ✅ COMPLETADA - 21/07/2025

- [x] Modificar `/src/app/configuracion/mensajeria/page.tsx`
- [x] Integrar componente WhatsAppConnect
- [x] Actualizar lógica de guardado de configuración
- [x] Manejo de estados de conexión
- [x] Asegurar compatibilidad con configuraciones existentes

**Nota**: El componente ya estaba integrado en la página existente, solo se actualizó para soportar WhatsApp Lite

## Fase 4: Integración con Chat Existente

### Tarea 4.1: Actualizar ChatWindow para WhatsApp Lite
**Prioridad**: Media
**Estimación**: 1 día
**Responsable**: Frontend Developer

- [ ] Verificar que `ChatWindow.tsx` ya soporte WhatsApp (ya está implementado)
- [ ] Asegurar que el envío de mensajes funcione con WhatsApp Lite
- [ ] Verificar que los archivos multimedia se envíen correctamente
- [ ] Probar flujo completo de chat
- [ ] Integrar con sistema de conversaciones existente

### Tarea 4.2: Actualizar MessagingStatusIndicator
**Prioridad**: Baja
**Estimación**: 0.5 días
**Responsable**: Frontend Developer

- [ ] Verificar que muestre correctamente el estado de WhatsApp Lite
- [ ] Mostrar tipo de conexión (Lite vs Business)
- [ ] Indicar si la sesión está activa
- [ ] Integrar con sistema de configuración existente

## Fase 5: WebSocket para Mensajes en Tiempo Real

### Tarea 5.1: Integrar con sistema de chat existente
**Prioridad**: Media
**Estimación**: 1 día
**Responsable**: Backend Developer

- [ ] Verificar si ya existe WebSocket implementado
- [ ] Integrar mensajes de WhatsApp Lite con el sistema de notificaciones
- [ ] Asegurar que los mensajes aparezcan en tiempo real en el chat
- [ ] Manejo de reconexión de WebSocket
- [ ] Integrar con tablas `conversaciones` y `mensajes_conversacion`

## Fase 6: Sincronización de Leads

### Tarea 6.1: Integrar con sistema de leads existente
**Prioridad**: Media
**Estimación**: 1 día
**Responsable**: Backend Developer

- [ ] Crear servicio para sincronizar contactos de WhatsApp con tabla `leads`
- [ ] Implementar creación automática de leads desde mensajes de WhatsApp
- [ ] Manejar duplicados y conflictos de datos
- [ ] Sincronizar información de perfil (nombre, foto, etc.)
- [ ] Integrar con sistema de estados de lead existente

### Tarea 6.2: Actualizar vista de leads con mensajes
**Prioridad**: Baja
**Estimación**: 0.5 días
**Responsable**: Backend Developer

- [ ] Verificar que `vista_leads_con_mensaje` funcione con WhatsApp
- [ ] Asegurar que los mensajes de WhatsApp aparezcan en la vista
- [ ] Optimizar consultas para incluir WhatsApp

## Fase 7: Testing y QA

### Tarea 7.1: Tests para WhatsApp Lite Service
**Prioridad**: Media
**Estimación**: 1 día
**Responsable**: QA/Backend Developer

- [ ] Tests unitarios para WhatsAppLiteService
- [ ] Tests de conexión y desconexión
- [ ] Tests de envío y recepción de mensajes
- [ ] Tests de manejo de errores
- [ ] Tests de integración con base de datos existente

### Tarea 7.2: Tests de Integración
**Prioridad**: Media
**Estimación**: 1 día
**Responsable**: QA/Backend Developer

- [ ] Tests de flujo completo de conexión
- [ ] Tests de envío de mensajes desde el chat
- [ ] Tests de recepción de mensajes en tiempo real
- [ ] Tests de manejo de archivos multimedia
- [ ] Tests de sincronización de leads

### Tarea 7.3: Tests End-to-End
**Prioridad**: Baja
**Estimación**: 1 día
**Responsable**: QA/Frontend Developer

- [ ] Tests de interfaz de configuración
- [ ] Tests de escaneo de QR code
- [ ] Tests de chat completo con WhatsApp Lite
- [ ] Tests de manejo de errores en UI
- [ ] Tests de integración con sistema existente

## Fase 8: Documentación y Despliegue

### Tarea 8.1: Documentación de Usuario
**Prioridad**: Media
**Estimación**: 0.5 días
**Responsable**: Technical Writer

- [ ] Guía de configuración de WhatsApp Lite
- [ ] Instrucciones de escaneo de QR
- [ ] Troubleshooting común
- [ ] FAQ sobre WhatsApp Lite
- [ ] Documentación de integración con sistema existente

### Tarea 8.2: Despliegue y Configuración
**Prioridad**: Alta
**Estimación**: 0.5 días
**Responsable**: DevOps

- [ ] Configurar Puppeteer/Playwright en servidor
- [ ] Configurar variables de entorno necesarias
- [ ] Tests de producción
- [ ] Monitoreo de sesiones activas
- [ ] Configurar backups de sesiones

## Cronograma Estimado

**Total de días estimados**: 12 días
**Desarrolladores necesarios**: 2-3
**Tiempo estimado con equipo completo**: 6-8 días

### Dependencias Críticas
- Tarea 1.1 debe completarse antes de 1.2
- Tarea 1.2 debe completarse antes de 3.1
- Tarea 2.1 debe completarse antes de 1.1
- Tarea 3.1 debe completarse antes de 4.1
- Tarea 6.1 debe completarse antes de 7.2

### Riesgos Identificados
- Limitaciones de WhatsApp Web (rate limits, desconexiones)
- Problemas de rendimiento con múltiples sesiones de Puppeteer
- Cambios en WhatsApp Web que puedan romper la integración
- Cumplimiento con términos de servicio de WhatsApp
- Conflictos con configuraciones existentes de mensajería

### Mitigaciones
- Implementar sistema robusto de reconexión automática
- Pool de conexiones de Puppeteer para optimizar recursos
- Monitoreo continuo de cambios en WhatsApp Web
- Revisión legal de términos de servicio
- Implementar rate limiting para evitar bloqueos
- Tests exhaustivos de compatibilidad con sistema existente

### Archivos a Modificar/Crear

**Backend:**
- `/src/app/servicios/messaging/whatsapp/WhatsAppLiteService.ts` (nuevo)
- `/src/app/servicios/messaging/MessagingService.ts` (modificar)
- `/src/app/api/whatsapp/lite/` (nuevo directorio con endpoints)
- Migración para crear `whatsapp_lite_sessions` y `whatsapp_templates`

**Frontend:**
- `/src/app/configuracion/mensajeria/components/WhatsAppConnect.tsx` (nuevo)
- `/src/app/configuracion/mensajeria/page.tsx` (modificar)

**Base de Datos:**
- Tabla `whatsapp_lite_sessions` (nueva)
- Tabla `whatsapp_templates` (nueva)
- Uso de `configuracion_mensajeria_usuario` existente
- Uso de `conversaciones` y `mensajes_conversacion` existentes
- Uso de `leads` existente

**Dependencias a agregar:**
```json
{
  "dependencies": {
    "puppeteer": "^21.0.0"
  }
}
```

### Ventajas de la Implementación Optimizada

1. **Reutilización de Infraestructura**: Usa las tablas existentes en lugar de crear nuevas
2. **Compatibilidad Total**: Se integra perfectamente con el sistema de chat existente
3. **Menor Complejidad**: Menos tablas y relaciones que mantener
4. **Migración Simplificada**: No requiere migración de datos existentes
5. **Consistencia de Datos**: Todos los mensajes aparecen en la misma interfaz
6. **Escalabilidad**: Aprovecha la infraestructura existente

---

## 📊 RESUMEN DE PROGRESO - 21/07/2025

### ✅ FASES COMPLETADAS

**Fase 1: Backend - WhatsApp Lite Service** ✅ 100% COMPLETADA
- ✅ Tarea 1.1: WhatsApp Lite Service Core
- ✅ Tarea 1.2: API Endpoints
- ✅ Tarea 1.3: Integración con MessagingService

**Fase 2: Base de Datos** ✅ 100% COMPLETADA
- ✅ Tarea 2.1: Tabla whatsapp_lite_sessions
- ✅ Tarea 2.2: Tabla whatsapp_templates
- ✅ Tarea 2.3: Migración de configuración
- ✅ Tarea 2.4: Servicio de Sesiones

**Fase 3: Frontend - Componente de Conexión WhatsApp Lite** ✅ 100% COMPLETADA
- ✅ Tarea 3.1: Crear componente WhatsAppConnect
- ✅ Tarea 3.2: Componente QR Code
- ✅ Tarea 3.3: Integrar en página de configuración

### 📈 PROGRESO GENERAL
- **Tareas Completadas**: 10/20 (50%)
- **Fases Completadas**: 3/8 (37.5%)
- **Archivos Creados**: 8 archivos nuevos
- **Archivos Modificados**: 3 archivos existentes
- **Base de Datos**: 2 tablas nuevas + migración aplicada

### 🎯 PRÓXIMOS PASOS
**Fase 4: Integración con Chat Existente**
- Tarea 4.1: Actualizar ChatWindow para WhatsApp Lite
- Tarea 4.2: Actualizar MessagingStatusIndicator

### 📁 ARCHIVOS CREADOS HOY
1. `src/app/servicios/messaging/whatsapp/WhatsAppLiteService.ts`
2. `src/app/servicios/messaging/whatsapp/WhatsAppLiteSessionService.ts`
3. `src/app/api/whatsapp/lite/connect/route.ts`
4. `src/app/api/whatsapp/lite/disconnect/route.ts`
5. `src/app/api/whatsapp/lite/status/route.ts`
6. `src/app/api/whatsapp/lite/qr-code/route.ts`
7. `sql/whatsapp_lite_tables.sql`

### 📁 ARCHIVOS MODIFICADOS HOY
1. `src/app/servicios/messaging/MessagingService.ts`
2. `package.json` (agregado puppeteer)
3. `src/app/configuracion/mensajeria/components/WhatsAppConnect.tsx` (ACTUALIZADO)
4. `src/app/servicios/messaging/whatsapp/WhatsAppLiteService.ts` (MODO DESARROLLO)
5. `src/app/api/whatsapp/lite/connect/route.ts` (SIN AUTENTICACIÓN EN DESARROLLO)
6. `src/app/api/whatsapp/lite/status/route.ts` (SIN AUTENTICACIÓN EN DESARROLLO)
7. `public/site.webmanifest` (NUEVO)

### 🗄️ BASE DE DATOS
- ✅ Migración `create_whatsapp_lite_tables` aplicada exitosamente
- ✅ Tablas `whatsapp_lite_sessions` y `whatsapp_templates` creadas
- ✅ RLS y triggers configurados
- ✅ Índices optimizados creados 