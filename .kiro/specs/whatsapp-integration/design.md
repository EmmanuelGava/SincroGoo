# WhatsApp Integration Design Document

## 1. Arquitectura General

### 1.1 Visión General
La integración de WhatsApp para SincroGoo implementará una arquitectura dual que soporte tanto WhatsApp Lite (basado en WhatsApp Web) como WhatsApp Business API (oficial de Meta). El sistema estará compuesto por:

- **WhatsApp Lite Service**: Manejo de sesiones de WhatsApp Web usando Puppeteer/Playwright
- **WhatsApp Business Service**: Integración con la API oficial de Meta
- **Message Broker**: Sistema de colas para manejo asíncrono de mensajes
- **Real-time Hub**: WebSocket para notificaciones en tiempo real
- **Contact Sync Service**: Sincronización automática de contactos con el CRM

### 1.2 Diagrama de Arquitectura
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway    │    │   Database      │
│   (React/Next)  │◄──►│   (Next.js API)  │◄──►│   (Supabase)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Real-time Hub  │    │  Message Broker  │    │  Contact Sync   │
│  (WebSocket)    │    │  (Redis/Bull)    │    │  Service        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ WhatsApp Lite   │    │ WhatsApp Business│    │  Admin Panel    │
│ Service         │    │ API Service      │    │  (Monitoring)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 2. Componentes del Sistema

### 2.1 WhatsApp Lite Service
**Tecnología**: Puppeteer/Playwright + Node.js
**Responsabilidades**:
- Manejo de sesiones de WhatsApp Web
- Generación y gestión de códigos QR
- Escucha de mensajes entrantes
- Envío de mensajes salientes
- Manejo de archivos multimedia

**Estructura de clases**:
```typescript
interface WhatsAppLiteService {
  connect(): Promise<QRCodeData>;
  disconnect(): Promise<void>;
  sendMessage(to: string, message: MessageData): Promise<MessageStatus>;
  onMessage(callback: (message: IncomingMessage) => void): void;
  getConnectionStatus(): ConnectionStatus;
}
```

### 2.2 WhatsApp Business API Service
**Tecnología**: Node.js + Meta WhatsApp Business API
**Responsabilidades**:
- Autenticación con Meta API
- Gestión de tokens de acceso
- Envío de mensajes usando templates
- Manejo de webhooks de Meta
- Validación de números de teléfono

**Estructura de clases**:
```typescript
interface WhatsAppBusinessService {
  authenticate(credentials: MetaCredentials): Promise<AuthResult>;
  sendTemplateMessage(to: string, template: TemplateData): Promise<MessageStatus>;
  sendInteractiveMessage(to: string, interactive: InteractiveData): Promise<MessageStatus>;
  validatePhoneNumber(phone: string): Promise<ValidationResult>;
  handleWebhook(payload: WebhookPayload): Promise<void>;
}
```

### 2.3 Message Broker
**Tecnología**: Redis + Bull Queue
**Responsabilidades**:
- Cola de mensajes pendientes
- Reintentos automáticos en caso de fallo
- Priorización de mensajes
- Rate limiting para evitar bloqueos

### 2.4 Real-time Hub
**Tecnología**: Socket.io + Redis Adapter
**Responsabilidades**:
- Notificaciones en tiempo real
- Broadcast de mensajes nuevos
- Estado de conexión en vivo
- Sincronización multi-usuario

### 2.5 Contact Sync Service
**Tecnología**: Node.js + Supabase
**Responsabilidades**:
- Creación automática de leads
- Sincronización de información de perfil
- Resolución de duplicados
- Mantenimiento de historial

## 3. Modelos de Datos

### 3.1 Configuración de WhatsApp (Usando tabla existente)
La configuración de WhatsApp se almacenará en la tabla `configuracion_mensajeria_usuario` existente:

```sql
-- Estructura actual de configuracion_mensajeria_usuario
-- Se usará con plataforma = 'whatsapp'
-- El campo configuracion JSONB contendrá:

{
  "tipo_conexion": "lite" | "business",
  "numero_telefono": "+1234567890",
  "session_data": {
    "qr_code": "base64_encoded_qr",
    "session_id": "unique_session_id",
    "last_activity": "2024-01-01T00:00:00Z"
  },
  "connection_status": "connected" | "disconnected" | "connecting",
  "business_config": {
    "access_token": "encrypted_token",
    "phone_number_id": "phone_id",
    "business_account_id": "business_id"
  },
  "settings": {
    "auto_reply": false,
    "notifications_enabled": true,
    "sync_contacts": true
  }
}
```

### 3.2 Conversaciones y Mensajes (Usando tablas existentes)
Las conversaciones y mensajes de WhatsApp se integrarán con las tablas existentes:

**Tabla `conversaciones`**:
- `servicio_origen`: Se usará 'whatsapp' para mensajes de WhatsApp
- `tipo`: 'entrante' o 'saliente'
- `remitente`: Número de teléfono del remitente
- `metadata`: Información adicional específica de WhatsApp

**Tabla `mensajes_conversacion`**:
- `conversacion_id`: Referencia a la conversación
- `tipo`: Tipo de mensaje (texto, imagen, audio, etc.)
- `contenido`: Contenido del mensaje
- `remitente`: Número de teléfono
- `canal`: 'whatsapp'
- `metadata`: Información adicional del mensaje

### 3.3 Leads (Usando tabla existente)
Los contactos de WhatsApp se sincronizarán con la tabla `leads` existente:

```sql
-- Campos adicionales a considerar en leads:
-- telefono: Número de WhatsApp del contacto
-- origen: Se puede usar 'WhatsApp' para identificar origen
-- metadata: Información adicional de WhatsApp (foto de perfil, etc.)
```

