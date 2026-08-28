# Recordatorio de seguimiento (alerta interna)

Fecha: 24 agosto 2026. Fase 3 — alerta interna para no perder hilos de venta.

**Por qué:** el dolor #1 del dueño solo es olvidar a quién le debe respuesta. No es chatbot, no dispara mensajes al cliente — es una señal visual en el inbox.

**Dependencias:** contactos/leads + timestamps de `mensajes_conversacion` + etapa del lead. No requiere catálogo, carrito ni canales nuevos. Se puede hacer en paralelo con el resto de Fase 3.

**Relación con lo existente:**

| Pieza | Hoy | Este spec |
|---|---|---|
| `inboxStats.countNoRespondidas` | Cuenta hilos cuyo **último mensaje es entrante** (sin umbral de tiempo) | Métrica distinta: **esperando seguimiento** = entrante + pasaron ≥ X hs |
| `PriorityConversationsService.getFollowUpConversations` | Dashboard legacy, query frágil, 24 h fijo | Reutilizar **idea**, implementar en inbox con reglas claras y helper puro testeable |
| Badge no leído en `ChatSidebar` | `unread_count` / peso de fuente | Nuevo estado visual **independiente** (color/borde distinto) |

---

## 1. Regla de negocio

Una conversación está en **“esperando tu respuesta hace tiempo”** cuando **todas** se cumplen:

1. **Último mensaje entrante:** el último mensaje del hilo es del cliente (misma regla que `isConversationUnanswered` en `src/lib/crm/inboxStats.ts`: no `usuario_id`, no `metadata.fromMe`).
2. **Umbral de tiempo:** desde `fecha_mensaje` de ese último entrante pasaron ≥ **X** (configurable por usuario; ver defaults abajo).
3. **Lead activo:** si hay `lead_id`, la etapa **no** es terminal (`Ganado` / `Perdido` — `isEstadoTerminal` en `src/lib/contactos/estadoLead.ts`). Sin lead → aplica igual (chat sin Kanban aún cuenta).
4. **Limpieza automática:** el vendedor envía un mensaje saliente → deja de aplicar al instante (recalcular en próximo fetch; no tabla de “alertas descartadas”).

**No dispara** si el último mensaje es saliente, aunque antes hubiera entrantes sin contestar.

### Defaults de X (v1)

Config por usuario en `usuarios.metadata` o tabla chica `inbox_seguimiento_config` (elegir lo más simple al implementar):

| Contexto | Default X | Notas |
|---|---|---|
| Lead en **Nuevo** o **Contactado** | 12 h | Etapas tempranas: venta se pierde rápido |
| Lead en etapas intermedias (Calificado, Propuesta, …) | 24 h | |
| Sin lead (chat aún no arrastrado al Kanban) | 24 h | Mismo que intermedio |
| Lead **Ganado** / **Perdido** | — | Nunca marca |

Futuro (fuera v1): override por etapa en UI de configuración.

---

## 2. Dónde se ve (UI existente, sin pantallas nuevas)

### Inbox `/chat` — lista de conversaciones (`ChatSidebar`)

- Indicador en la fila: borde izquierdo ámbar/naranja **o** punto/chip “Seguimiento” (distinto del verde de no leído).
- Tooltip: “Esperando tu respuesta hace {humanize}”.
- **Opcional v1:** ordenar la lista poniendo primero las marcadas, luego por `fecha_mensaje` desc (mismo criterio que urgencia).

### Stats — panel compacto del CRM / inbox

- Nuevo contador junto a “Sin resp.”: **“Seguimiento: N”** (solo conversaciones que cumplen la regla con umbral).
- Definición en tooltip distinta de “no respondidas”: esta métrica **exige tiempo**; “sin resp.” es instantáneo.

### Kanban (v1 — 27 ago 2026)

- [x] Borde/chip seguimiento en tarjeta del lead si la conversación vinculada está en seguimiento.
- [x] Filtro “Solo seguimiento” en tablero.
- [x] Marcar atendido desde card (chip o ✓) → `dismiss-seguimiento`.
- [x] Timeline de etapas solo en drawer/modal (K5), no chip en card.

---

## 3. Implementación técnica

### Helper puro (obligatorio + tests)

Nuevo módulo p. ej. `src/lib/crm/seguimientoInbox.ts`:

```ts
type SeguimientoInput = {
  mensajes: MessageDirectionInput[]; // reutilizar tipos de inboxStats
  leadEtapaNombre?: string | null;
  nowMs?: number;
  config: SeguimientoConfig;
};

// isEsperandoSeguimiento(input) → boolean
// hoursSinceLastIncoming(input) → number | null
// countEsperandoSeguimiento(conversaciones[], config) → number
// sortConversacionesConSeguimiento(...) → orden opcional
```

Tests en `src/lib/crm/__tests__/seguimientoInbox.test.ts`:

- Entrante hace 25 h, lead Nuevo → **sí**
- Entrante hace 25 h, lead Ganado → **no**
- Entrante hace 2 h → **no** (aunque “sin respuesta” instantáneo sí)
- Último saliente después del entrante → **no**
- Sin mensajes → **no**

### Server-side (persistencia al recargar)

- **No** depender del socket ni de estado React solo.
- Enriquecer respuesta de listado de conversaciones (API que ya alimenta `/chat` y/o `/api/crm/stats`) con:
  - `esperando_seguimiento: boolean`
  - `seguimiento_desde?: string` (ISO del último entrante)
  - `seguimiento_horas?: number`
- Cálculo en servidor a partir de mensajes ya guardados (último N mensajes o subquery “último por conversación” — preferir lo que ya use stats para no duplicar queries pesadas).

### Config

- GET/PATCH mínimo: `horas_default`, `horas_etapas_tempranas` (opcional).
- Si no hay config → usar defaults de la tabla §1.

---

## 4. Qué NO hace (límite con Fase 7)

- No envía WhatsApp / email / push al cliente.
- No mensajes automáticos, bienvenida ni fuera de horario.
- No IA ni reglas “si no responde en X días, mandar recordatorio”.
- No crea filas en `tasks` del dashboard legacy (salvo que más adelante se unifique a propósito).

Es condición: **timestamp + dirección del último mensaje + etapa del lead**.

---

## 5. Criterios de aceptación (prod + celular real)

1. Cliente escribe → vendedor no contesta → tras X horas la conversación se ve **distinta** en el inbox (badge/borde).
2. Vendedor contesta desde el chat → la marca **desaparece sola** sin “descartar”.
3. Lead en **Ganado** o **Perdido** con entrante viejo sin responder → **no** se marca.
4. Recargar `/chat` o reabrir pestaña → el estado **persiste** (viene del API, no solo memoria local).
5. Contador “Seguimiento: N” coincide con conversaciones marcadas en la lista.
6. “Sin resp.” (instantáneo) ≥ “Seguimiento” (con umbral); no son el mismo número salvo edge cases.

---

## 6. Orden sugerido de implementación

1. Helper + tests (`seguimientoInbox.ts`).
2. Extender API de conversaciones / stats con flags calculados.
3. UI `ChatSidebar` (indicador visual).
4. Contador en `InboxStatsPanel` (CRM) o header del chat.
5. (Opcional) sort por urgencia en lista.
6. (Opcional) PATCH config de horas.

Estimación: **1–2 días** si se reutiliza la query de mensajes de stats; más si hay que optimizar carga del inbox.

---

## 7. Fuera de alcance v1

- Notificaciones push / email al vendedor.
- Snooze “recordarme mañana”.
- Múltiples umbrales por etiqueta de contacto.
- Integración con `TasksService` / dashboard antiguo.
