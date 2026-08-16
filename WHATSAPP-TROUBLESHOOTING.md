# WhatsApp Lite - Solución de Problemas

> **Obsoleto (agosto 2026).** Checklist y errores reales (428, session_id, LID, live chat) están en [`docs/MENSAJERIA-WHATSAPP-FLUJO.md`](./docs/MENSAJERIA-WHATSAPP-FLUJO.md).

## Problemas Comunes y Soluciones

### 1. Pérdida de Sesión de Baileys

**Síntomas:**
- Error: "Connection Terminated by Server"
- Error: "Timeout esperando autenticación"
- Sesión se desconecta constantemente
- QR code no se genera

**Causas:**
- Archivos de sesión corruptos
- Múltiples sesiones activas
- Problemas de red/conectividad
- Configuración incorrecta de Baileys

**Soluciones:**

#### Opción 1: Diagnóstico Automático
```bash
# Verificar estado de sesiones
npm run whatsapp:check

# Limpiar sesiones corruptas
npm run whatsapp:clean
```

#### Opción 2: Limpieza Manual
```bash
# Eliminar todas las sesiones
rm -rf auth_sessions/*

# O eliminar sesión específica
rm -rf auth_sessions/[SESSION_ID]
```

#### Opción 3: Reiniciar Servicio
```bash
# Detener el servidor
Ctrl+C

# Limpiar cache de Next.js
npm run clean

# Reiniciar
npm run dev
```

### 2. Errores de Conexión Específicos

#### Error 401 (Unauthorized)
```
Causa: Sesión expirada o inválida
Solución: Limpiar sesión y reconectar
```

#### Error 409 (Conflict)
```
Causa: Múltiples dispositivos conectados
Solución: Desconectar otros dispositivos de WhatsApp Web
```

#### Error 515 (Restart Required)
```
Causa: Normal después del emparejamiento
Solución: El sistema reconecta automáticamente
```

#### Connection Closed/Lost
```
Causa: Problemas de red o servidor
Solución: Reconexión automática activada
```

### 3. Configuración Optimizada

El sistema ahora incluye:

- **Timeouts aumentados**: 2 minutos para conexión y QR
- **Reconexión automática**: Hasta 5 intentos con backoff exponencial
- **Health check**: Verificación cada 30 segundos
- **Limpieza automática**: Sesiones duplicadas y corruptas
- **Persistencia mejorada**: Estado guardado en base de datos

### 4. Monitoreo y Logs

#### Logs Importantes a Revisar:
```
✅ Baileys autenticado exitosamente
🔄 Iniciando reconexión automática
⚠️ Sesión corrupta detectada, limpiando
🧹 Limpiando sesión corrupta en: [PATH]
💾 Estado de conexión guardado exitosamente
```

#### Logs de Error Críticos:
```
❌ Error restaurando conexión de Baileys
❌ Timeout esperando autenticación
❌ Sesión corrupta - intenta de nuevo
❌ Error en reconexión automática
```

### 5. Mejores Prácticas

#### Para Usuarios:
1. **No usar WhatsApp Web** mientras esté conectado el bot
2. **Esperar 30 segundos** entre intentos de conexión
3. **Escanear QR rápidamente** (expira en 2 minutos)
4. **Mantener conexión estable** a internet

#### Para Desarrolladores:
1. **Monitorear logs** regularmente
2. **Ejecutar diagnósticos** semanalmente
3. **Limpiar sesiones** antes de deploy
4. **Verificar variables de entorno**

### 6. Comandos Útiles

```bash
# Verificar estado de sesiones
npm run whatsapp:check

# Limpiar sesiones corruptas
npm run whatsapp:clean

# Ver logs en tiempo real
tail -f logs/whatsapp.log

# Reiniciar servicio completo
npm run clean && npm run dev
```

### 7. Variables de Entorno Requeridas

```env
# Supabase (requerido para persistencia)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# NextAuth (requerido para autenticación)
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

### 8. Estructura de Archivos de Sesión

```
auth_sessions/
├── [USER_ID]/
│   ├── creds.json          # Credenciales principales
│   ├── app-state-sync-key-*.json  # Claves de sincronización
│   └── session-*.json      # Datos de sesión
```

### 9. Solución de Problemas Avanzados

#### Si nada funciona:
1. **Backup de datos importantes**
2. **Eliminar completamente auth_sessions/**
3. **Reiniciar base de datos de sesiones**:
   ```sql
   DELETE FROM whatsapp_lite_sessions;
   ```
4. **Reiniciar aplicación**
5. **Reconectar desde cero**

#### Verificar integridad de la base de datos:
```sql
-- Verificar sesiones activas
SELECT * FROM whatsapp_lite_sessions WHERE status = 'connected';

-- Limpiar sesiones antiguas
DELETE FROM whatsapp_lite_sessions 
WHERE created_at < NOW() - INTERVAL '7 days';
```

### 10. Contacto y Soporte

Si los problemas persisten:
1. Revisar logs completos
2. Ejecutar diagnósticos
3. Documentar pasos para reproducir el error
4. Incluir información del entorno (OS, Node.js version, etc.)

---

## Changelog de Mejoras

### v2.0 - Estabilidad Mejorada
- ✅ Configuración optimizada de Baileys
- ✅ Reconexión automática con backoff exponencial
- ✅ Health check cada 30 segundos
- ✅ Limpieza automática de sesiones corruptas
- ✅ Persistencia mejorada en base de datos
- ✅ Manejo inteligente de códigos de desconexión
- ✅ Scripts de diagnóstico automatizados