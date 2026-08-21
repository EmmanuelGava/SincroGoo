# Chat: preview de links y documentos

Fecha: 2026-08-21. Inbox WhatsApp en `MessageBubble` / `FileAttachment`.

## Objetivo

1. Una URL en un mensaje muestra una tarjeta tipo WhatsApp (miniatura, título, descripción, dominio) y es clickeable.
2. Un documento muestra tarjeta (icono, nombre, tamaño, descargar) y preview in-app para PDF e imágenes.
3. Los documentos **nuevos** se persisten de verdad (archivo + metadata). Los `[Archivo]` viejos no se recuperan.

Imágenes y audios no cambian.

## Fuera de alcance

- Re-descargar media histórica de WhatsApp.
- Preview in-app de Word/Excel (solo descarga).
- Más de una tarjeta de link por mensaje.
- Push, CRM Kanban, o rediseño general del chat.

## Arquitectura

Dos piezas independientes enganchadas en `MessageBubble`:

| Pieza | Persistencia | Render |
|---|---|---|
| Link | Cache on-demand en tabla `chat_link_previews` | `LinkPreview` |
| Documento | Bucket `chat-files` + metadata del mensaje | `FileAttachment` |

El worker de WhatsApp no hace unfurl. El preview se pide al abrir el hilo, para cubrir también URLs ya guardadas.

## Links

### Detección

`MessageBubble` extrae la **primera** URL `http`/`https` del `contenido`. El resto del texto se renderiza con esas URLs convertidas en `<a target="_blank" rel="noopener noreferrer">`.

Si el mensaje es **solo** esa URL (trim, sin otro texto), no se duplica el string crudo: se muestra la tarjeta. Si hay texto alrededor, texto + tarjeta debajo.

### API

`GET /api/chat/link-preview?url=` (sesión NextAuth).

Respuesta:

```json
{ "title": "...", "description": "...", "image": "...", "siteName": "...", "url": "..." }
```

`image` es una URL same-origin: `/api/chat/link-preview/image?url=<og-image>` (el cliente nunca carga el host original; CSP actual no lo permite).

### Fetch y cache

1. Normalizar la URL (trim). Clave de cache = URL exacta.
2. Hit en `chat_link_previews` y no vencido (7 días) → JSON.
3. Miss → GET HTML (timeout 5s, máximo 512 KB, follow redirects con las mismas guardas SSRF). Parsear `og:title`, `og:description`, `og:image`, `og:site_name`. Fallback de título: `<title>`. Fallback de siteName: hostname.
4. Guardar fila y responder.
   - HTML OK pero sin OG: cachear `title` = hostname, sin imagen.
   - Timeout, no-HTML, SSRF o error de red: **no** cachear 7 días; no hay tarjeta.

### SSRF

