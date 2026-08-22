# Diseño: central de mensajes, canales, widget y chatbot

Fecha: 2026-08-20. Orden corregido: **mensajería interna → canales → widget → chatbot**.

## Qué es el producto

KloSync es una **central de mensajes + embudo**: entra un mensaje, se responde o se clasifica en el Kanban, queda el registro y salen estadísticas.

No es sync de catálogo. WhatsApp es el canal diario. Instagram, Mercado Libre y el widget son **más puertas al mismo inbox**, no productos aparte que se venden antes de que el inbox funcione.

## Orden (esto manda)

1. **Mensajería interna.** El inbox no miente. Chat ↔ Kanban. Contacto único. Historial. Stats básicas. Hoy: Fases 0–3 de `docs/ORDEN-ACTUAL-PRODUCTO.md`.
2. **Sumar canales** al mismo modelo (`handleIncomingMessage` + `sendMessage`). Primero Instagram, después Mercado Libre (preguntas, luego post-venta).
3. **Widget** en la web del comerciante. Es un canal más, con snippet propio. Recién cuando el inbox ya atiende varios `servicio_origen` de verdad.
4. **Chatbot** semi-automático (reglas: horario, menú, FAQ, handoff). Un motor para todos los canales. La IA es opt-in, después.

No se construye el widget “en paralelo para vender antes”. No se enciende el bot sobre un WhatsApp que pierde envíos.

## Arquitectura (cuando toque cada capa)

```
Visitante / comprador
  WhatsApp | Instagram | ML | Widget web
                    ↓
            Adaptador de canal
            (normaliza a IncomingMessageData)
                    ↓
            [más adelante] Motor de bot
                    ↓
            Inbox + Kanban + ficha + estadísticas
```

Hoy ya existe el cuello: `handleIncomingMessage` + `PlataformaMensajeria` (`whatsapp | telegram | email`). Cada canal nuevo es extender el union, un adaptador de entrada y uno de salida. El bot no vive dentro de un canal: mira el mensaje normalizado.

Hasta que la mensajería interna no esté sólida, **no se extiende el union**. Se arregla el camino caliente de WhatsApp.

## 1. Mensajería interna (ahora)

Hecho de verdad, no teatro:

- Loop Chat ↔ Kanban en prod (drag crea lead, ida y vuelta, nombres reales).
- Outbox + reintento; ticks enviado / entregado / leído / error.
- Media entrante persistida.
- Ficha de **contacto** (un humano ≠ un LID).
- Respuestas rápidas *(hecho)*. Búsqueda en historial *(pendiente)*. Catálogo comercial en `/catalogo` *(hecho; no estaba en este spec)*.
- Stats mínimas **antes** de canales extra: conversaciones nuevas, no respondidas, tiempo a primera respuesta, conversión por etapa.

Detalle de tareas: Fases 0–3 de `ORDEN-ACTUAL-PRODUCTO.md` y el plan de confiabilidad.

Sin esto, Instagram y ML solo multiplican el mismo bug.

## 2. Canales (después del inbox)

Mismo chat, mismo Kanban, badge de canal.

**Instagram.** Cuenta profesional, webhooks Meta, ventana de 24 h. Entra como `platform: 'instagram'`.

**Mercado Libre.** Dos hilos, no uno:

- Preguntas de la publicación (API questions).
- Mensajería post-venta (`/messages/packs/...`). El comprador inicia; hay motivos y bloqueos.

El UI tiene que mostrar “no se puede responder” cuando ML bloquea. No se trata como un WhatsApp.

Email completo, Telegram de ida, Cloud API oficial de WhatsApp: más atrás (equipo / cuando Lite no alcance).

Eventos de Tiendanube (pedido, carrito abandonado) no son un canal de chat: son tarjetas de Kanban. Fuera de esta línea hasta que el inbox omnicanal exista.

## 3. Widget (después de canales)

Snippet + iframe (`data-site-id`), burbuja en la web, conversación `servicio_origen: 'web'` en el mismo inbox.

Se hace tarde a propósito: el comerciante pega un script y espera que responder desde KloSync sea **igual** que un IG o un WA. Si eso todavía no es cierto para dos canales, el widget enseña la mentira más rápido.

Instalación en Tiendanube / Shopify / custom = el snippet en el theme. No hace falta su API de productos.

Identidad: visitante anónimo (`klosync_vid`); teléfono/email opcional; fusión con contacto WhatsApp solo cuando haya número.

## 4. Chatbot (al final de esta línea)

Flujo de reglas, no agente autónomo. El humano siempre puede tomar el hilo (y el bot se calla).

MVP: bienvenida, fuera de horario, menú, FAQ por palabras, captura de teléfono, handoff. Mensajes con `metadata.sent_by = 'bot'`.

Un canal puede tener el bot apagado (ML post-venta: default humano).

IA (FAQ del comerciante o borrador en el inbox): después del bot de reglas, opt-in. Nunca stock/precio inventado.

## Empaquetado (cuando haya algo que vender)

Un producto, un inbox. El widget puede ser un add-on **después**, no la cuña que se lanza con el CRM roto.

KloSync Chat como sku separado queda en el freezer hasta que Inbox (WA + al menos un canal más) se use una semana seguida.

## Fuera de alcance

- Sync de catálogo / stock.
- Scraping de la web del comerciante.
- Multiagente, broadcast, cobro en el chat.
- Tres bases de datos / tres apps.
- Construir widget o bot para “parecer Kommo” antes de Fases 0–3.

## Cómo se prueba, por etapa

- Interna: celular real, worker caído 2–5 min, el envío no se pierde, el chat aparece en el Kanban, la ficha es una sola.
- Canales: un hilo de prueba IG y uno ML, mismo inbox, mismo drag a columna.
- Widget: HTML local con el snippet → aparece en `/chat` → la respuesta del comerciante llega al iframe.
- Bot: fuera de horario responde el texto configurado; “hablar con alguien” deja el hilo al humano.

## Riesgos

- Sumar IG/ML sobre Baileys inestable: se ve “omnicanal” y se pierde el mensaje igual.
- Widget antes de canales: se gasta diseño de embed sin haber probado que el inbox es agnóstico de plataforma.
- Bot antes de ficha de contacto: el menú captura un teléfono que no se guarda en ningún humano.
