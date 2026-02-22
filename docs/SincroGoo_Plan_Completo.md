# SincroGoo — Plan Completo de Producto, Técnico y Marketing

> Documento estratégico para pasar de proyecto en desarrollo a SaaS con ingresos recurrentes en dólares.

---

## 1. Visión del producto

**SincroGoo** es una plataforma de productividad global orientada a vendedores, consultores y equipos comerciales que necesitan dos cosas en un solo lugar:

- **Sincronización inteligente** entre Google Sheets, Slides, Excel y Word — eliminando el copy-paste manual de datos en presentaciones y documentos.
- **CRM + mensajería unificada** — gestión de leads con Kanban y comunicación por WhatsApp, Telegram y email desde una sola interfaz.

**Propuesta de valor en una oración:**
> *"Actualizá tus presentaciones de ventas automáticamente y gestioná tus leads desde un solo lugar."*

---

## 2. Mercado y posicionamiento

### El gap de mercado
| Segmento | Producto | Precio | Problema |
|---|---|---|---|
| Enterprise | Rollstack | $500+/mes | Inaccesible para individuos y pymes |
| Add-on básico | Slides Creator | Gratis | Sin CRM, sin bidireccionalidad, sin mensajería |
| **El medio** | **SincroGoo** | **$15–29/mes** | **Nadie lo está ocupando** |

### Cliente ideal
Vendedor independiente, consultor, agencia pequeña o equipo comercial de hasta 10 personas que:
- Arma presentaciones con datos de Sheets semanalmente
- Gestiona leads por WhatsApp o Telegram
- Paga herramientas en dólares online sin problema

### Enfoque geográfico
**Global desde el día uno, en inglés.** El mercado hispanohablante es pequeño para este tipo de herramienta. El 80% de los usuarios que pagan $15–29 USD/mes por productividad están en EEUU, Europa occidental, Australia y Canadá.

---

## 3. Planes y pricing

| | **Free** | **Pro** | **Business** |
|---|---|---|---|
| **Precio** | $0 | $19 USD/mes | $39 USD/mes |
| **Proyectos Sheets/Slides** | 3 | Ilimitados | Ilimitados |
| **Sincronizaciones/mes** | 50 | Ilimitadas | Ilimitadas |
| **CRM Kanban** | Solo lectura | Completo | Completo |
| **WhatsApp (Lite)** | ✗ | ✓ | ✓ |
| **Telegram** | ✓ (limitado) | ✓ | ✓ |
| **Email** | ✗ | ✗ | ✓ |
| **Usuarios del equipo** | 1 | 1 | Hasta 5 |
| **Soporte** | Comunidad | Email 48hs | Email 24hs |

**Lógica de upsell:** Free engancha por las sincronizaciones → Pro convierte cuando el usuario alcanza el límite de proyectos o quiere WhatsApp → Business para equipos pequeños.

---

## 4. Plan técnico — Prioridades

### FASE 0 — Bloqueantes antes de lanzar (3–5 días)
Estas tareas son bloqueantes. Sin resolverlas no se puede lanzar ni cobrar.

**4.0.1 — Comprar dominio propio**
`sincrogoo.vercel.app` no genera confianza para cobrar. Ningún usuario da la tarjeta en un subdominio de Vercel.
- Registrar `sincrogoo.com` (prioridad) o `sincrogoo.app` / `getsincrogoo.com`
- Dónde comprar: **Namecheap** (~$10–12 USD/año) o **Porkbun** (~$9 USD/año)
- Conectar dominio custom en Vercel (10 minutos, gratis)
- ⚠️ Sin dominio propio no se lanza a Product Hunt

**4.0.2 — Mover servidor WhatsApp (Baileys) a Railway o Render**
`server.js` con Socket.IO no es compatible con Vercel serverless. Si hoy está deployado en Vercel, WhatsApp está roto en producción. Esto hay que resolverlo antes de cobrar por esa feature.
- Crear servicio separado en **Railway** (~$5–15 USD/mes)
- Apuntar las variables de entorno al nuevo servidor
- Verificar que reconexión y QR funcionan en el nuevo entorno

**4.0.3 — Cerrar vulnerabilidad en `/api/supabase/projects`**
El endpoint confía en el `usuario_id` enviado por el cliente sin validar la sesión. Un usuario autenticado podría acceder a proyectos de otro usuario.
- Agregar `getServerSession(authOptions)` al inicio del handler
- Validar que `session.user.id === usuario_id` recibido
- Mismo fix en `/api/supabase/users/verify`