Rechazar: no-http(s), localhost, IPs loopback/privadas/link-local (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`), hostnames que resuelvan a esas IPs, `file://` y similares. Aplicar lo mismo a cada hop de redirect y a la URL de `og:image`.

### Tabla `chat_link_previews`

| Columna | Tipo | Notas |
|---|---|---|
| url | text PK | URL pedida |
| title | text | |
| description | text | |
| image_url | text | OG image original (el proxy la usa) |
| site_name | text | |
| fetched_at | timestamptz | |
| expires_at | timestamptz | `fetched_at + 7 days` |

RLS: sin acceso cliente. Solo service role / API server.

### UI `LinkPreview`

Ancho ~280px. Miniatura 16:9 arriba (si hay y carga). Título 1 línea, descripción 2 líneas, dominio abajo. Clic abre `url` en pestaña nueva. Miniatura rota → se oculta la imagen, quedan título + dominio. Fetch de preview fallido o pendiente → el texto ya es link clickeable; no se bloquea el hilo.

## Documentos

### Por qué hoy se ve `[Archivo]`

`persistIncomingWaMedia` sube `kind === 'file'` a `chat-images`. Ese bucket no es para PDF/Office, el upload falla, no hay `file_url`, y el contenido queda en el placeholder `[Archivo]`. El catchup de historial ni intenta bajar el binario. `FileAttachment` para no-imagen/no-audio es un `Typography` con el nombre.

Outgoing está bloqueado a propósito: `validateOutgoingMedia` responde “Los documentos aún no se pueden enviar”.

### Bucket `chat-files`

Bucket público nuevo en el proyecto Supabase de Klosync, límite **16 MB** (igual que `INCOMING_MEDIA_MAX_BYTES`). Paths: `{userId}/in/{waId}.{ext}` incoming, `{userId}/{conversationId}/{timestamp}_{rand}.{ext}` outgoing.

`/api/chat/media` acepta también `/storage/v1/object/public/chat-files/`.

### Incoming (Baileys)

1. Clasificar `documentMessage` como hoy (`kind: 'file'`, `fileName`, `mimetype`).
2. Bajar binario y subir a `chat-files` (no a `chat-images`).
3. Metadata del mensaje: `file_url`, `file_type: 'file'` (nunca `'document'`), `file_name`, `file_size`, `mime_type`.
4. `contenido`: caption si existe; si no, `file_name`; nunca el placeholder si hay nombre.
5. Si la baja o el upload falla: guardar igual el mensaje con `file_name` / `mime_type` y **sin** `file_url`. UI: tarjeta “archivo no disponible”.

Catchup de historial: si viene `documentMessage.fileName`, persistir ese nombre en metadata. No descargar media en catchup (suele estar vencida).

### Outgoing

Habilitar envío de documentos desde el inbox. Tipos:

- `application/pdf`
- `application/msword` / `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel` / `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Límite 16 MB. `validateOutgoingMedia` deja de rechazar `file` y el kind sale `'file'`. `/api/chat/upload` rutea `kind === 'file'` a `chat-files` y responde `fileType: 'file'`. El worker de envío WhatsApp ya soporta `document` + `fileName`.

### UI `FileAttachment`

Documento con `file_url`: tarjeta horizontal — icono por tipo (PDF rojo, Word azul, Excel verde, genérico gris), nombre truncado, tamaño (`1.2 MB`) y extensión. Clic abre Dialog. Botón de descarga aparte (same-origin via `/api/chat/media`).

Sin `file_url`: chip con icono y nombre (o “Documento” si tampoco hay nombre). Sin preview ni descarga.

Dialog:

- PDF → iframe same-origin a `/api/chat/media`. Si falla: “no se pudo previsualizar” + descargar.
- Imagen de documento (`jpeg`/`png`/`webp`) → visor igual al de fotos.
- Word/Excel → copy “no se puede previsualizar” + descargar.
- Escape y X cierran.

Imagen y audio: sin cambios.

## Errores

- Preview de link: timeout, HTML vacío, OG ausente, SSRF → sin tarjeta; el `<a>` queda.
- Miniatura rota → ocultar imagen.
- Documento incoming sin binario → mensaje + metadata de nombre; chip “archivo no disponible”.
- Upload outgoing > 16 MB o mime no listado → error en el input, no se envía.
- Auth: preview, proxy de imagen OG y media exigen sesión. Storage fuera de `chat-images` / `chat-audio` / `chat-files` → 400.

## Tests

Unitarios:

- Primera URL en texto (sola, con texto, varias, no-http).
- Parse OG de HTML de fixture (title, description, image, site_name; fallback `<title>`).
- SSRF: localhost, `10.x`, `file://`, redirect a IP privada.
- Mime → icono/extensión; caption vs placeholder cuando hay `file_name`.

API:

- `link-preview`: 401 sin sesión; 400 URL inválida; 200 cache hit; no sigue a IP privada.
- `media`: acepta `chat-files`, rechaza host ajeno.

UI:

- URL sola → tarjeta sin duplicar texto.
- URL + texto → ambos.
- Documento con `file_url` → tarjeta; sin URL → chip.
- Imagen/audio no regresionan.

Sin e2e de WhatsApp real.

## Archivos tocados (orientativo)

- `src/app/chat/components/MessageBubble.tsx`
- `src/app/chat/components/FileAttachment.tsx`
- `src/app/chat/components/LinkPreview.tsx` (nuevo)
- `src/app/api/chat/link-preview/route.ts` (nuevo)
- `src/app/api/chat/link-preview/image/route.ts` (nuevo)
- `src/app/api/chat/media/route.ts`
- `src/app/api/chat/upload/route.ts`
- `src/lib/whatsapp/incomingMedia.ts`
- `src/lib/chat/mediaLimits.ts`
- `src/app/servicios/messaging/whatsapp/modules/historyCatchup.ts`
- migración SQL: tabla `chat_link_previews` + nota de crear bucket `chat-files`
