# KloSync - Funcionalidades del Proyecto
> Documento de estado actual del proyecto desde una perspectiva de negocio
> Última actualización: Marzo 2026

---

## 🎯 ¿Qué es KloSync?

KloSync es una plataforma integral de productividad diseñada para vendedores, consultores y equipos comerciales que necesitan:

1. **Automatizar la creación de presentaciones** - Generar presentaciones personalizadas desde datos en hojas de cálculo
2. **Gestionar leads y clientes** - CRM con tablero Kanban visual
3. **Comunicarse con clientes** - Chat unificado para WhatsApp, Telegram y Email
4. **Descubrir prospectos** - Explorador de negocios por zona geográfica
5. **Convertir y sincronizar documentos** - 18 herramientas de conversión entre formatos

---

## 📊 MÓDULO 1: GENERACIÓN AUTOMÁTICA DE PRESENTACIONES

### ¿Qué hace?
Convierte datos de hojas de cálculo (Google Sheets o Excel) en presentaciones profesionales de Google Slides, generando una diapositiva personalizada por cada fila de datos.

### Funcionalidades implementadas ✅

#### Creación de proyectos con plantillas
- Conectar una hoja de cálculo de Google Sheets
- Elegir entre 6 plantillas prediseñadas:
  - Catálogo de productos
  - Ficha de cliente
  - Ficha de local/negocio
  - Propuesta comercial
  - Reporte simple
  - Plantilla en blanco
- Mapear columnas del Sheet a campos de la plantilla
- Vista previa antes de generar

#### Personalización de presentaciones
- **Tipografías**: 5 opciones de Google Fonts (Roboto, Montserrat, Playfair Display, Lato, Oswald)
- **Paletas de colores**: 8 paletas predefinidas + selector de color personalizado
- **Logo corporativo**: Subir logo y posicionarlo en 4 ubicaciones (superior izquierda/derecha, inferior izquierda/derecha)
- **Slide de portada**: Opcional con título y subtítulo personalizados
- **Filtros de datos**: Filtrar filas por condiciones (contiene, igual, mayor que, menor que)
- **Ordenamiento**: Ordenar datos por columna (ascendente/descendente)
- **Límite de filas**: Generar solo las primeras 10, 20, 30 o todas las filas

#### Plantillas autoajustables
- Las plantillas se adaptan automáticamente al número de columnas detectadas
- Soporte para imágenes: detecta columnas con URLs de imágenes y las inserta automáticamente
- Alineación de texto configurable (izquierda, centro, derecha)
- Tamaños de fuente y colores personalizables

#### Gestión de presentaciones
- **Sincronización automática**: Programar actualizaciones cada hora, día o semana
- **Trigger por cambios**: Actualizar automáticamente cuando cambian los datos en el Sheet
- **Re-sincronización**: Actualizar slides existentes sin regenerar todo
- **Modo enriquecimiento**: Actualizar datos respetando el diseño manual
- **Historial de generaciones**: Ver todas las generaciones anteriores con fecha, estado y errores
- **Preview con miniaturas**: Carrusel de vista previa al terminar la generación

#### Exportación y compartir
- Exportar presentación a PDF
- Copiar enlace para compartir
- Abrir directamente en Google Slides para edición manual

### Casos de uso reales
- **Vendedor de inmuebles**: Genera 50 fichas de propiedades desde un Sheet con fotos, precios y características
- **Consultor**: Crea reportes mensuales personalizados para cada cliente desde datos de rendimiento
- **Agencia**: Produce catálogos de productos actualizados automáticamente cuando cambian precios o stock

---

## 🗂️ MÓDULO 2: CRM Y GESTIÓN DE LEADS

### ¿Qué hace?
Sistema de gestión de relaciones con clientes con tablero Kanban visual para seguimiento del proceso de ventas.

### Funcionalidades implementadas ✅

#### Tablero Kanban
- Vista visual de leads en columnas por etapa del proceso
- Etapas típicas: Nuevo, Contactado, Calificado, Propuesta, Negociación, Ganado, Perdido
- Arrastrar y soltar leads entre etapas
- Contador de leads por etapa

#### Gestión de leads
- Crear leads manualmente con información básica
- Ver detalles completos de cada lead
- Editar información del lead
- Cambiar estado del lead
- Eliminar leads

#### Información de leads
- Nombre del contacto
- Empresa
- Teléfono
- Email
- Estado actual
- Fecha de creación
- Notas y observaciones