**4.0.4 — Activar RLS en Supabase para tabla `proyectos`**
Agregar política RLS: `auth.uid() = usuario_id` para SELECT, INSERT, UPDATE, DELETE.

---

### FASE 1 — Monetización mínima (1–2 semanas)

**4.1.1 — Página `/precios`**
- 3 columnas: Free, Pro, Business
- Botón "Empezar gratis" (Free) y "Suscribirse" (Pro/Business)
- Destacar Pro como "Recomendado"
- Integrar con Lemon Squeezy (más rápido que Stripe, acepta pagos de LATAM, no requiere empresa constituida)

**4.1.2 — Tabla `subscriptions` en Supabase**
```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id),
  plan text default 'free', -- 'free' | 'pro' | 'business'
  estado text default 'active', -- 'active' | 'cancelled' | 'past_due'
  lemon_squeezy_id text,
  current_period_end timestamp,
  created_at timestamp default now()
);
```

**4.1.3 — Helper `getCurrentUserWithPlan()`**
Función central que todas las APIs usan:
```typescript
async function getCurrentUserWithPlan(session) {
  const user = await supabase
    .from('usuarios')
    .select('*, subscriptions(*)')
    .eq('auth_id', session.user.id)
    .single();
  return user;
}
```

**4.1.4 — Límites por plan**
- Al crear proyecto: verificar COUNT de proyectos actuales vs límite del plan
- Al sincronizar: verificar contador mensual vs límite
- Mostrar modal de upgrade cuando se alcanza el límite

**4.1.5 — Webhook de Lemon Squeezy**
Endpoint `/api/webhooks/lemon-squeezy` que escucha:
- `subscription_created` → activar plan Pro/Business
- `subscription_cancelled` → bajar a Free al vencer
- `subscription_payment_failed` → notificar al usuario

**4.1.6 — Internacionalización (i18n) — traducción completa al inglés**
Es la tarea más larga y subestimada de la Fase 1. Toda la app está hardcodeada en español. Sin esto no se puede lanzar al mercado global.

Pasos técnicos:
- Instalar y configurar `next-intl`
- Crear estructura de archivos: `messages/en.json` y `messages/es.json`
- Extraer TODOS los textos del código a archivos de traducción (UI, errores, emails, landing, legal)
- Configurar rutas por idioma: `/en/...` y `/es/...`
- Corregir fechas y números: reemplazar `es-ES` hardcodeado por locale dinámico
- Corregir imports de `date-fns` y `dayjs` para usar locale dinámico
- Traducir al inglés todos los textos (puede usarse Claude/ChatGPT para acelerar)

Estimación realista: **5–8 días** de trabajo. Es la tarea que más puede demorar el lanzamiento.

**Decisión táctica — ¿lanzar primero en español?**
Si el i18n demora demasiado, existe la opción de hacer un **lanzamiento de validación en LATAM en español** con los primeros 10–20 usuarios antes de traducir. Ventajas: más rápido, podés validar el producto con usuarios reales. Desventaja: el mercado LATAM paga menos y es más chico. Decidir según urgencia de ingresos.

**4.1.7 — Corregir rutas rotas**
- Crear `/proyectos/editar/[id]` (redirigir a `/proyectos/[id]` o implementar la página)
- Verificar todos los CTAs de la landing (el botón "Ver planes" ya apuntará a `/precios`)

---

### FASE 2 — Pulir el core (2–4 semanas post-lanzamiento)

**4.2.1 — Sincronización automática en background**
Actualmente la sync se dispara solo cuando el usuario abre el editor y guarda. Agregar:
- Opción de "auto-sync cada X horas" usando Vercel Cron Jobs
- Notificación cuando la sync se completa automáticamente
- Solo para plan Pro y Business

**4.2.2 — Onboarding guiado**
El primer flujo es complejo (crear proyecto → seleccionar Sheets → seleccionar Slides → mapear celdas). Agregar un wizard de 4 pasos con tooltips y un proyecto de ejemplo precargado.
Impacto directo en conversión de Free a pago.

**4.2.3 — Templates de presentación**
Galería de 5–10 templates (reporte de ventas, cotización, catálogo de productos) que el usuario puede usar como punto de partida. Reduce la fricción del primer uso.

**4.2.4 — Estabilizar WhatsApp Lite (Baileys)**
- Mover el servidor de WhatsApp a Railway o Render (no compatible con Vercel serverless)
- Implementar reconexión automática con backoff exponencial
- Persistir sesiones en Supabase Storage (no en memoria)
- Agregar indicador de estado de conexión visible en la UI
- Documentar claramente que WhatsApp Lite usa conexión no oficial

