# Requirements Document

## Introduction

Esta especificación define la integración dual de WhatsApp para SincroGoo, proporcionando dos opciones de conectividad: WhatsApp Lite (integración no oficial basada en WhatsApp Web) para usuarios sin verificación empresarial, y WhatsApp Business (API oficial de Meta) para usuarios con cuentas empresariales verificadas. El sistema permitirá a los usuarios conectar sus números de WhatsApp al CRM, gestionar conversaciones, enviar y recibir mensajes, y sincronizar contactos de manera transparente.

## Requirements

### Requirement 1

**User Story:** Como usuario de SincroGoo sin WhatsApp Business, quiero conectar mi número personal de WhatsApp al CRM usando WhatsApp Lite, para poder gestionar mis conversaciones de clientes desde la plataforma.

#### Acceptance Criteria

1. WHEN el usuario selecciona "Conectar WhatsApp Lite" THEN el sistema SHALL mostrar un código QR para escanear
2. WHEN el usuario escanea el código QR con su teléfono THEN el sistema SHALL establecer una sesión activa de WhatsApp Web
3. WHEN la conexión se establece exitosamente THEN el sistema SHALL mostrar el estado "Conectado" y el número asociado
4. IF la sesión expira o se desconecta THEN el sistema SHALL mostrar una notificación y permitir reconexión
5. WHEN el usuario no usa su teléfono por 14 días THEN el sistema SHALL mostrar una advertencia sobre la posible desconexión

### Requirement 2

**User Story:** Como usuario empresarial con WhatsApp Business verificado, quiero conectar mi cuenta usando la API oficial de Meta, para acceder a funciones avanzadas como templates y mensajes interactivos.

#### Acceptance Criteria

1. WHEN el usuario selecciona "Conectar WhatsApp Business" THEN el sistema SHALL solicitar las credenciales de la API de Meta
2. WHEN las credenciales son válidas THEN el sistema SHALL establecer la conexión con la API oficial
3. WHEN la conexión Business está activa THEN el sistema SHALL habilitar funciones avanzadas (templates, botones, listas)
4. IF las credenciales expiran THEN el sistema SHALL notificar al usuario y solicitar renovación
5. WHEN se conecta via Business API THEN el sistema SHALL mantener la conexión sin dependencia del teléfono

### Requirement 3

**User Story:** Como usuario del sistema, quiero que el CRM detecte automáticamente qué tipo de integración de WhatsApp puedo usar, para que me muestre solo las opciones disponibles.

#### Acceptance Criteria

1. WHEN el usuario accede a la configuración de WhatsApp THEN el sistema SHALL mostrar ambas opciones disponibles
2. WHEN la empresa no tiene aprobación de Meta THEN el sistema SHALL deshabilitar la opción Business con mensaje explicativo
3. WHEN la empresa tiene aprobación de Meta THEN el sistema SHALL habilitar ambas opciones
4. IF el usuario ya tiene una conexión activa THEN el sistema SHALL mostrar el estado actual y permitir cambio de tipo
5. WHEN el usuario cambia de Lite a Business THEN el sistema SHALL migrar los datos de conversaciones existentes

### Requirement 4

**User Story:** Como usuario conectado a WhatsApp, quiero recibir mensajes entrantes en tiempo real dentro del CRM, para poder responder inmediatamente a mis clientes.

#### Acceptance Criteria

1. WHEN llega un mensaje nuevo THEN el sistema SHALL mostrarlo inmediatamente en la interfaz del CRM
2. WHEN se recibe un mensaje THEN el sistema SHALL crear o actualizar el lead automáticamente usando la tabla `leads` existente
3. WHEN llega un archivo multimedia THEN el sistema SHALL descargarlo y mostrarlo en la conversación
4. IF el mensaje contiene información de contacto THEN el sistema SHALL extraer y sincronizar los datos
5. WHEN se recibe un mensaje THEN el sistema SHALL marcar la conversación como no leída hasta que el usuario la abra

### Requirement 5

**User Story:** Como usuario del CRM, quiero enviar mensajes de WhatsApp desde la interfaz de SincroGoo, para mantener todas mis comunicaciones centralizadas.

#### Acceptance Criteria