### Funcionalidades pendientes 🔄
- Valor monetario por lead
- Fecha de cierre estimada
- Filtros avanzados (por canal, valor, fecha)
- Reportes de conversión por etapa
- Asignación de leads a miembros del equipo
- Lead scoring (prioridad alta/media/baja)
- Historial de cambios de estado

---

## 💬 MÓDULO 3: CHAT UNIFICADO

### ¿Qué hace?
Centraliza todas las conversaciones con clientes desde múltiples canales en una sola interfaz.

### Funcionalidades implementadas ✅

#### Canales soportados
- **Telegram**: Completamente funcional (recepción de mensajes)
- **WhatsApp Lite**: Conexión QR, envío y recepción funcionales (worker Baileys en Railway). Flujo técnico: [`docs/MENSAJERIA-WHATSAPP-FLUJO.md`](./MENSAJERIA-WHATSAPP-FLUJO.md)
- **Email**: Estructura básica implementada

#### Interfaz de chat
- Lista de conversaciones activas con indicadores por plataforma
- Ventana de chat con historial completo
- Burbujas de mensajes diferenciadas (entrantes/salientes)
- Input unificado para responder
- Header con información del contacto
- Indicadores visuales por plataforma (iconos de Telegram, WhatsApp, Email)

#### Tiempo real
- Actualización automática cuando llegan nuevos mensajes
- Sin necesidad de recargar la página
- Notificaciones visuales de mensajes nuevos

#### Base de datos
- Almacenamiento centralizado de todas las conversaciones
- Historial completo de mensajes
- Vinculación automática con leads del CRM

### Funcionalidades en desarrollo 🔄
- **Envío real de mensajes**: Actualmente solo se guardan en BD, falta integración con APIs externas
- **WhatsApp Business API oficial**: Migración desde WhatsApp Lite a API oficial de Meta
- **Email completo**: Integración con SendGrid o Mailgun
- **Estados de mensaje**: Enviado, entregado, leído
- **Indicador "escribiendo..."**
- **Respuestas rápidas predefinidas**
- **Mensajes programados**
- **Automatización de seguimiento**
- **Chatbot básico**
- **Multiagente** (varios agentes, mismo número)
- **Campañas masivas** (broadcast)
- **Búsqueda en historial**

### Diferenciador único 🌟
- **Envío automático por WhatsApp**: Al terminar de generar una presentación, enviarla automáticamente al cliente por WhatsApp (ningún competidor tiene esto)

---

## 🗺️ MÓDULO 4: EXPLORADOR DE NEGOCIOS

### ¿Qué hace?
Permite buscar establecimientos y negocios en una zona geográfica específica usando Google Maps, ideal para prospección comercial.

### Funcionalidades implementadas ✅

#### Búsqueda geográfica
- Buscar negocios por zona/ubicación
- Filtrar por tipo de establecimiento
- Ver resultados en mapa interactivo
- Obtener información de contacto

#### Exportación de datos
- Exportar resultados a Google Sheets
- Datos incluyen: nombre, dirección, teléfono, categoría, calificación

### Funcionalidades pendientes 🔄
- Exportar directamente a Excel
- Exportar directo al módulo de Contactos (sin pasar por Sheet)
- Filtros por categoría antes de exportar
- Guardar búsquedas frecuentes
- Enriquecimiento automático: email, LinkedIn, sitio web

### Caso de uso real
Un vendedor de sistemas de punto de venta busca todos los restaurantes en una zona, exporta la lista con teléfonos y direcciones, y los contacta uno por uno desde el CRM.

---

## 🔄 MÓDULO 5: HERRAMIENTAS DE CONVERSIÓN (18 HERRAMIENTAS)

### ¿Qué hace?
Suite completa de herramientas para convertir y sincronizar documentos entre diferentes formatos.

### Herramientas implementadas ✅

#### Conversiones de Sheets
1. **Google Sheets → Slides**: Generación masiva con plantillas (módulo principal)
2. **Google Sheets → Excel**: Exportar a formato .xlsx
3. **Google Sheets → Word**: Generar documentos Word con plantilla
4. **Sheets → Slides directo**: Conversión rápida sin plantilla

#### Conversiones de Excel
5. **Excel → Google Sheets**: Importar archivos Excel a Sheets
6. **Excel → Slides**: Generar presentaciones desde Excel
7. **CSV → Google Sheets**: Importar archivos CSV
8. **CSV → Slides**: Generar presentaciones desde CSV