**4.2.5 — Rate limiting**
Agregar rate limiting en las APIs de Google para no exceder las quotas:
- Cola de requests con `p-queue` o similar
- Retry automático con backoff en errores 429
- Dashboard interno para monitorear uso de quota

**4.2.6 — Secuencia de emails de onboarding**
Un usuario que se registra gratis y no convierte en 7 días se pierde para siempre si no hay seguimiento. Implementar con **Resend** o **Brevo** (ambos gratuitos hasta cierto volumen):

- **Email 1 (día 0 — bienvenida):** Explicar los 3 pasos para crear el primer proyecto sincronizado. Incluir link directo al editor.
- **Email 2 (día 3 — activación):** Si el usuario no creó un proyecto, mostrar un GIF del resultado final y un CTA para probarlo.
- **Email 3 (día 7 — conversión):** Si el usuario llegó al límite del plan Free o lleva 7 días activo, mostrar los beneficios de Pro y ofrecer un descuento del 20% por tiempo limitado.

Esta secuencia sola puede duplicar la conversión Free → Pro.

---

### FASE 3 — Crecimiento (mes 2–3)

**4.3.1 — Completar Email (SMTP/SendGrid)**
Actualmente solo hay estructura. Completar con SendGrid para campañas básicas desde el CRM.

**4.3.2 — Excel → Slides directo mejorado**
Agregar preview en tiempo real de cómo quedará la presentación antes de sincronizar.

**4.3.3 — API pública básica**
Endpoint documentado para que usuarios técnicos puedan disparar sincronizaciones desde scripts propios. Diferenciador importante contra Slides Creator.

**4.3.4 — Google Workspace Add-on**
Publicar en el Marketplace de Google Workspace. Es distribución gratuita y el usuario puede usar SincroGoo directamente desde Google Sheets con un sidebar. Esto es un canal de adquisición enorme.

**4.3.5 — WhatsApp Business API**
Completar la integración oficial (Meta Cloud API). Solo priorizar cuando haya ingresos recurrentes para cubrir los costos de la API oficial.

---

## 5. Arquitectura de infraestructura recomendada

| Componente | Servicio | Costo estimado |
|---|---|---|
| Frontend + APIs Next.js | Vercel (plan gratuito) | $0 |
| Base de datos | Supabase (plan Pro) | $25/mes |
| Servidor WhatsApp (Baileys) | Railway | $5–15/mes |
| Pagos | Lemon Squeezy | 5% + $0.50/transacción |
| Email transaccional | Resend o Brevo | $0 hasta 3.000/mes |
| Dominio | Namecheap o Porkbun | ~$10/año |
| **Total infraestructura** | | **~$30–40/mes** |

Con 10 usuarios Pro ya se cubre toda la infraestructura. El margen es del 90%+ a partir de ahí.

---

## 6. Plan de lanzamiento — Semana a semana

### Semana 1–2: Preparación técnica
- Cerrar vulnerabilidades de seguridad (Fase 0)
- Implementar Lemon Squeezy + página `/precios`
- Crear helper de planes y límites
- Corregir rutas rotas
- Grabar video demo de 60 segundos (pantalla + voz o subtítulos en inglés)

### Semana 3: Lanzamiento soft
- Publicar en **Product Hunt** (día martes o miércoles, horario 00:01 PST)
  - Titular: *"SincroGoo — Auto-update your sales presentations from Google Sheets"*
  - Descripción corta: *"Connect Sheets to Slides, manage leads and chat with clients — all in one place"*
  - GIF animado mostrando la sincronización
- Postear en **Reddit r/googlesheets**: *"I built a tool to auto-update Google Slides from Sheets data — saves me 2 hours/week"*
- Postear en **r/productivity** y **r/SaaS**
- Publicar en **Hacker News** (Show HN)

### Semana 4: Tracción orgánica
- Publicar demo en **LinkedIn** (en inglés)
- Crear 3–5 **YouTube Shorts / TikTok** mostrando el antes/después
- Postear en grupos de **Google Workspace** en Facebook
- Enviar a newsletters de productividad: *TLDR*, *Indie Hackers*, *Ben's Bites*

### Mes 2: Distribución
- Publicar en **Google Workspace Marketplace** (proceso de aprobación ~2 semanas)
- Aparecer en directorios: **Alternativeto.net** (como alternativa a Rollstack), **G2**, **Capterra**
- Programa de referidos: 1 mes gratis por cada usuario que traiga
- Escribir 2–3 artículos SEO: *"How to auto-update Google Slides from Sheets"*, *"Best Google Sheets to Slides tools 2025"*

