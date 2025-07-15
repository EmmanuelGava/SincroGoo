# Próximos Pasos - Sistema de Chat Unificado

## 🎯 Estado Actual
✅ **Chat Unificado Completado** - Interfaz funcional con tiempo real
⚠️ **Pendiente** - Envío real a plataformas externas

## 📋 Plan de Implementación Inmediata

### **PASO 1: Configurar Envío a Telegram** (Prioridad Alta - 2-3 horas)

#### 1.1 Variables de Entorno
- [ ] Añadir `TELEGRAM_BOT_TOKEN` a `.env.development`
- [ ] Añadir `TELEGRAM_BOT_TOKEN` a `.env.production`
- [ ] Verificar que el bot esté configurado correctamente

#### 1.2 Implementar Función de Envío
- [ ] Crear `src/lib/messaging/telegram-sender.ts`
- [ ] Implementar función `enviarTelegram(chatId, mensaje)`
- [ ] Añadir manejo de errores y reintentos
- [ ] Probar envío desde Postman/Thunder Client

#### 1.3 Integrar con API de Chat
- [ ] Actualizar `/api/chat/enviar/route.ts`
- [ ] Conectar función `enviarTelegram()` en `enviarMensajeExterno()`
- [ ] Probar flujo completo: recibir → responder → enviar

#### 1.4 Testing
- [ ] Probar conversación bidireccional completa
- [ ] Verificar que mensajes aparezcan en tiempo real
- [ ] Confirmar que se guarden correctamente en BD

---

### **PASO 2: Mejorar UX del Chat** (Prioridad Media - 3-4 horas)

#### 2.1 Estados de Mensaje
- [ ] Añadir campo `estado` a tabla `mensajes_conversacion`
- [ ] Implementar estados: `enviando`, `enviado`, `entregado`, `error`
- [ ] Mostrar indicadores visuales en `MessageBubble`

#### 2.2 Indicador de Escritura
- [ ] Crear componente `TypingIndicator`
- [ ] Implementar lógica de "escribiendo..." en tiempo real
- [ ] Añadir timeout automático

#### 2.3 Manejo de Errores
- [ ] Crear componente `ErrorMessage` para fallos de envío
- [ ] Implementar botón "Reintentar envío"
- [ ] Mostrar notificaciones de error amigables

#### 2.4 Mejoras de Interfaz
- [ ] Añadir scroll automático a nuevos mensajes
- [ ] Implementar "Marcar como leído"
- [ ] Añadir timestamps más detallados

---

### **PASO 3: Integración WhatsApp Business** (Prioridad Media - 4-6 horas)

#### 3.1 Configuración Meta API
- [ ] Crear app en Meta for Developers
- [ ] Configurar WhatsApp Business API
- [ ] Obtener tokens de acceso y configurar webhooks

#### 3.2 Variables de Entorno
- [ ] Añadir `WHATSAPP_ACCESS_TOKEN`
- [ ] Añadir `WHATSAPP_PHONE_NUMBER_ID`
- [ ] Añadir `WHATSAPP_VERIFY_TOKEN`

#### 3.3 Webhook Entrante
- [ ] Crear `/api/integrations/incoming/whatsapp/route.ts`
- [ ] Implementar `whatsapp-handler.ts`
- [ ] Probar recepción de mensajes

#### 3.4 Envío Saliente
- [ ] Crear `src/lib/messaging/whatsapp-sender.ts`
- [ ] Implementar función `enviarWhatsApp()`
- [ ] Integrar con API de chat

---

### **PASO 4: Integración Email** (Prioridad Baja - 3-4 horas)

#### 4.1 Configuración SendGrid
- [ ] Crear cuenta SendGrid
- [ ] Configurar Inbound Parse
- [ ] Obtener API keys

#### 4.2 Variables de Entorno
- [ ] Añadir `SENDGRID_API_KEY`
- [ ] Añadir `SENDGRID_FROM_EMAIL`

#### 4.3 Implementación
- [ ] Crear webhook para emails entrantes
- [ ] Implementar función de envío de emails
- [ ] Probar flujo completo

---

### **PASO 5: Funcionalidades Avanzadas** (Prioridad Baja - 6-8 horas)

#### 5.1 Búsqueda y Filtros
- [ ] Implementar búsqueda en conversaciones
- [ ] Añadir filtros por plataforma
- [ ] Crear filtro por estado (leído/no leído)

#### 5.2 Plantillas de Respuesta
- [ ] Crear sistema de plantillas rápidas
- [ ] Implementar shortcuts de teclado
- [ ] Añadir variables dinámicas

#### 5.3 Asignación de Agentes
- [ ] Implementar asignación de conversaciones
- [ ] Crear sistema de notificaciones
- [ ] Añadir estados de disponibilidad

#### 5.4 Adjuntos y Media
- [ ] Soporte para imágenes
- [ ] Soporte para documentos
- [ ] Preview de archivos

---

## 🚀 Orden de Implementación Recomendado

### **Esta Semana (Crítico)**
1. ✅ **PASO 1** - Telegram envío real ✅ COMPLETADO
2. ✅ **PASO 2** - Estados y errores, mejoras de UX ✅ COMPLETADO

### **Próxima Semana (Importante)**
3. ✅ **PASO 3** - WhatsApp Business ✅ COMPLETADO (pendiente configuración)
4. 📧 **PASO 4** - Integración Email

### **Siguientes 2 Semanas (Deseable)**
5. 📧 **PASO 4** - Integración Email
6. 🔍 **PASO 5.1** - Búsqueda básica

### **Futuro (Opcional)**
7. 📝 **PASO 5.2-5.4** - Funcionalidades avanzadas

---

## 📝 Notas de Implementación

### **Estructura de Archivos Sugerida**
```
src/lib/messaging/
├── telegram-sender.ts
├── whatsapp-sender.ts
├── email-sender.ts
├── message-status.ts
└── types.ts

src/app/chat/components/
├── TypingIndicator.tsx
├── ErrorMessage.tsx
├── MessageStatus.tsx
└── QuickReplies.tsx
```

### **Variables de Entorno Necesarias**
```env
# Telegram
TELEGRAM_BOT_TOKEN=

# WhatsApp
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

# Email
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
```

### **Testing Checklist**
- [ ] Mensajes entrantes aparecen en tiempo real
- [ ] Mensajes salientes se envían correctamente
- [ ] Estados de mensaje se actualizan
- [ ] Errores se manejan graciosamente
- [ ] Interfaz responsive en móvil
- [ ] Performance con muchas conversaciones

---

## 🎯 Objetivo Final
**Un sistema de chat completamente funcional que permita:**
- ✅ Ver todas las conversaciones en un solo lugar
- ✅ Responder a cualquier plataforma desde la misma interfaz
- ✅ Actualizaciones en tiempo real
- ⚠️ Envío real a Telegram, WhatsApp y Email
- ⚠️ Estados de mensaje y manejo de errores
- 📋 Funcionalidades avanzadas opcionales

**Tiempo estimado total: 15-20 horas de desarrollo**