# Mensajería WhatsApp en KloSync

Documento canónico. Actualizado: 21 agosto 2026.

Los docs viejos (`WHATSAPP_LITE_CONNECTION_FLOW.md`, `whatsapp-credentials-flow.md`, `BAILEYS_CREDENTIALS_SOLUTION.md`, `WHATSAPP-TROUBLESHOOTING.md`) describen una etapa anterior (Baileys adentro de Next.js). Este archivo es el que vale hoy.

---

## 1. Qué es y qué no es

KloSync conecta el **WhatsApp personal del celular** (como WhatsApp Web), no la API oficial de Meta Business.

- Librería: `baileys` 6.7.18
- El socket tiene que vivir 24/7. Vercel es serverless y se duerme: **Baileys corre en un worker en Railway**.
- La app en Vercel (`klosync.vercel.app`) solo orquesta UI, APIs y persistencia.
- Login: **NextAuth con Google**. El `session.user.id` es el Google ID numérico (`105103073145221460512`), no el UUID de Supabase. En `usuarios` ese Google ID está en `auth_id`; el UUID (`034ee30e-…`) es `usuarios.id`.

Cuenta de prueba actual: `evertotiado@gmail.com` / Google ID `105103073145221460512` / UUID `034ee30e-cb47-4346-8095-be96e4d87915` / teléfono `5491171277796`. El nombre “Emma” viene del perfil de WhatsApp, no de Gmail.

---

## 2. Piezas

```
Celular WhatsApp
       ▲
       │ WebSocket Baileys
       ▼
Railway worker  (worker/whatsapp.ts, puerto 8080)
       │  POST /api/integrations/incoming/whatsapp  (APP_URL + x-worker-secret)
       │  GET/POST /connect /status /send /disconnect /reset
       ▼
Vercel Next.js  (UI + /api/chat/* + /api/whatsapp)
       │
       ▼
Supabase
  whatsapp_lite_sessions     credenciales Baileys + status
  configuracion_mensajeria_usuario   si el usuario “tiene WhatsApp”
  conversaciones / mensajes_conversacion   inbox
```

Archivos que importan:

| Rol | Archivo |
|---|---|
| Worker HTTP + Socket.IO | `worker/whatsapp.ts` |
| Cliente Vercel → worker | `src/lib/whatsapp/workerClient.ts` |
| Baileys (singleton) | `src/app/servicios/messaging/whatsapp/WhatsAppLiteService.ts` |
| Socket WS vivo / 428 | `src/app/servicios/messaging/whatsapp/modules/socketHealth.ts` |
| Eventos Baileys | `…/modules/EventManager.ts` |
| Catch-up historial | `…/modules/historyCatchup.ts` |
| Credenciales BD | `…/modules/DatabaseManager.ts`, `AuthManager.ts` |
| API unificada | `src/app/api/whatsapp/route.ts` |
| Incoming | `src/app/api/integrations/incoming/whatsapp/route.ts` |
| Guardar inbox | `src/lib/chat/handleIncomingMessage.ts` |
| Enviar | `src/lib/chat/sendMessage.ts` |
| LID → teléfono | `src/lib/whatsapp/peerIdentity.ts` |
| Identidad de chat | `src/lib/chat/conversationIdentity.ts` |
| Realtime | `src/lib/chat/notifyInbox.ts`, `src/app/chat/hooks/useChat.tsx` |
| UI chat | `src/app/chat/page.tsx`, `ChatWindow.tsx`, `MessageBubble.tsx` |
| UI vincular | `src/app/configuracion/mensajeria/components/WhatsAppConnect.tsx` |

La única clase viva de Baileys es `WhatsAppLiteService`. No hay V2 ni Old.

---

## 3. Variables de entorno

### Vercel (app)

```
NEXTAUTH_URL=https://klosync.vercel.app
NEXTAUTH_SECRET=…
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
WHATSAPP_WORKER_URL=https://….up.railway.app
WORKER_SECRET=el mismo que Railway
USE_WHATSAPP_WORKER=true
```