#### Conversiones de Slides
9. **Slides → Sheet**: Extraer textos de cada slide a una hoja
10. **Slides → PowerPoint**: Exportar a formato .pptx
11. **PowerPoint → Slides**: Importar presentaciones PowerPoint

#### Conversiones de PDF
12. **PDF → Sheets**: Extraer datos de PDF (modo texto y modo tabla)

#### Herramientas avanzadas
13. **Fusionar Sheets**: Combinar múltiples hojas (modo append o merge por clave)
14. **Limpiar datos**: Eliminar duplicados, espacios, formatear teléfonos y emails, capitalización

#### Automatizaciones
15. **Sincronización programada**: Cada hora, día o semana
16. **Trigger por cambio**: Webhook cuando cambia el Sheet
17. **Historial de sincronizaciones**: Ver todas las ejecuciones anteriores
18. **Re-sincronización inteligente**: Actualizar sin regenerar todo

### Casos de uso reales
- Importar catálogo de productos desde Excel y generar presentación automática
- Limpiar base de datos de clientes eliminando duplicados y formateando teléfonos
- Fusionar datos de ventas de múltiples sucursales en un solo Sheet
- Extraer datos de facturas en PDF a una hoja de cálculo

---

## 📊 MÓDULO 6: DASHBOARD

### ¿Qué hace?
Panel de control personalizable con métricas y accesos rápidos.

### Funcionalidades implementadas ✅

#### Widgets disponibles
- Métricas de leads (total, por estado)
- Tareas pendientes
- Conversaciones recientes
- Proyectos activos
- Accesos rápidos a herramientas

#### Personalización
- Configurar qué widgets mostrar
- Reordenar widgets
- Modo enfoque (ocultar distracciones)
- Actualización en tiempo real

### Funcionalidades pendientes 🔄
- Gráficos de conversión por etapa
- Métricas de tiempo de respuesta
- Reportes de actividad
- Exportar reportes a PDF

---

## 👤 MÓDULO 7: CONTACTOS (PENDIENTE)

### ¿Qué hará?
Base de datos centralizada de todos los contactos con historial unificado.

### Funcionalidades planificadas 🔄
- CRUD completo de contactos
- Importar desde Google Sheets
- Importar desde CSV
- Ficha de contacto con:
  - Conversaciones vinculadas (WhatsApp, Telegram, Email)
  - Leads del Kanban vinculados
  - Presentaciones generadas vinculadas
  - Historial de interacciones
- Cruzar número de WhatsApp entrante con lista de contactos
- Vincular automáticamente conversaciones a contactos
- Registrar cambios de estado de leads en ficha

---

## 🔐 MÓDULO 8: AUTENTICACIÓN Y USUARIOS

### Funcionalidades implementadas ✅
- Login con Google (OAuth)
- Gestión de sesiones con NextAuth
- Perfiles de usuario
- Configuración de cuenta
- Sincronización de tokens de Google para automatizaciones

---

## 💰 MONETIZACIÓN (EN DESARROLLO)

### Planes propuestos

| Característica | Free | Pro ($19/mes) | Business ($39/mes) |
|---|---|---|---|
| Proyectos Sheets/Slides | 3 | Ilimitados | Ilimitados |
| Sincronizaciones/mes | 50 | Ilimitadas | Ilimitadas |
| CRM Kanban | Solo lectura | Completo | Completo |
| WhatsApp | ✗ | ✓ | ✓ |
| Telegram | Limitado | ✓ | ✓ |
| Email | ✗ | ✗ | ✓ |
| Usuarios del equipo | 1 | 1 | Hasta 5 |
| Soporte | Comunidad | Email 48hs | Email 24hs |

### Implementación pendiente 🔄
- Página /precios funcional
- Integración con Lemon Squeezy (procesador de pagos)
- Tabla de suscripciones en base de datos
- Límites por plan
- Webhooks para eventos de suscripción
- Secuencia de emails de onboarding

---

## 🌍 INTERNACIONALIZACIÓN

### Estado actual
- Interfaz completamente en español
- Documentación en español

### Pendiente 🔄
- Traducción completa al inglés (estimado 5-8 días)
- Configuración de next-intl
- Soporte multi-idioma (español/inglés)
- Fechas y números localizados

---

## 🚀 INFRAESTRUCTURA

### Tecnologías utilizadas
- **Frontend**: Next.js 14, React, TypeScript, Material UI
- **Backend**: Next.js API Routes, Node.js
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: NextAuth.js
- **APIs externas**: Google Sheets API, Google Slides API, Google Drive API, Telegram Bot API
- **Tiempo real**: Supabase Realtime (WebSockets)
- **Hosting**: Vercel (frontend), Railway (servidor WhatsApp)

