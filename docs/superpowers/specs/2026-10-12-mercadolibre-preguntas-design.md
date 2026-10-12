# Diseño: preguntas de Mercado Libre en el inbox

Fecha: 2026-10-12. Fase 5 de [`ORDEN-ACTUAL-PRODUCTO.md`](../../ORDEN-ACTUAL-PRODUCTO.md).

## Qué es

Las preguntas que dejan los compradores en las publicaciones del vendedor entran al `/chat` como una conversación más, con badge amarillo de Mercado Libre. El vendedor las responde desde KloSync y la respuesta queda publicada en la publicación. La conversación se puede arrastrar al Kanban como cualquier otra.

La mensajería post-venta (después de una compra) queda para un segundo corte.

## Modelo

| Concepto de ML | En KloSync |
|---|---|
| Comprador + publicación | Una conversación (`remitente = ml_<comprador>_<publicación>`). Un comprador que pregunta en dos publicaciones son dos oportunidades distintas. |
| Pregunta | Mensaje entrante (`wa_message_id = ml_q_<id>`). |
| Respuesta | Mensaje saliente (`wa_message_id = ml_a_<id de la pregunta>`). |
| Nombre del contacto | `apodo · título de la publicación`. |

## Piezas

| Pieza | Dónde |
|---|---|
| Conectar (OAuth) | `/api/integrations/mercadolibre/connect` → auth de ML → `/api/integrations/mercadolibre/callback`. Solo admin. Una cuenta de vendedor por organización. |
| Conexión guardada | `configuracion_mensajeria_usuario` con `plataforma = 'mercadolibre'`: `ml_user_id`, `nickname`, `site_id`, `access_token`, `refresh_token`, `token_expires_at`. |
| Token | El access token dura 6 h. Se renueva antes de usarlo si vence en menos de 10 minutos. El refresh token es de un solo uso: se guarda el nuevo cada vez. |
| Notificaciones | `/api/integrations/incoming/mercadolibre`, tópico `questions`. ML no firma: se valida que `application_id` sea el de nuestra app y que el vendedor esté conectado, y después se lee la pregunta con el token del vendedor (la fuente de verdad es la API, no el aviso). Se responde 200 enseguida y se procesa con `waitUntil`, porque ML exige respuesta en menos de 500 ms. |
| Respuesta | `sendMessage` caso `mercadolibre`: contesta la pregunta sin responder más vieja de la conversación (`POST /answers`). Si no hay ninguna, avisa que ML solo deja responder preguntas. Solo texto, hasta 2000 caracteres. |
| Respuestas desde ML | Si el vendedor responde desde la web de ML, llega otra notificación de la misma pregunta con la respuesta y se guarda como saliente (una sola vez). |

## Variables de entorno

- `MERCADOLIBRE_APP_ID`
- `MERCADOLIBRE_CLIENT_SECRET`
- `MERCADOLIBRE_AUTH_DOMAIN` (opcional, por defecto `auth.mercadolibre.com.ar`)

En la app de ML (developers.mercadolibre.com.ar): redirect URI `${NEXTAUTH_URL}/api/integrations/mercadolibre/callback`, URL de notificaciones `${NEXTAUTH_URL}/api/integrations/incoming/mercadolibre`, tópico **Questions**, y el scope `offline_access` para tener refresh token.

## Fuera de alcance (este corte)

- Mensajería post-venta (`/messages/packs`).
- Borrar preguntas o bloquear compradores.
- Ver stock/precio de la publicación en el chat.
- Varias cuentas de ML por organización.

## Cómo se prueba

1. Conectar la cuenta de vendedor desde `/configuracion/mensajeria`.
2. Desde otra cuenta de ML (o un usuario de test), preguntar en una publicación activa → aparece en `/chat` con el título de la publicación.
3. Responder desde KloSync → la respuesta se ve en la publicación.
4. Responder otra pregunta desde la web de ML → aparece una sola vez en KloSync.
