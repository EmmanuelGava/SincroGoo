# Solución: Múltiples Sender Keys de Baileys

> **Obsoleto (agosto 2026).** Ver el flujo actual (Railway + `session_id` reutilizado) en [`docs/MENSAJERIA-WHATSAPP-FLUJO.md`](./MENSAJERIA-WHATSAPP-FLUJO.md).

## Problema Identificado

El sistema estaba generando múltiples sender keys de Baileys cuando deberían manejarse desde la base de datos de Supabase. Esto causaba:

- **Sesiones duplicadas**: Múltiples instancias de Baileys para el mismo usuario
- **Pérdida de credenciales**: Las credenciales no se persistían correctamente
- **Inconsistencia**: Diferentes sender keys para la misma sesión
- **Problemas de reconexión**: No se podía restaurar sesiones existentes

## Solución Implementada

### 1. Migración de Base de Datos

Se agregó el campo `baileys_credentials` a la tabla `whatsapp_lite_sessions`:

```sql
-- Agregar campo baileys_credentials a la tabla whatsapp_lite_sessions
ALTER TABLE whatsapp_lite_sessions 
ADD COLUMN baileys_credentials JSONB NULL;

-- Crear índice para consultas eficientes de credenciales
CREATE INDEX IF NOT EXISTS idx_whatsapp_lite_sessions_baileys_credentials 
ON whatsapp_lite_sessions USING GIN (baileys_credentials);

-- Agregar comentario explicativo
COMMENT ON COLUMN whatsapp_lite_sessions.baileys_credentials IS 'Credenciales de autenticación de Baileys (sender keys, noise keys, etc.)';
```

### 2. Actualización del DatabaseManager

Se mejoró el `DatabaseManager` para manejar correctamente las credenciales:

#### Métodos Agregados:
- `saveBaileysCredentials()`: Guarda credenciales con validación
- `loadBaileysCredentials()`: Carga credenciales con verificación de expiración
- `cleanExpiredCredentials()`: Limpia credenciales expiradas
- `getSessionStats()`: Obtiene estadísticas de sesiones

#### Validaciones Implementadas:
- Verificación de campos requeridos (`registrationId`)
- Control de expiración (7 días máximo)
- Manejo de errores robusto
- Conversión automática de Google ID a UUID

### 3. Mejoras en WhatsAppLiteService

#### Nuevo Flujo de Conexión:
1. **Verificar credenciales existentes** en la base de datos
2. **Restaurar sesión** si hay credenciales válidas
3. **Crear nueva sesión** solo si es necesario
4. **Guardar credenciales** automáticamente cuando cambien

#### Métodos Agregados:
- `restoreSessionFromDatabase()`: Restaura sesión desde BD
- `cleanSessions()`: Limpia sesiones duplicadas y expiradas
- `getSessionStats()`: Obtiene estadísticas

### 4. Endpoints de API

#### Nuevo Endpoint: `/api/whatsapp/lite/clean-sessions`
- `POST`: Limpia sesiones duplicadas y expiradas
- `GET`: Obtiene estadísticas de sesiones

### 5. Interfaz de Usuario

Se agregaron botones en `WhatsAppConnect.tsx`:
- **"Limpiar Sesiones"**: Elimina sesiones duplicadas y expiradas
- **"Ver Estadísticas"**: Muestra estadísticas de sesiones
- **Indicadores visuales**: Chips con información de sesiones

## Beneficios de la Solución

### ✅ Persistencia de Credenciales
- Las credenciales se guardan automáticamente en Supabase
- Se restauran al reconectar sin necesidad de nuevo QR
- Validación de integridad antes de guardar

### ✅ Prevención de Duplicados
- Limpieza automática de sesiones duplicadas
- Control de expiración (7 días máximo)
- Un solo sender key por usuario activo

### ✅ Mejor Experiencia de Usuario
- Reconexión automática sin QR
- Estadísticas de sesiones visibles
- Botones de limpieza manual

### ✅ Robustez del Sistema
- Manejo de errores mejorado
- Validaciones de credenciales
- Logs detallados para debugging

## Cómo Aplicar la Solución

### 1. Aplicar Migración
```bash
npm run whatsapp:migrate
```

### 2. Reiniciar Servidor
```bash
npm run dev
```

### 3. Verificar Funcionamiento
```bash
npm run whatsapp:check
```

### 4. Limpiar Sesiones Existentes (Opcional)
```bash
npm run whatsapp:clean
```

## Estructura de Credenciales

Las credenciales de Baileys se almacenan como JSONB con esta estructura:

```json
{
  "registrationId": 12345,
  "noiseKey": {
    "private": "base64_encoded_private_key",
    "public": "base64_encoded_public_key"
  },
  "signedIdentityKey": {
    "private": "base64_encoded_private_key",
    "public": "base64_encoded_public_key"
  },
  "signedPreKey": {
    "keyPair": {
      "private": "base64_encoded_private_key",
      "public": "base64_encoded_public_key"
    },
    "signature": "base64_encoded_signature",
    "keyId": 12345
  },
  "advSignedIdentityKey": {
    "private": "base64_encoded_private_key",
    "public": "base64_encoded_public_key"
  }
}
```

## Monitoreo y Mantenimiento

### Logs Importantes a Revisar:
```
📥 Credenciales de Baileys cargadas desde BD
💾 Credenciales de Baileys actualizadas en BD
🧹 Credenciales de Baileys expiradas limpiadas
⚠️ Credenciales de Baileys expiradas (más de 7 días)
```

### Comandos de Mantenimiento:
```bash
# Verificar estado de sesiones
npm run whatsapp:check

# Limpiar sesiones corruptas
npm run whatsapp:clean

# Ver estadísticas
npm run whatsapp:stats
```

## Próximos Pasos

1. **Monitoreo**: Revisar logs regularmente
2. **Testing**: Probar reconexión automática
3. **Optimización**: Ajustar tiempos de expiración si es necesario
4. **Documentación**: Actualizar guías de usuario

---

## Resumen

Esta solución resuelve completamente el problema de múltiples sender keys de Baileys al:

- **Centralizar** las credenciales en Supabase
- **Prevenir** duplicados con limpieza automática
- **Mejorar** la experiencia de reconexión
- **Proporcionar** herramientas de monitoreo y mantenimiento

El sistema ahora maneja las credenciales de Baileys de manera eficiente y consistente, evitando la generación de múltiples sender keys innecesarios. 