Opcional para Socket.IO del browser al worker:

```
NEXT_PUBLIC_SOCKET_URL=https://….up.railway.app
NEXT_PUBLIC_WHATSAPP_WORKER_URL=https://….up.railway.app
```

### Railway (worker)

```
PORT=8080
WORKER_SECRET=el mismo que Vercel
APP_URL=https://klosync.vercel.app
NEXTAUTH_URL=https://klosync.vercel.app
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Sin `APP_URL` el worker recibe WhatsApp pero **no reenvía al inbox**.

Deploy: `git push` a `main`. Vercel y Railway toman el commit. No usar Vercel CLI para este repo.

---

## 4. Flujo de vínculo (QR)

1. UI llama `POST /api/whatsapp` `{ action: 'connect', type: 'lite' }`.
2. Vercel reenvía al worker `POST /connect` con `userId` = Google ID y `x-worker-secret`.
3. `WhatsAppLiteService.connect`:
   - Si el WebSocket está **abierto de verdad** (`isWaSocketOpen`), no pide QR.
   - Si no, carga credenciales de `whatsapp_lite_sessions` **y reutiliza el mismo `session_id`**.
   - Escribe `creds.json` en `/tmp/whatsapp_auth/<sessionId>`.
   - `makeWASocket` + listeners.
4. Si hay `me` en credenciales, Baileys intenta login. Si WhatsApp acepta → `connection: open`.
5. Si no hay sesión válida → evento `qr` → la UI muestra el QR → el usuario escanea en Dispositivos vinculados.
6. Tras el scan WhatsApp manda **515 restart required**. Es normal. Hay que **recrear el socket con las mismas credenciales del directorio temporal** (`preserve515`), no pedir QR de nuevo.
7. Al abrir: se guarda teléfono, `status=connected`, config de mensajería activa.

Códigos Baileys que importan:

| Código | Significado | Qué hacer |
|---|---|---|
| 515 | Restart required (post-QR) | Recrear socket, preservar temp dir |
| 428 | Connection Closed | Recrear socket, mismas creds |
| 408 | Lost / timeout | Igual, transitorio |
| 440 | Connection replaced | Reconectar (este worker es el dispositivo) |
| 401 / 403 / 411 / 500 | Logout / sesión muerta | Invalidar credenciales, pedir QR |

---

## 5. Flujo de mensaje entrante

```
Baileys messages.upsert
  → EventManager (omite fromMe, grupos, status)
  → resolveWhatsAppPeer (LID → teléfono si se puede, timeout 2.5s)
  → POST APP_URL/api/integrations/incoming/whatsapp
  → handleIncomingMessage
       busca conversación por teléfono, si no por remote_jid, si no por LID
       inserta mensajes_conversacion
       notifyInboxRealtime(googleId)
  → useChat refresh (broadcast + poll 3s)
  → ChatWindow muestra los mensajes del hook
