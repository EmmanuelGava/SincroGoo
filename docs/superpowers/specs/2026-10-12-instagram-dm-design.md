# Diseño: Instagram DM en el inbox

Fecha: 2026-10-12. Fase 5 de [`ORDEN-ACTUAL-PRODUCTO.md`](../../ORDEN-ACTUAL-PRODUCTO.md).

## Qué es

Los DMs de la cuenta profesional de Instagram del negocio entran al mismo `/chat` y al mismo Kanban que WhatsApp. Mismo `handleIncomingMessage`, mismo `sendMessage`, badge de canal. No es un producto aparte.

## API elegida

**Instagram API con Instagram Login** (graph.instagram.com). No exige página de Facebook vinculada: el admin conecta la cuenta profesional con un botón.

Permisos: `instagram_business_basic`, `instagram_business_manage_messages`.

Hasta que Meta apruebe la app (App Review + verificación del negocio), solo funcionan las cuentas que tienen un rol en la app de Meta. Para QA alcanza con agregar la cuenta propia como tester.

## Piezas

| Pieza | Dónde |
|---|---|
| Conectar (OAuth) | `/api/integrations/instagram/connect` → instagram.com → `/api/integrations/instagram/callback`. Solo admin. Cambia el token corto por uno largo (60 días) y suscribe la cuenta al webhook `messages`. |
| Conexión guardada | `configuracion_mensajeria_usuario` con `plataforma = 'instagram'`: `ig_user_id`, `username`, `access_token`, `token_expires_at`. Una cuenta por organización. |
| Webhook | `/api/integrations/incoming/instagram`. GET verifica `hub.challenge`. POST valida `X-Hub-Signature-256` con el app secret, busca la conexión por `entry.id` y llama a `handleIncomingMessage` con `platform: 'instagram'`. |
| Envío | `sendMessage` caso `instagram`: POST `/{ig_user_id}/messages` con texto o adjunto por URL. |
| Ventana de 24 h | Instagram solo deja responder dentro de las 24 h desde el último mensaje del cliente. Pasado eso, el envío falla con un mensaje claro y el chat muestra un aviso. |
| Media entrante | Las URLs de Meta vencen: se bajan y se suben a Storage como la media de WhatsApp. |
| Ecos | Lo que se responde desde la app de Instagram entra como saliente. Lo que se envió desde KloSync se deduplica por id (`wa_message_id = ig_<mid>`). |
| Identidad | `remitente = ig_<IGSID>` (no parece un teléfono). Nombre y @usuario se piden a la API de perfil y se guardan en la conversación. |
| Token | Se renueva solo antes de vencer, al enviar o al recibir. |

## Variables de entorno

- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`

La redirect URI es `${NEXTAUTH_URL}/api/integrations/instagram/callback` y tiene que estar cargada en la app de Meta.

## Fuera de alcance (v1)

- Etiqueta `HUMAN_AGENT` (7 días): requiere aprobación aparte de Meta.
- Comentarios de publicaciones, menciones en historias como hilo propio, reacciones, “visto”.
- Facebook Messenger.
- Unir el contacto de Instagram con el de WhatsApp de la misma persona (no hay teléfono).

## Cómo se prueba

1. App de Meta con el producto Instagram, cuenta propia como tester, webhook apuntando a prod.
2. Conectar desde `/configuracion/mensajeria`.
3. Escribir un DM desde otra cuenta → aparece en `/chat` con badge de Instagram y se puede arrastrar al Kanban.
4. Responder desde KloSync → llega al DM. Responder desde la app de Instagram → aparece una sola vez como saliente.
5. Foto entrante → se ve en el chat y sigue abriendo al día siguiente.
