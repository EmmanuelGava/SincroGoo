# Flujo de Conexión con WhatsApp Lite - Documentación Completa

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Componentes Principales](#componentes-principales)
4. [Flujo de Conexión Detallado](#flujo-de-conexión-detallado)
5. [Manejo de Credenciales](#manejo-de-credenciales)
6. [Gestión de Eventos](#gestión-de-eventos)
7. [Base de Datos](#base-de-datos)
8. [APIs y Endpoints](#apis-y-endpoints)
9. [Interfaz de Usuario](#interfaz-de-usuario)
10. [Manejo de Errores](#manejo-de-errores)
11. [Reconexión Automática](#reconexión-automática)
12. [Consideraciones de Seguridad](#consideraciones-de-seguridad)
13. [Troubleshooting](#troubleshooting)

---

## 🎯 Visión General

WhatsApp Lite es una implementación que permite conectar números personales de WhatsApp al CRM de SincroGoo usando la librería Baileys. El sistema maneja autenticación, persistencia de credenciales, envío/recepción de mensajes y reconexión automática.

### Características Principales

- ✅ **Autenticación por QR Code**: Conexión segura sin credenciales de API
- ✅ **Persistencia de Sesiones**: Las credenciales se guardan en base de datos
- ✅ **Reconexión Automática**: No requiere nuevo QR al reconectar
- ✅ **Manejo de Mensajes**: Envío y recepción automática de mensajes
- ✅ **Validación de Unicidad**: Un solo número por usuario activo
- ✅ **Tiempo Real**: Notificaciones via Socket.IO

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Arquitectura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Baileys       │
│   (React)       │◄──►│   (Next.js)      │◄──►│   (WhatsApp)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Socket.IO     │    │   Database       │    │   File System   │
│   (Real-time)   │    │   (Supabase)     │    │   (Temp Files)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Patrón de Diseño

El sistema utiliza el **patrón Singleton** para el `WhatsAppLiteService` y **Módulos Especializados** para cada responsabilidad:

- **AuthManager**: Manejo de autenticación y credenciales
- **DatabaseManager**: Persistencia en base de datos
- **EventManager**: Gestión de eventos de Baileys
- **ConnectionManager**: Configuración de conexión

---

## 🔧 Componentes Principales

### 1. WhatsAppLiteService (Singleton)

**Ubicación**: `src/app/servicios/messaging/whatsapp/WhatsAppLiteService.ts`

```typescript
export class WhatsAppLiteService {
  private static instance: WhatsAppLiteService | null = null;
  
  private state: WhatsAppState = {
    isConnected: false,
    currentQR: null,
    phoneNumber: null,
    lastActivity: null,
    userId: null,
    sessionId: null,
    socket: null,
    isReconnecting: false
  };

  // Métodos principales
  async connect(userId?: string): Promise<QRCodeData>
  async sendMessage(phoneNumber: string, message: string, options?: MessageOptions): Promise<boolean>
  getConnectionStatus(): ConnectionStatus
  async disconnect(): Promise<void>
}
```

### 2. AuthManager

**Ubicación**: `src/app/servicios/messaging/whatsapp/modules/AuthManager.ts`

Maneja la autenticación usando un enfoque híbrido (BD + archivos temporales):

```typescript
export class AuthManager {
  async createInMemoryAuthState(
    existingCredentials?: any,
    userId?: string,
    sessionId?: string
  ): Promise<BaileysAuthState>
  
  async loadCredentialsFromDatabase(userId: string): Promise<any | null>
}
```

### 3. DatabaseManager

**Ubicación**: `src/app/servicios/messaging/whatsapp/modules/DatabaseManager.ts`

Gestiona toda la persistencia en Supabase:

```typescript
export class DatabaseManager {
  async saveBaileysCredentials(userId: string, sessionId: string, credentials: any): Promise<void>
  async loadBaileysCredentials(userId: string): Promise<any | null>
  async saveConnectionState(state: WhatsAppLiteState): Promise<void>
  async validatePhoneNumberUniqueness(phoneNumber: string, currentSessionId?: string): Promise<ValidationResult>
}
```

### 4. EventManager

**Ubicación**: `src/app/servicios/messaging/whatsapp/modules/EventManager.ts`

Maneja todos los eventos de Baileys:

```typescript
export class EventManager {
  setupEventListeners(
    socket: WASocket, 
    saveCreds: () => Promise<void>, 
    userId: string,
    state: WhatsAppState
  ): void
  
  onConnectionChange(callback: ConnectionCallback): void
}
```

### 5. ConnectionManager

**Ubicación**: `src/app/servicios/messaging/whatsapp/modules/ConnectionManager.ts`

Configura la conexión de Baileys:

```typescript
export class ConnectionManager {
  createSocket(authState: BaileysAuthState): WASocket
  async waitForQRCodeOrAuth(socket: WASocket, state: any, sessionId: string): Promise<QRCodeData>
}
```

---

## 🔄 Flujo de Conexión Detallado

### Paso 1: Inicio de Conexión

```typescript
// WhatsAppConnect.tsx - handleLiteConnect()
const handleLiteConnect = async () => {
  setStep(0);
  setConnectionStatus(null);
  setQrCode(null);
  
  // 1. Verificar estado actual
  const statusResponse = await fetch('/api/whatsapp', {
    method: 'POST',
    body: JSON.stringify({
      action: 'status',
      type: 'lite'
    })
  });
```

### Paso 2: Verificación de Estado

```typescript
// Si ya está conectado, retornar estado actual
if (statusData.success && statusData.data?.connected) {
  setStep(3);
  setConnectionStatus(statusData.data);
  onConnected({
    tipo_conexion: 'lite',
    session_id: statusData.data.sessionId || 'connected',
    phone_number: statusData.data.phoneNumber || 'Conectado',
    status: 'connected'
  });
  return;
}
```

### Paso 3: Inicialización del Servicio

```typescript
// WhatsAppLiteService.ts - connect()
async connect(userId?: string): Promise<QRCodeData> {
  // Validar entrada
  if (!userId) {
    throw new Error('userId es requerido para la conexión');
  }
  
  // Verificar/crear configuración de WhatsApp
  const hasConfig = await this.verifyUserHasWhatsAppConfig(userId);
  if (!hasConfig) {
    await this.createWhatsAppConfiguration(userId);
  }
  
  // Generar session ID
  if (!this.state.sessionId) {
    this.state.sessionId = uuidv4();
  }
  
  this.state.userId = userId;
}
```

### Paso 4: Carga de Credenciales

```typescript
// Cargar credenciales existentes desde BD
let existingCredentials = null;
try {
  existingCredentials = await this.authManager.loadCredentialsFromDatabase(userId);
  if (existingCredentials) {
    console.log('📥 Credenciales existentes encontradas en BD');
  }
} catch (credsError) {
  console.error('❌ Error cargando credenciales:', credsError);
}
```

### Paso 5: Creación del Auth State

```typescript
// Crear auth state híbrido (BD + archivos temporales)
const authState = await this.authManager.createInMemoryAuthState(
  existingCredentials, 
  userId, 
  this.state.sessionId
);
```

### Paso 6: Configuración de Baileys

```typescript
// Configurar Baileys con auth state
this.state.socket = this.connectionManager.createSocket(authState);

// Configurar event listeners
this.eventManager.setupEventListeners(
  this.state.socket, 
  authState.saveCreds, 
  userId, 
  this.state
);
```

### Paso 7: Espera de QR Code o Autenticación

```typescript
// Esperar QR code o autenticación
const qrData = await this.connectionManager.waitForQRCodeOrAuth(
  this.state.socket, 
  this.state, 
  this.state.sessionId!
);
```

### Paso 8: Manejo de Eventos de Autenticación

```typescript
// EventManager.ts - setupEventListeners()
socket.ev.on('creds.update', async () => {
  if (socket?.user && !state.phoneNumber) {
    state.phoneNumber = socket.user.id?.replace('@s.whatsapp.net', '') || 'Conectado';
    state.isConnected = true;
    
    await this.saveConnectionStateDebounced(state);
    this.notifyConnectionCallbacks(state);
  }
});
```

---

## 🔐 Manejo de Credenciales

### Estructura de Credenciales

Las credenciales de Baileys contienen información crítica para la autenticación:

```json
{
  "registrationId": 12345,
  "noiseKey": {
    "private": [1, 2, 3, ...],
    "public": [4, 5, 6, ...]
  },
  "signedIdentityKey": {
    "private": [7, 8, 9, ...],
    "public": [10, 11, 12, ...]
  },
  "signedPreKey": {
    "keyPair": {
      "private": [13, 14, 15, ...],
      "public": [16, 17, 18, ...]
    },
    "signature": [19, 20, 21, ...],
    "keyId": 123
  },
  "me": {
    "id": "1234567890@s.whatsapp.net",
    "name": "Usuario",
    "verifiedName": "Usuario Verificado"
  }
}
```

### Serialización/Deserialización

```typescript
// DatabaseManager.ts - serializeCredentials()
private serializeCredentials(credentials: any): any {
  const serialized = { ...credentials };
  
  // Convertir Uint8Array a arrays normales
  const convertUint8Array = (obj: any, key: string) => {
    if (obj[key] instanceof Uint8Array) {
      obj[key] = Array.from(obj[key]);
    }
  };
  
  // Serializar todos los campos críticos
  if (serialized.noiseKey) {
    convertUint8Array(serialized.noiseKey, 'private');
    convertUint8Array(serialized.noiseKey, 'public');
  }
  
  return serialized;
}
```

### Validación de Credenciales

```typescript
// Verificar que las credenciales estén completas
if (!session.baileys_credentials.me || session.baileys_credentials.me === null) {
  console.log('⚠️ Credenciales INCOMPLETAS - La sesión nunca se autenticó completamente');
  await this.deleteIncompleteCredentials(session.session_id);
  return null;
}

// Verificar expiración (7 días máximo)
const lastActivity = new Date(session.last_activity);
const now = new Date();
const daysDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

if (daysDiff > 7) {
  console.log('⚠️ Credenciales expiradas (más de 7 días)');
  return null;
}
```

---

## 📡 Gestión de Eventos

### Eventos Principales de Baileys

#### 1. creds.update
```typescript
socket.ev.on('creds.update', async () => {
  // Guardar credenciales en archivos
  await saveCreds();
  
  // Verificar autenticación
  if (socket?.user && !state.phoneNumber) {
    state.phoneNumber = socket.user.id?.replace('@s.whatsapp.net', '') || 'Conectado';
    state.isConnected = true;
    
    await this.saveConnectionStateDebounced(state);
    this.notifyConnectionCallbacks(state);
  }
});
```

#### 2. connection.update
```typescript
socket.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr } = update;
  
  // Mostrar QR
  if (qr) {
    state.currentQR = qr;
    this.notifyConnectionCallbacks(state);
  }
  
  // Detectar autenticación exitosa
  if (socket?.user && !state.phoneNumber) {
    // Validar unicidad del número
    const validation = await this.databaseManager.validatePhoneNumberUniqueness(
      phoneNumber, 
      state.sessionId || undefined
    );
    
    if (!validation.isValid) {
      await this.databaseManager.disconnectExistingPhoneConnections(
        phoneNumber, 
        state.sessionId || undefined
      );
    }
    
    state.phoneNumber = phoneNumber?.replace('@s.whatsapp.net', '') || 'Conectado';
    state.isConnected = true;
    
    await this.saveConnectionStateDebounced(state);
    this.notifyConnectionCallbacks(state);
  }
  
  // Conexión abierta
  if (connection === 'open') {
    state.isConnected = true;
    state.currentQR = null;
    this.notifyConnectionCallbacks(state);
  }
  
  // Desconexión
  if (connection === 'close') {
    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
    this.handleDisconnection(statusCode, userId, state);
  }
});
```

#### 3. messages.upsert
```typescript
socket.ev.on('messages.upsert', async (m) => {
  const msg = m.messages[0];
  if (!msg.key.fromMe && msg.message) {
    const messageText = this.extractMessageText(msg.message);
    const contactId = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
    
    await this.databaseManager.saveIncomingMessage({
      from: contactId,
      message: messageText,
      type: 'text',
      platform: 'whatsapp-lite',
      timestamp: new Date().toISOString()
    }, userId);
  }
});
```

### Notificaciones en Tiempo Real

```typescript
// Emitir eventos via Socket.IO
private emitSocketIOEvent(event: string, data: any, userId: string): void {
  try {
    const io = require('socket.io');
    const socketServer = io.getServer();
    
    if (socketServer) {
      socketServer.to(`user-${userId}`).emit(event, data);
      console.log(`📡 Evento emitido: ${event} para usuario ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error emitiendo evento Socket.IO:', error);
  }
}
```

---

## 🗄️ Base de Datos

### Tabla Principal: whatsapp_lite_sessions

```sql
CREATE TABLE whatsapp_lite_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  qr_code TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'connecting',
  baileys_credentials JSONB NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para consultas eficientes
CREATE INDEX idx_whatsapp_lite_sessions_usuario_id ON whatsapp_lite_sessions(usuario_id);
CREATE INDEX idx_whatsapp_lite_sessions_status ON whatsapp_lite_sessions(status);
CREATE INDEX idx_whatsapp_lite_sessions_last_activity ON whatsapp_lite_sessions(last_activity);
CREATE INDEX idx_whatsapp_lite_sessions_baileys_credentials ON whatsapp_lite_sessions USING GIN (baileys_credentials);
```

### Tabla de Configuración: configuracion_mensajeria_usuario

```sql
CREATE TABLE configuracion_mensajeria_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  plataforma VARCHAR(50) NOT NULL,
  activa BOOLEAN DEFAULT true,
  configuracion JSONB DEFAULT '{}'::jsonb,
  nombre_configuracion VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Operaciones Principales

#### Guardar Estado de Conexión
```typescript
async saveConnectionState(state: WhatsAppLiteState): Promise<void> {
  const connectionData = {
    usuario_id: usuarioId,
    session_id: state.sessionId,
    phone_number: state.phoneNumber,
    qr_code: state.currentQR,
    status: state.isConnected ? 'connected' : 'disconnected',
    last_activity: state.lastActivity?.toISOString(),
    metadata: {
      connected: state.isConnected,
      sessionId: state.sessionId,
      phoneNumber: state.phoneNumber,
      lastActivity: state.lastActivity?.toISOString()
    }
  };

  const { error } = await supabase
    .from('whatsapp_lite_sessions')
    .upsert(connectionData, { onConflict: 'session_id' });
}
```

#### Guardar Credenciales
```typescript
async saveBaileysCredentials(userId: string, sessionId: string, credentials: any): Promise<void> {
  const serializedCredentials = this.serializeCredentials(credentials);
  
  const credentialsData = {
    usuario_id: usuarioId,
    session_id: sessionId,
    baileys_credentials: serializedCredentials,
    status: 'connected',
    last_activity: new Date().toISOString()
  };

  const { error } = await supabase
    .from('whatsapp_lite_sessions')
    .upsert(credentialsData, { onConflict: 'session_id' });
}
```

---

## 🌐 APIs y Endpoints

### Endpoint Principal: `/api/whatsapp`

```typescript
// POST /api/whatsapp
export async function POST(request: NextRequest) {
  const { action, type, ...data } = await request.json();
  
  switch (action) {
    case 'connect':
      return handleConnect(type, data, session.user.id);
    case 'status':
      return handleStatus(type, session.user.id);
    case 'send':
      return handleSend(type, data, session.user.id);
    case 'disconnect':
      return handleDisconnect(type, session.user.id);
    default:
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  }
}
```

### Endpoints Específicos

#### 1. Conexión Pública: `/api/whatsapp/connect-public`
```typescript
export async function POST(request: NextRequest) {
  // Verificar si ya está conectado
  const currentStatus = whatsappLiteService.getConnectionStatus();
  if (currentStatus.connected) {
    return NextResponse.json({
      success: true,
      message: 'WhatsApp Lite ya está conectado',
      connected: true,
      phoneNumber: currentStatus.phoneNumber
    });
  }
  
  // Intentar conectar
  const qrData = await whatsappLiteService.connect('public-user');
  
  if (qrData.qrCode) {
    return NextResponse.json({
      success: true,
      message: 'QR Code generado. Escanea con tu WhatsApp.',
      qrCode: qrData.qrCode,
      sessionId: qrData.sessionId,
      expiresAt: qrData.expiresAt,
      connected: false
    });
  } else {
    return NextResponse.json({
      success: true,
      message: 'WhatsApp Lite conectado exitosamente',
      connected: true,
      sessionId: qrData.sessionId
    });
  }
}
```

#### 2. Verificación y Reconexión: `/api/whatsapp/check-and-reconnect`
```typescript
export async function POST(request: NextRequest) {
  const currentStatus = whatsappLiteService.getConnectionStatus();
  
  if (currentStatus.connected) {
    return NextResponse.json({
      success: true,
      message: 'WhatsApp Lite ya está conectado',
      status: currentStatus,
      action: 'none'
    });
  }
  
  // Intentar reconectar
  const qrData = await whatsappLiteService.connect(userId);
  
  if (qrData.qrCode) {
    return NextResponse.json({
      success: true,
      message: 'QR Code generado para reconexión',
      qrCode: qrData.qrCode,
      sessionId: qrData.sessionId,
      expiresAt: qrData.expiresAt,
      action: 'qr_needed'
    });
  } else {
    return NextResponse.json({
      success: true,
      message: 'WhatsApp Lite reconectado exitosamente',
      status: whatsappLiteService.getConnectionStatus(),
      action: 'reconnected'
    });
  }
}
```

#### 3. Mensajes Entrantes: `/api/whatsapp/incoming`
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  if (body.platform === 'whatsapp-lite') {
    await handleLiteMessage(body);
  }
  
  return NextResponse.json({
    success: true,
    message: 'Mensaje procesado correctamente'
  });
}
```

---

## 🎨 Interfaz de Usuario

### Componente Principal: WhatsAppConnect

**Ubicación**: `src/app/configuracion/mensajeria/components/WhatsAppConnect.tsx`

```typescript
export default function WhatsAppConnect({ onConnected }: WhatsAppConnectProps) {
  const [connectionType, setConnectionType] = useState<'lite' | 'business'>('lite');
  const [step, setStep] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
}
```

### Estados de Conexión

```typescript
const liteSteps = [
  'Generar código QR',
  'Escanear con WhatsApp',
  'Verificar conexión',
  'Completar configuración'
];

const businessSteps = [
  'Autorizar aplicación',
  'Configurar webhook',
  'Verificar conexión',
  'Completar configuración'
];
```

### Manejo de Socket.IO

```typescript
useEffect(() => {
  if (session?.user?.id) {
    const socket = initSocket();
    
    // Unir al usuario a su sala
    socket.emit('join-user-room', session.user.id);
    
    // Escuchar eventos de WhatsApp
    socket.on('whatsapp-status', (data: { connected: boolean; phoneNumber?: string }) => {
      if (data.connected && data.phoneNumber) {
        setConnectionStatus({
          connected: true,
          phoneNumber: data.phoneNumber,
          lastActivity: new Date()
        });
        setStep(3);
        setShowQRDialog(false);
        setIsPolling(false);
        setConnecting(false);
        setError(null);
        
        onConnected({
          tipo_conexion: 'lite',
          session_id: 'socket-connected',
          phone_number: data.phoneNumber,
          status: 'connected',
          fecha_conexion: new Date().toISOString()
        });
      }
    });
  }
}, [session?.user?.id]);
```

### Diálogo de QR Code

```typescript
const QRDialog = () => (
  <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Conectar WhatsApp</DialogTitle>
        <DialogDescription>
          Escanea el código QR con tu WhatsApp para conectar tu cuenta.
        </DialogDescription>
      </DialogHeader>
      
      <div className="flex flex-col items-center space-y-4">
        {qrCode ? (
          <div className="p-4 bg-white rounded-lg">
            <img 
              src={qrCode} 
              alt="QR Code" 
              className="w-64 h-64"
            />
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generando código QR...</span>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground text-center">
          <p>1. Abre WhatsApp en tu teléfono</p>
          <p>2. Ve a Configuración > Dispositivos vinculados</p>
          <p>3. Toca "Vincular dispositivo"</p>
          <p>4. Escanea el código QR</p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
```

---

## ⚠️ Manejo de Errores

### Tipos de Errores Comunes

#### 1. Error de Autenticación
```typescript
// Error 515: QR Code expirado o inválido
if (statusCode === 515) {
  console.log('🔄 Error 515 - Manteniendo QR activo para autenticación móvil...');
  // NO limpiar el estado, mantener QR disponible
  return;
}
```

#### 2. Error de Credenciales
```typescript
// Credenciales incompletas
if (!session.baileys_credentials.me || session.baileys_credentials.me === null) {
  console.log('⚠️ Credenciales INCOMPLETAS - La sesión nunca se autenticó completamente');
  await this.deleteIncompleteCredentials(session.session_id);
  return null;
}
```

#### 3. Error de Conexión
```typescript
// Desconexión inesperada
if (connection === 'close') {
  const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
  this.handleDisconnection(statusCode, userId, state);
}
```

### Estrategias de Recuperación

#### 1. Reconexión Automática
```typescript
private async attemptQuickReconnection(userId: string, state: WhatsAppState): Promise<void> {
  try {
    console.log('🔄 Intentando reconexión rápida...');
    
    // Cargar credenciales existentes
    const existingCredentials = await this.databaseManager.loadBaileysCredentials(userId);
    
    if (existingCredentials) {
      // Intentar reconectar con credenciales existentes
      const authState = await this.authManager.createInMemoryAuthState(
        existingCredentials, 
        userId, 
        state.sessionId
      );
      
      state.socket = this.connectionManager.createSocket(authState);
      this.eventManager.setupEventListeners(
        state.socket, 
        authState.saveCreds, 
        userId, 
        state
      );
      
      console.log('✅ Reconexión automática exitosa');
    }
  } catch (error) {
    console.error('❌ Error en reconexión automática:', error);
  }
}
```

#### 2. Limpieza de Sesiones
```typescript
async cleanSessions(): Promise<void> {
  try {
    console.log('🧹 Limpiando sesiones duplicadas y expiradas...');
    
    // Eliminar sesiones expiradas (más de 7 días)
    await this.databaseManager.cleanExpiredCredentials();
    
    // Eliminar sesiones duplicadas
    const stats = await this.databaseManager.getSessionStats(this.state.userId!);
    
    if (stats.totalSessions > 1) {
      console.log(`🗑️ Eliminando ${stats.totalSessions - 1} sesiones duplicadas`);
      // Implementar lógica de limpieza
    }
    
    console.log('✅ Limpieza de sesiones completada');
  } catch (error) {
    console.error('❌ Error limpiando sesiones:', error);
  }
}
```

---

## 🔄 Reconexión Automática

### Detección de Desconexión

```typescript
private handleDisconnection(statusCode: number, userId: string, state: WhatsAppState): void {
  console.log('🔌 Desconexión detectada, código:', statusCode);
  
  state.isConnected = false;
  state.socket = null;
  
  // Códigos de error que permiten reconexión automática
  const autoReconnectCodes = [408, 500, 502, 503, 504];
  
  if (autoReconnectCodes.includes(statusCode)) {
    console.log('🔄 Código de error permite reconexión automática');
    this.attemptQuickReconnection(userId, state);
  } else {
    console.log('❌ Código de error no permite reconexión automática');
    // Notificar al usuario que debe reconectar manualmente
    this.notifyConnectionCallbacks(state);
  }
}
```

### Verificación Periódica

```typescript
// Verificación periódica de autenticación
const checkAuthPeriodically = () => {
  if (socket?.user && !state.phoneNumber) {
    console.log('🟢 Usuario autenticado detectado en verificación periódica!');
    state.phoneNumber = socket.user.id?.replace('@s.whatsapp.net', '') || 'Conectado';
    state.isConnected = true;
    
    this.saveConnectionStateDebounced(state);
    this.notifyConnectionCallbacks(state);
  }
};

// Verificar cada 5 segundos durante los primeros 2 minutos
let authCheckCount = 0;
const authCheckInterval = setInterval(() => {
  authCheckCount++;
  checkAuthPeriodically();
  
  if (authCheckCount >= 24) { // 2 minutos
    clearInterval(authCheckInterval);
  }
}, 5000);
```

---

## 🔒 Consideraciones de Seguridad

### 1. Validación de Usuario

```typescript
// Verificar que el usuario esté autenticado
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
```

### 2. Validación de Unicidad de Número

```typescript
// Validar que un número no tenga múltiples conexiones activas
const validation = await this.databaseManager.validatePhoneNumberUniqueness(
  phoneNumber, 
  state.sessionId || undefined
);

if (!validation.isValid) {
  console.log('⚠️ Número ya conectado en otra sesión');
  await this.databaseManager.disconnectExistingPhoneConnections(
    phoneNumber, 
    state.sessionId || undefined
  );
}
```

### 3. Limpieza de Credenciales

```typescript
// Eliminar credenciales incompletas
async deleteIncompleteCredentials(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  const { error } = await supabase
    .from('whatsapp_lite_sessions')
    .delete()
    .eq('session_id', sessionId);
    
  if (error) {
    console.error('❌ Error eliminando credenciales incompletas:', error);
  } else {
    console.log('✅ Credenciales incompletas eliminadas');
  }
}
```

### 4. Expiración de Sesiones

```typescript
// Verificar expiración de credenciales (7 días máximo)
const lastActivity = new Date(session.last_activity);
const now = new Date();
const daysDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

if (daysDiff > 7) {
  console.log('⚠️ Credenciales expiradas (más de 7 días)');
  return null;
}
```

---

## 🔧 Troubleshooting

### Problemas Comunes y Soluciones

#### 1. QR Code No Se Genera

**Síntomas**: El QR code no aparece o aparece como error.

**Causas Posibles**:
- Error en la configuración de Baileys
- Problemas de red
- Credenciales corruptas

**Soluciones**:
```typescript
// 1. Verificar logs del servidor
console.log('🔍 Verificando configuración de Baileys...');

// 2. Limpiar sesiones existentes
await whatsappLiteService.cleanSessions();

// 3. Reiniciar el servicio
whatsappLiteService.disconnect();
const qrData = await whatsappLiteService.connect(userId);
```

#### 2. Conexión Se Pierde Frecuentemente

**Síntomas**: La conexión se desconecta automáticamente.

**Causas Posibles**:
- Problemas de red
- Configuración de keep-alive
- Credenciales expiradas

**Soluciones**:
```typescript
// 1. Ajustar configuración de keep-alive
const socketConfig = {
  keepAliveIntervalMs: 30000, // 30 segundos
  connectTimeoutMs: 60000,    // 60 segundos
  qrTimeout: 40000,           // 40 segundos
};

// 2. Implementar reconexión automática más agresiva
if (autoReconnectCodes.includes(statusCode)) {
  setTimeout(() => {
    this.attemptQuickReconnection(userId, state);
  }, 5000); // Reintentar en 5 segundos
}
```

#### 3. Mensajes No Se Envían

**Síntomas**: Los mensajes no se envían aunque la conexión esté activa.

**Causas Posibles**:
- Error en el formato del mensaje
- Problemas de permisos
- Número de teléfono inválido

**Soluciones**:
```typescript
// 1. Verificar formato del número
const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
if (!cleanPhoneNumber.startsWith('52')) {
  cleanPhoneNumber = '52' + cleanPhoneNumber;
}

// 2. Verificar estado de conexión
const status = whatsappLiteService.getConnectionStatus();
if (!status.connected) {
  throw new Error('WhatsApp no está conectado');
}

// 3. Validar formato del mensaje
if (!message || message.trim().length === 0) {
  throw new Error('El mensaje no puede estar vacío');
}
```

#### 4. Credenciales No Se Guardan

**Síntomas**: Las credenciales no se persisten entre sesiones.

**Causas Posibles**:
- Error en la serialización
- Problemas de permisos en BD
- Error en el evento creds.update

**Soluciones**:
```typescript
// 1. Verificar serialización
const serializedCredentials = this.serializeCredentials(credentials);
console.log('📊 Credenciales serializadas:', {
  hasNoiseKey: !!serializedCredentials.noiseKey,
  hasSignedIdentityKey: !!serializedCredentials.signedIdentityKey,
  hasMe: !!serializedCredentials.me
});

// 2. Verificar permisos de BD
const { error } = await supabase
  .from('whatsapp_lite_sessions')
  .upsert(credentialsData, { onConflict: 'session_id' });

if (error) {
  console.error('❌ Error de permisos:', error);
}

// 3. Verificar evento creds.update
socket.ev.on('creds.update', async () => {
  console.log('🔄 Credenciales actualizadas - guardando...');
  await saveCreds();
});
```

### Logs de Debugging

```typescript
// Habilitar logs detallados
const DEBUG_MODE = process.env.NODE_ENV === 'development';

if (DEBUG_MODE) {
  console.log('🔍 [DEBUG] Estado de conexión:', {
    isConnected: state.isConnected,
    phoneNumber: state.phoneNumber,
    sessionId: state.sessionId,
    hasSocket: !!state.socket,
    hasUser: !!state.socket?.user
  });
}
```

---

## 📊 Monitoreo y Métricas

### Estadísticas de Sesiones

```typescript
async getSessionStats(): Promise<{
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
}> {
  const stats = await this.databaseManager.getSessionStats(this.state.userId!);
  
  console.log('📊 Estadísticas de sesiones:', {
    total: stats.totalSessions,
    activas: stats.activeSessions,
    expiradas: stats.expiredSessions
  });
  
  return stats;
}
```

### Métricas de Rendimiento

```typescript
// Tiempo de conexión
const connectionStartTime = Date.now();
const connectionTime = Date.now() - connectionStartTime;

console.log(`⏱️ Tiempo de conexión: ${connectionTime}ms`);

// Tasa de éxito de reconexión
let reconnectionAttempts = 0;
let successfulReconnections = 0;

const reconnectionRate = (successfulReconnections / reconnectionAttempts) * 100;
console.log(`📈 Tasa de éxito de reconexión: ${reconnectionRate.toFixed(2)}%`);
```

---

## 🚀 Optimizaciones Futuras

### 1. Pool de Conexiones

```typescript
// Implementar pool de conexiones para múltiples usuarios
class WhatsAppConnectionPool {
  private connections: Map<string, WhatsAppLiteService> = new Map();
  
  async getConnection(userId: string): Promise<WhatsAppLiteService> {
    if (!this.connections.has(userId)) {
      const service = new WhatsAppLiteService();
      await service.initialize(userId);
      this.connections.set(userId, service);
    }
    return this.connections.get(userId)!;
  }
}
```

### 2. Cache de Credenciales

```typescript
// Implementar cache en memoria para credenciales frecuentes
class CredentialsCache {
  private cache: Map<string, { credentials: any; timestamp: number }> = new Map();
  private TTL = 5 * 60 * 1000; // 5 minutos
  
  async get(userId: string): Promise<any | null> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.credentials;
    }
    return null;
  }
  
  set(userId: string, credentials: any): void {
    this.cache.set(userId, { credentials, timestamp: Date.now() });
  }
}
```

### 3. Compresión de Credenciales

```typescript
// Comprimir credenciales antes de guardar en BD
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

async compressCredentials(credentials: any): Promise<Buffer> {
  const serialized = JSON.stringify(credentials);
  return await gzipAsync(serialized);
}

async decompressCredentials(compressed: Buffer): Promise<any> {
  const decompressed = await gunzipAsync(compressed);
  return JSON.parse(decompressed.toString());
}
```

---

## 📝 Conclusión

El flujo de conexión con WhatsApp Lite es un sistema robusto y bien arquitecturado que maneja eficientemente:

- ✅ **Autenticación segura** por QR code
- ✅ **Persistencia de credenciales** en base de datos
- ✅ **Reconexión automática** sin intervención manual
- ✅ **Validación de unicidad** de números de teléfono
- ✅ **Manejo de errores** robusto
- ✅ **Notificaciones en tiempo real** via Socket.IO
- ✅ **Escalabilidad** para múltiples usuarios

El sistema está diseñado para ser mantenible, escalable y confiable, proporcionando una experiencia de usuario fluida y profesional. 