### 3.4 Tabla para Sesiones de WhatsApp Lite
```sql
CREATE TABLE whatsapp_lite_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  qr_code TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'connecting',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_whatsapp_lite_sessions_usuario_id ON whatsapp_lite_sessions(usuario_id);
CREATE INDEX idx_whatsapp_lite_sessions_status ON whatsapp_lite_sessions(status);
CREATE INDEX idx_whatsapp_lite_sessions_last_activity ON whatsapp_lite_sessions(last_activity);
```

### 3.5 Tabla para Templates de WhatsApp Business
```sql
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_templates_usuario_id ON whatsapp_templates(usuario_id);
CREATE INDEX idx_whatsapp_templates_status ON whatsapp_templates(status);
```

## 4. Flujos de Usuario

### 4.1 Conexión WhatsApp Lite
1. Usuario selecciona "Conectar WhatsApp Lite"
2. Sistema inicia instancia de Puppeteer
3. Sistema genera código QR y lo muestra al usuario
4. Usuario escanea código con su teléfono
5. Sistema detecta conexión exitosa
6. Sistema almacena sesión en `whatsapp_lite_sessions`
7. Sistema actualiza `configuracion_mensajeria_usuario`
8. Sistema inicia escucha de mensajes

### 4.2 Conexión WhatsApp Business
1. Usuario selecciona "Conectar WhatsApp Business"
2. Sistema solicita credenciales de Meta API
3. Sistema valida credenciales con Meta
4. Sistema configura webhook para recibir mensajes
5. Sistema almacena tokens de acceso en `configuracion_mensajeria_usuario`
6. Sistema habilita funciones avanzadas

### 4.3 Recepción de Mensajes
1. Mensaje llega via WhatsApp Lite/Business
2. Sistema procesa y valida el mensaje
3. Sistema busca o crea lead automáticamente en tabla `leads`
4. Sistema crea entrada en `conversaciones` con `servicio_origen = 'whatsapp'`
5. Sistema almacena mensaje en `mensajes_conversacion`
6. Sistema envía notificación en tiempo real
7. Sistema actualiza estado de conversación

### 4.4 Envío de Mensajes
1. Usuario escribe mensaje en interfaz
2. Sistema valida número de destino
3. Sistema envía mensaje via integración activa
4. Sistema crea entrada en `conversaciones` con `tipo = 'saliente'`
5. Sistema almacena mensaje en `mensajes_conversacion`
6. Sistema actualiza estado de envío
7. Sistema maneja confirmaciones de entrega

## 5. Seguridad y Privacidad

### 5.1 Encriptación
- Mensajes almacenados encriptados con AES-256
- Tokens de API encriptados en reposo
- Sesiones de WhatsApp Web aisladas por usuario

### 5.2 Autenticación
- Validación de sesiones de usuario
- Rate limiting por usuario/IP
- Logs de auditoría sin contenido sensible

### 5.3 Cumplimiento
- Cumplimiento con GDPR para datos europeos
- Cumplimiento con LGPD para datos brasileños
- Política de retención de datos configurable

## 6. Monitoreo y Logs

### 6.1 Métricas Clave
- Tasa de éxito de envío de mensajes
- Tiempo de respuesta de la API
- Estado de conexiones activas
- Uso de recursos del sistema

### 6.2 Alertas
- Conexiones caídas
- Errores de autenticación
- Rate limits alcanzados
- Problemas de rendimiento

### 6.3 Logs Estructurados
```typescript
interface WhatsAppLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  service: 'lite' | 'business';
  userId: string;
  action: string;
  metadata: Record<string, any>;
  error?: Error;
}
```

## 7. Configuración y Despliegue

### 7.1 Variables de Entorno
```env
# WhatsApp Business API
WHATSAPP_BUSINESS_TOKEN=your_token
WHATSAPP_BUSINESS_PHONE_ID=your_phone_id
WHATSAPP_BUSINESS_VERIFY_TOKEN=your_verify_token

# Redis
REDIS_URL=redis://localhost:6379

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Encryption
ENCRYPTION_KEY=your_32_byte_key

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
```

### 7.2 Dependencias
```json
{
  "dependencies": {
    "puppeteer": "^21.0.0",
    "socket.io": "^4.7.0",
    "bull": "^4.12.0",
    "redis": "^4.6.0",
    "axios": "^1.6.0",
    "crypto": "^1.0.1"
  }
}
```

## 8. Consideraciones de Escalabilidad

### 8.1 Horizontal Scaling
- Múltiples instancias de WhatsApp Lite Service
- Load balancing de conexiones WebSocket
- Particionamiento de colas por usuario

### 8.2 Optimizaciones
- Pool de conexiones de Puppeteer
- Caché de contactos frecuentes
- Compresión de mensajes multimedia

### 8.3 Límites
- Máximo 5 conexiones WhatsApp Lite por usuario
- Rate limit de 100 mensajes/minuto por conexión
- Tamaño máximo de archivo: 16MB

## 9. Integración con Sistema Existente

### 9.1 Uso de Tablas Existentes
- **configuracion_mensajeria_usuario**: Configuración de WhatsApp
- **conversaciones**: Conversaciones de WhatsApp
- **mensajes_conversacion**: Mensajes individuales
- **leads**: Contactos de WhatsApp
- **usuarios**: Usuarios del sistema

### 9.2 Compatibilidad con Chat Existente
- El sistema de chat ya soporta múltiples canales
- WhatsApp se integrará como un canal adicional
- Los mensajes aparecerán en la interfaz unificada
- El historial se mantendrá consistente

### 9.3 Migración de Datos
- No se requieren migraciones complejas
- Las nuevas tablas son complementarias
- Los datos existentes se mantienen intactos
- La integración es incremental