1. WHEN el usuario escribe un mensaje THEN el sistema SHALL enviarlo a través de la integración activa
2. WHEN el mensaje se envía exitosamente THEN el sistema SHALL mostrar confirmación de entrega
3. WHEN el usuario adjunta archivos THEN el sistema SHALL subirlos y enviarlos via WhatsApp
4. IF el envío falla THEN el sistema SHALL mostrar error específico y permitir reintento
5. WHEN se usa WhatsApp Business THEN el sistema SHALL permitir usar templates y mensajes estructurados

### Requirement 6

**User Story:** Como administrador del sistema, quiero monitorear el estado de las conexiones de WhatsApp de todos los usuarios, para poder brindar soporte técnico cuando sea necesario.

#### Acceptance Criteria

1. WHEN accedo al panel administrativo THEN el sistema SHALL mostrar el estado de todas las conexiones WhatsApp
2. WHEN una conexión falla THEN el sistema SHALL registrar el error en logs detallados
3. WHEN un usuario reporta problemas THEN el sistema SHALL proporcionar información de diagnóstico
4. IF hay problemas de conectividad THEN el sistema SHALL enviar alertas automáticas al administrador
5. WHEN se requiere mantenimiento THEN el sistema SHALL permitir desconectar usuarios temporalmente

### Requirement 7

**User Story:** Como usuario del CRM, quiero que mis contactos de WhatsApp se sincronicen automáticamente con la base de datos de leads, para mantener información actualizada.

#### Acceptance Criteria

1. WHEN se establece una nueva conversación THEN el sistema SHALL crear un lead automáticamente en la tabla `leads`
2. WHEN se actualiza información del contacto en WhatsApp THEN el sistema SHALL sincronizar los cambios en el lead
3. WHEN un contacto cambia su foto de perfil THEN el sistema SHALL actualizar la imagen en el CRM
4. IF hay conflictos de datos THEN el sistema SHALL mostrar opciones para resolver duplicados
5. WHEN se elimina un contacto THEN el sistema SHALL mantener el historial de conversaciones

### Requirement 8

**User Story:** Como usuario del sistema, quiero que la integración de WhatsApp sea segura y proteja la privacidad de las conversaciones, para cumplir con regulaciones de protección de datos.

#### Acceptance Criteria

1. WHEN se almacenan mensajes THEN el sistema SHALL encriptar la información sensible
2. WHEN se transmiten datos THEN el sistema SHALL usar conexiones seguras (HTTPS/WSS)
3. WHEN un usuario se desconecta THEN el sistema SHALL limpiar las sesiones activas
4. IF se detecta actividad sospechosa THEN el sistema SHALL bloquear la conexión temporalmente
5. WHEN se requiere auditoría THEN el sistema SHALL proporcionar logs de acceso sin exponer contenido privado

### Requirement 9

**User Story:** Como usuario del CRM, quiero que los mensajes de WhatsApp se integren perfectamente con el sistema de conversaciones existente, para mantener un historial unificado.

#### Acceptance Criteria

1. WHEN se recibe un mensaje de WhatsApp THEN el sistema SHALL crear una entrada en la tabla `conversaciones` con `servicio_origen = 'whatsapp'`
2. WHEN se envía un mensaje de WhatsApp THEN el sistema SHALL registrar el mensaje en `mensajes_conversacion`
3. WHEN se crea un lead desde WhatsApp THEN el sistema SHALL asociar automáticamente las conversaciones existentes
4. IF el lead ya existe THEN el sistema SHALL vincular la nueva conversación al lead existente
5. WHEN se visualiza el historial THEN el sistema SHALL mostrar todos los mensajes de WhatsApp junto con otros canales

### Requirement 10

**User Story:** Como usuario del CRM, quiero que la configuración de WhatsApp se integre con el sistema de configuración de mensajería existente, para mantener consistencia en la interfaz.

#### Acceptance Criteria

1. WHEN accedo a configuración de mensajería THEN el sistema SHALL mostrar WhatsApp como una opción más junto a Telegram y Email
2. WHEN configuro WhatsApp THEN el sistema SHALL usar la tabla `configuracion_mensajeria_usuario` existente
3. WHEN cambio la configuración THEN el sistema SHALL actualizar el campo `configuracion` JSONB con los nuevos parámetros
4. IF hay múltiples configuraciones THEN el sistema SHALL permitir seleccionar cuál usar por defecto
5. WHEN se desactiva WhatsApp THEN el sistema SHALL mantener la configuración pero marcar como inactiva