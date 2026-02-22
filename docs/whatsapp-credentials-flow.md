# Flujo de Credenciales de WhatsApp - Propuesta de Mejora

## Problema Actual
Las credenciales se guardan en 3 lugares diferentes:
1. `temp_auth_sessions/[session-id]/creds.json` (archivos temporales)
2. `whatsapp_lite_sessions.baileys_credentials` (credenciales de Baileys)
3. `configuracion_mensajeria_usuario.configuracion` (configuración de usuario)

## Solución Propuesta

### Estructura Unificada:
```
whatsapp_lite_sessions (tabla principal)
├── id (UUID)
├── usuario_id (UUID) 
├── session_id (VARCHAR)
├── phone_number (VARCHAR)
├── status (VARCHAR: connecting, connected, disconnected)
├── baileys_credentials (JSONB) - Credenciales completas de Baileys
├── last_activity (TIMESTAMP)
├── created_at (TIMESTAMP)
└── expires_at (TIMESTAMP)

configuracion_mensajeria_usuario (solo referencia)
├── id (UUID)
├── usuario_id (UUID)
├── plataforma ('whatsapp')
├── activa (BOOLEAN)
├── configuracion (JSONB)
│   ├── session_id (referencia a whatsapp_lite_sessions)
│   ├── tipo_conexion ('lite' | 'business')
│   └── fecha_conexion (TIMESTAMP)
└── nombre_configuracion (VARCHAR)
```

### Flujo Simplificado:
1. **AuthManager**: Solo guarda en archivos temporales (para Baileys)
2. **DatabaseManager**: Solo guarda en `whatsapp_lite_sessions`
3. **ConfigManager**: Solo guarda referencia en `configuracion_mensajeria_usuario`

### Beneficios:
- ✅ Una sola fuente de verdad para credenciales
- ✅ No hay duplicación de datos
- ✅ Fácil de mantener y debuggear
- ✅ Escalable para múltiples sesiones