---

## 7. Marketing — Mensajes clave por canal

### Para Reddit / comunidades técnicas
> *"Tired of copying data from Google Sheets into your presentations every week? I built SincroGoo — connect your Sheet to a Slide template once, and it updates automatically. Free to try."*

### Para LinkedIn / profesionales de ventas
> *"Sales reps spend 2+ hours/week updating presentations with fresh data. SincroGoo connects your Google Sheets to Slides and keeps them in sync automatically. Here's a 60-second demo."*

### Para Product Hunt
> *"SincroGoo syncs your Google Sheets with Slides automatically — no more copy-pasting. Plus a built-in CRM to manage leads and reply to WhatsApp/Telegram messages, all in one tab."*

### Para Google Workspace Marketplace
> *"Auto-sync data from Google Sheets to Google Slides. Create dynamic presentations that update themselves when your data changes."*

---

## 8. Métricas a trackear desde el día 1

| Métrica | Objetivo mes 1 | Objetivo mes 3 |
|---|---|---|
| Usuarios registrados | 100 | 500 |
| Usuarios activos (semanales) | 30 | 150 |
| Conversión Free → Pro | — | 5–10% |
| MRR (Monthly Recurring Revenue) | $0 | $500–1.500 USD |
| Churn mensual | — | < 5% |
| NPS | — | > 40 |

---

## 9. Riesgos y cómo mitigarlos

**Riesgo 1 — Google lanza sincronización nativa**
Google lleva años sin hacer bien la bidireccionalidad Sheets ↔ Slides. El CRM integrado y la mensajería son diferenciadores que Google no va a replicar. Mitigación: construir rápido y capturar base de usuarios antes.

**Riesgo 2 — WhatsApp bloquea cuentas que usan Baileys**
Es el riesgo más real. Mitigación: dejar muy claro en la UI y en los términos que es una conexión no oficial, ofrecer Telegram como alternativa, y priorizar la integración con WhatsApp Business API cuando haya ingresos.

**Riesgo 3 — Quota de Google APIs con muchos usuarios**
Mitigación: implementar rate limiting y cola de requests en Fase 2. Monitorear quota desde el día 1 en Google Cloud Console.

**Riesgo 4 — No hay tracción orgánica inicial**
Mitigación: el lanzamiento en Product Hunt + Reddit + HN genera entre 500 y 2.000 visitas orgánicas sin gasto publicitario. Si no convierte, iterar el mensaje antes de gastar en ads.

**Riesgo 5 — La traducción demora el lanzamiento indefinidamente**
Migrar a i18n es una tarea grande (5–8 días) que puede convertirse en un bloqueante eterno si no se acota. Mitigación: definir una fecha límite. Si el i18n no está listo en X días, lanzar primero en español al mercado LATAM como validación, y traducir en paralelo con ingresos.

**Riesgo 6 — WhatsApp Lite en Vercel rompe en producción**
Si `server.js` y Socket.IO están deployados en Vercel, WebSockets no persisten y WhatsApp falla silenciosamente. Mitigación: mover a Railway antes de lanzar y nunca cobrar por WhatsApp hasta verificar estabilidad real.

---

## 10. Resumen ejecutivo — Qué hacer en los próximos 14 días

| Día | Tarea |
|---|---|
| 1 | Comprar dominio (`sincrogoo.com` o `.app`) y conectar a Vercel |
| 2 | Mover servidor WhatsApp a Railway, verificar que funciona |
| 3 | Cerrar bug de seguridad en `/api/supabase/projects` y `/verify` |
| 4 | Activar RLS en tabla proyectos en Supabase |
| 5–6 | Instalar `next-intl`, extraer textos, traducir landing e i18n básico |
| 7–9 | Traducir UI completa al inglés (con ayuda de IA para acelerar) |
| 10 | Crear página `/precios` e integrar Lemon Squeezy |
| 11 | Crear tabla `subscriptions`, helper `getCurrentUserWithPlan` y límites Free |
| 12 | Corregir rutas rotas, revisar todos los CTAs |
| 13 | Grabar video demo de 60 segundos en inglés |
| 14 | Preparar assets de Product Hunt (GIF, screenshots, copy) |
| Semana 3 | Lanzar en Product Hunt, Reddit, Hacker News |

**El objetivo de los 14 días no es tener el producto perfecto. Es tener el primer usuario de pago.**