```

El worker también emite Socket.IO `whatsapp-message` a `user-<googleId>`. Eso solo llega al browser si el cliente apunta al worker (`NEXT_PUBLIC_SOCKET_URL`). El poll cubre el caso en que no.

KloSync cerrado **no pierde** leads si el worker en Railway está conectado: el mensaje se persiste igual. Lo que sí se perdía era el hueco **mientras el socket de Baileys estaba caído** (deploy, 428, 515, celular sin red). Eso se cubre en el catch-up.

---

## 5.1 Catch-up al reconectar

`syncFullHistory` sigue en `false` (un full sync tira 515). Al volver `connection === 'open'`:

1. `shouldSyncHistoryMessage` acepta solo chunks de las **últimas 48 h**, o desde `lastDisconnectAt - 10 min`. Rechaza FULL / bootstrap.
2. Listener `messaging-history.set`: cada mensaje 1-1 (no grupos/`status`) pasa por el mismo POST incoming. Texto completo; imagen/audio del historial = placeholder (`[Imagen]` / `[Audio]`) + `wa_message_id`.
3. Backup: chats ya en BD (`metadata.remote_jid`) → `fetchMessageHistory` desde el último `fecha_mensaje`, tope 50 msgs/chat, pacing entre chats.

Dedupe: `mensajes_conversacion.wa_message_id` unique (where not null). Si el mismo mensaje llega live y por historial, el segundo se ignora. También hay un fallback por contenido + timestamp ±2 s (mensajes viejos sin `wa_message_id`).

No leídos: incoming suma `conversaciones.unread_count`. Al abrir el hilo, PATCH pone `unread_count = 0` y `last_read_at`. El sidebar muestra badge y negrita.

Cómo probar:

1. Worker conectado, KloSync cerrado: un mensaje de un contacto conocido → al abrir aparece y con badge.
2. Parar Railway 2–5 min, que escriban un contacto conocido y uno nuevo, levantar worker → ambos hilos en el inbox, sin duplicar si el mensaje también llegó live.
3. Reconectar no debe tirar 515 en bucle. Si pasa, el filtro de `shouldSyncHistoryMessage` hay que endurecerlo (solo post-`lastDisconnectAt`).

---

## 6. Flujo de mensaje saliente

```
ChatWindow (optimistic: el texto aparece ya, estado enviando)
  → POST /api/chat/send
  → sendMessage.ts
       JID = metadata.remote_jid || teléfono@s.whatsapp.net
       guarda el mensaje del inbox con estado_envio=enviando
       inserta fila queued en whatsapp_outbox (no habla con Baileys)
  → worker loop cada 2s: claim_whatsapp_outbox (FOR UPDATE SKIP LOCKED)
  → hasLiveSocket()? si el WS está cerrado: connect + wait + reintento
  → socket.sendMessage(jid, { text })
  → outbox sent + wa_message_id; inbox pasa a enviado
