# Chat: eco rápido, fromMe y avisos simples

Fecha: 2026-08-20. Sin Firebase / FCM.

## Objetivo

1. El mensaje escrito en KloSync se ve en el hilo al instante (no esperar a Railway).
2. Lo enviado desde el celular vinculado aparece en el chat como saliente.
3. Aviso del navegador + sonido al recibir, con opt-out de sonido. Sin push si la app está cerrada.

## Flujo

- Envío KloSync: persistir saliente + broadcast inbox → UI (burbuja optimista + poll/broadcast) → después Baileys. Si falla, marcar error.
- Celular (`fromMe`): mismo POST incoming con `fromMe: true`. No suma no leídos. No dispara aviso. Dedupe por `wa_message_id` o contenido±2s.
- Aviso: solo `direction=incoming` y si la pestaña está oculta o el chat activo es otro. Sonido por defecto; mute en el sidebar (`localStorage`). Popup vía Notification API. FCM queda fuera.