### Servicios integrados
- Google Workspace (Sheets, Slides, Drive)
- Telegram Bot API
- WhatsApp (Baileys - no oficial)
- Supabase (base de datos, autenticación, storage, realtime)

---

## 📈 DIFERENCIADORES ÚNICOS

### Lo que KloSync tiene y la competencia no (a este precio)

1. **Explorador de establecimientos por zona** → Prospección geográfica integrada
2. **Generación masiva personalizada** → Una presentación por cada fila de datos
3. **Envío automático por WhatsApp** → Presentación lista y enviada al cliente
4. **Flujo completo de ventas** → Explorador → Contactos → CRM → Chat → Presentaciones
5. **Precio accesible** → $19/mes vs $500+/mes de competidores (Rollstack, Slideform)
6. **18 herramientas de conversión** → Todo en un solo lugar
7. **Limpieza inteligente de datos** → Antes de sincronizar
8. **Sincronización automática** → Con pg_cron + triggers por cambio

---

## 🎯 MERCADO OBJETIVO

### Cliente ideal
- Vendedor independiente o consultor
- Agencia pequeña (2-10 personas)
- Equipo comercial de empresa mediana
- Profesionales que:
  - Crean presentaciones con datos semanalmente
  - Gestionan leads por WhatsApp/Telegram
  - Necesitan automatizar tareas repetitivas
  - Pagan herramientas SaaS en dólares

### Geografía
- **Mercado principal**: Estados Unidos, Europa occidental, Australia, Canadá
- **Mercado secundario**: Latinoamérica (validación inicial)

---

## 📊 ESTADO GENERAL DEL PROYECTO

### Completado ✅
- Generación automática de presentaciones con plantillas
- Personalización completa (colores, tipografías, logo, portada)
- Sincronización automática programada
- 18 herramientas de conversión de documentos
- CRM básico con Kanban
- Chat unificado (recepción de mensajes)
- Explorador de negocios
- Dashboard personalizable
- Autenticación con Google

### En desarrollo 🔄
- Envío real de mensajes (WhatsApp, Telegram, Email)
- Módulo de Contactos completo
- Monetización (planes y pagos)
- Internacionalización (inglés)
- WhatsApp Business API oficial
- Respuestas rápidas y automatizaciones de chat

### Pendiente 📋
- Integraciones con HubSpot, Airtable, Notion
- IA para análisis de datos y generación de insights
- Editor visual de plantillas propio
- API pública documentada
- Google Workspace Add-on
- Programa de referidos

---

## 🎯 PRÓXIMOS PASOS CRÍTICOS

### Antes de lanzar (Fase 0)
1. Comprar dominio propio (klosync.com)
2. ~~Mover servidor WhatsApp a Railway~~ ✅ (worker `worker/whatsapp.ts`)
3. Cerrar vulnerabilidades de seguridad
4. Activar RLS en Supabase
5. Traducción completa al inglés

### Primer mes (Fase 1)
1. Implementar monetización con Lemon Squeezy
2. Página /precios funcional
3. Límites por plan
4. Secuencia de emails de onboarding
5. Video demo de 60 segundos

### Segundo mes (Fase 2)
1. Estabilizar WhatsApp Lite (envío/recepción y live inbox ya andan; ver `docs/MENSAJERIA-WHATSAPP-FLUJO.md`)
2. Completar envío de mensajes
3. Onboarding guiado
4. Templates de presentación
5. Rate limiting completo

### Tercer mes (Fase 3)
1. Módulo de Contactos completo
2. Completar Email (SMTP/SendGrid)
3. API pública básica
4. Google Workspace Add-on
5. WhatsApp Business API oficial

---

## 💡 CONCLUSIÓN

KloSync es una plataforma integral que combina automatización de presentaciones, CRM, chat unificado y herramientas de conversión de documentos. Su propuesta de valor única es ofrecer un flujo completo de ventas (desde prospección hasta cierre) en una sola herramienta, a un precio accesible para vendedores individuales y equipos pequeños.

El proyecto está en un estado avanzado de desarrollo con las funcionalidades core implementadas. Los próximos pasos críticos son: estabilizar la infraestructura, implementar monetización, traducir al inglés y lanzar al mercado global.

**Meta a 3 meses**: 200 usuarios Pro = $3,800 USD/mes de ingresos recurrentes.