```

Si Railway está caído, el mensaje **queda en `queued`**. Cuando el worker vuelve, sale. No se pierde en el POST a Vercel.

Nunca mandar un LID como si fuera `@s.whatsapp.net`. El contacto puede ser `96147188244605@lid`; el JID de envío tiene que ser ese `remote_jid`, no un número inventado.

Media (imagen/audio):
- Buckets públicos `chat-images` (10 MB) y `chat-audio` (16 MB).
- El browser **no** sube con la anon key (NextAuth ≠ JWT de Supabase). POST `/api/chat/upload` con service role.
- El worker baja la URL pública y manda el buffer por Baileys (`image` / `audio` ptt).

---

## 7. Inbox / UI

- `useChat` es la fuente de mensajes en vivo.
- `ChatWindow` **tiene que recibir `mensajes` del hook**. Si carga los suyos, el live no se ve hasta F5 (bug que ya pasó).
- Envío optimistic: el mensaje propio se pinta al toque; no bloquear el input.
- Tilde: `enviando` = spinner; al persistir, `estado_envio: enviado` = un check. Sin estado en un mensaje propio **no** es pendiente (el reloj era un bug).
- Sidebar y header: `conversationDisplayName` (nombre de agenda/pushName) o teléfono real. Nunca el LID.
- Lista: agrupar por teléfono real (`conversationIdentityKey`). Un LID no es un teléfono: no fusionar dos LID distintos hasta tener `phone_number` de 8–15 dígitos distinto del LID.

`isOwn` en la burbuja: `usuario_id` o `metadata.direction === 'outgoing'` o id `temp-*`.

---

## 8. Realtime: por qué no es `postgres_changes`

El login es NextAuth, no JWT de Supabase. El cliente browser usa la **anon key**. Las tablas `conversaciones` / `mensajes_conversacion` están en la publication realtime, pero RLS + `auth.uid()` no coinciden con NextAuth → `CHANNEL_ERROR`.

Por eso el live va por:

1. **Broadcast** canal `inbox:<googleId>`, evento `new_message` (`notifyInbox.ts`).
2. **Poll cada 3s** de `/api/chat/conversaciones` y `/api/chat/mensajes` con `Cache-Control: no-store`.
3. Socket.IO al worker, si está configurado.

No volver a enganchar `postgres_changes` hasta migrar a Supabase Auth.

---

## 9. Errores que ya tuvimos y la regla para no repetirlos

### 9.1 Socket muerto con `user` todavía poblado (428)

**Síntoma:** `Error enviando mensaje: Connection Closed`, Boom 428, stack en `getUSyncDevices` / `sendMessage`. El status decía conectado.

**Causa:** Baileys deja `socket.user` después de `connection: close`. El código tomaba `user.id` como “está vivo”. El EventManager solo reconectaba en 515; el 428 se logueaba y nada más. Diez minutos después se seguía enviando por el WS cerrado.

**Regla:** `isWaSocketOpen(socket)` (readyState === 1 o `ws.isOpen`). Sin WS abierto, `isConnected = false`. En todo `connection === 'close'` transitorio (428/408/440/515) recrear socket. Si el send falla por Connection Closed: connect + wait + un reintento.

### 9.2 Cada arranque del worker inventaba un `session_id`

**Síntoma:** credenciales en `6c8279e4-…`, el proceso nuevo usaba `f0e43436-…`, fila sin `baileys_credentials`, teléfono `null`, `disconnected`.

**Causa:** `connect()` hacía `sessionId = state.sessionId || uuidv4()` y `saveConnectionState` hacía upsert de esa fila nueva.

**Regla:** reutilizar el `session_id` de la fila que tiene credenciales. Una desconexión **actualiza** esa fila; nunca crea una fila vacía.

### 9.3 `registered: false` y 401 al restaurar

**Síntoma:** restore carga `me` + `registered: false`, WhatsApp cierra permanente.

**Causa:** el emparejamiento no terminó del lado de WhatsApp, o el teléfono desvinculó el dispositivo. Reintentar esas credenciales en cada deploy entra en bucle.

**Regla:** 401/403/411/500 → `invalidateSessionCredentials` (creds a null). El próximo connect pide QR.

### 9.4 Desconectar no desvinculaba

**Síntoma:** en la web “reconectar” no mostraba QR; se pegaba a la sesión anterior. Tampoco se podía borrar la conexión.

**Causa:** `disconnect()` solo limpiaba memoria. Las credenciales seguían en BD. Además `handleDisconnect` llamaba `onConnected({ status: 'disconnected' })` y `handlePlatformConnected` **reactivaba** la config como connected.

**Regla:** desconectar = `resetSession`: borrar filas de sesión del usuario, borrar `/tmp/whatsapp_auth`, marcar config inactiva. `onConnected` ignora `status: disconnected` y borra configs. “Vincular de nuevo” hace reset + connect.

### 9.5 LID vs teléfono

**Síntoma:** chats `96147188244605` y `205613590122651`; envíos a un `@s.whatsapp.net` inventado; mensajes no llegaban al contacto.

**Causa:** WhatsApp multi-device identifica contactos con `@lid`. `205613590122651` es el LID **propio** (`me.lid`). Guardar el LID como `phone_number` es mentira.

**Regla:** guardar `remote_jid` real. Enviar a ese JID. `phone_number` solo si es un teléfono resuelto, distinto del LID. El título del chat es `contact_name` (agenda de WhatsApp o pushName) o el teléfono formateado. Si solo hay LID, mostrar “Contacto WhatsApp”, no el id numérico. El nombre a veces llega en el mensaje y no en `conversaciones.metadata`: el GET de conversaciones lo copia del último mensaje con `contact_name`.

### 9.11 Tilde de pendiente en mensajes ya enviados

**Síntoma:** el texto salía al toque, WhatsApp lo entregaba, pero en KloSync quedaba el reloj de pendiente.

**Causa:** `MessageStatus` trataba `estado_envio` vacío como pendiente. `saveOutgoingMessage` no guardaba `estado_envio`. Al llegar el mensaje real desde la BD, reemplazaba el optimistic (que sí decía `enviado`) y volvía el reloj.

**Regla:** persistir `estado_envio: enviado`. En la UI, mensaje propio sin estado = enviado (un check). Reloj/spinner solo con `enviando`.

### 9.6 Chat en vivo no se actualizaba (hacía falta F5)

**Síntoma:** el mensaje entraba a la BD, el envío andaba, el hilo abierto no cambiaba hasta recargar.

**Causa:** `useChat` refrescaba `mensajes`; `ChatWindow` tenía **otro** `useState` y solo fetch al seleccionar conversación. El poll del hook no pintaba nada.

**Regla:** `ChatWindow` recibe `mensajes` de `useChat`. Poll silencioso. GET de conversaciones/mensajes con `no-store`.

### 9.7 Realtime `postgres_changes` + NextAuth

**Síntoma:** `CHANNEL_ERROR` en el cliente.

**Causa:** anon key + RLS con `auth.uid()`. NextAuth no es sesión de Supabase.

**Regla:** Broadcast `inbox:<googleId>` + poll. No `postgres_changes` hasta Auth de Supabase.

### 9.8 “Ya conectado” mentiroso (status desde BD)

**Síntoma:** UI verde, send 428.

**Causa:** `/status` devolvía `connected: true` si la BD decía connected o si había `phoneNumber`, aunque el WS estuviera muerto.

**Regla:** `connected` = `hasLiveSocket()`. La BD solo aporta el teléfono como pista, no el flag live.

### 9.9 Logout del menú no hacía nada

**Causa:** `DropdownMenuItem onClick` + Radix se come el click al cerrar el menú.

**Regla:** `onSelect` + `signOut` + `window.location.assign('/')`.

### 9.10 Usuario “Emma” vs `evertotiado@gmail.com`

**Causa:** `resolveOrCreateUsuarioId` creaba `usuarios` con email `auth-<googleId>@klosync.user` y el nombre de WhatsApp.

**Regla:** al crear/actualizar usuario, usar `session.user.email` y `session.user.name` de Google. Es la misma cuenta.

---

## 10. Cómo desvincular y volver a escanear

1. Mensajería → **Desvincular WhatsApp** (eso pega `/disconnect` → `resetSession`).
2. Esperar redeploy del worker si acabás de pushear.
3. **Vincular de nuevo (QR)** y escanear en el celular.
4. Si el QR no sale: el worker viejo todavía tiene el socket en memoria. Reiniciar el servicio en Railway.

SQL de emergencia (proyecto Supabase klosync):

```sql
delete from whatsapp_lite_sessions;
update configuracion_mensajeria_usuario
set activa = false,
    configuracion = (configuracion - 'phone_number' - 'session_id')
      || jsonb_build_object('status','disconnected','estado_conexion','disconnected')
where plataforma = 'whatsapp';
```

---

## 11. Checklist si “no anda”

1. Railway: ¿el worker está up? ¿`WhatsApp worker listening`?
2. Tras QR: ¿aparece `Conexión abierta` o un código 401/428/515?
3. Incoming: ¿`APP_URL` apunta a klosync.vercel.app? ¿el POST incoming da 200?
4. Send: ¿el log es 428? → WS muerto, no “número mal”.
5. Chat sin live: ¿`ChatWindow` recibe `mensajes` del hook? ¿el poll pega `/api/chat/mensajes`?
6. Dos chats raros: ¿son dos LID? No fusionar hasta tener teléfono.
7. Status verde mentiroso: ¿`hasLiveSocket` o solo BD?
8. Mensaje durante un deploy/caída del worker: ¿apareció al reconectar? ¿`wa_message_id` en el row? ¿badge de no leído?

No borrar credenciales en un close 428. Sí borrarlas en 401. No generar `session_id` nuevo si ya hay una fila con `baileys_credentials`.
