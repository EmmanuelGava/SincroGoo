[
  {
    "table_name": "asociaciones",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "asociaciones",
    "column_name": "elemento_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "asociaciones",
    "column_name": "sheets_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "asociaciones",
    "column_name": "columna",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "asociaciones",
    "column_name": "tipo",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "asociaciones",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "asociaciones",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "cache",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "cache",
    "column_name": "clave",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "cache",
    "column_name": "valor",
    "data_type": "jsonb",
    "is_nullable": "NO"
  },
  {
    "table_name": "cache",
    "column_name": "tiempo_expiracion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "cache",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "cache",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "celdas",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "celdas",
    "column_name": "sheet_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "celdas",
    "column_name": "fila",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "celdas",
    "column_name": "columna",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "celdas",
    "column_name": "referencia_celda",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "celdas",
    "column_name": "contenido",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "celdas",
    "column_name": "tipo",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "celdas",
    "column_name": "formato",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "celdas",
    "column_name": "metadata",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "celdas",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "celdas",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "configuracion_proyecto",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "configuracion_proyecto",
    "column_name": "configuracion",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "configuracion_proyecto",
    "column_name": "proyecto_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "diapositivas",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "diapositivas",
    "column_name": "orden",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "diapositivas",
    "column_name": "titulo",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "diapositivas",
    "column_name": "configuracion",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "diapositivas",
    "column_name": "slides_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "diapositivas",
    "column_name": "diapositiva_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "diapositivas",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "diapositivas",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "diapositivas",
    "column_name": "google_presentation_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "elementos",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "elementos",
    "column_name": "diapositiva_id",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "elementos",
    "column_name": "elemento_id",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "elementos",
    "column_name": "tipo",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "elementos",
    "column_name": "contenido",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "elementos",
    "column_name": "posicion",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "elementos",
    "column_name": "estilo",
    "data_type": "jsonb",
    "is_nullable": "YES"
  },
  {
    "table_name": "elementos",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "elementos",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "elementos",
    "column_name": "celda_asociada",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "elementos",
    "column_name": "tipo_asociacion",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "historial_cambios",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "historial_cambios",
    "column_name": "tipo_cambio",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "historial_cambios",
    "column_name": "valor_anterior",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "historial_cambios",
    "column_name": "valor_nuevo",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "historial_cambios",
    "column_name": "fecha_cambio",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "historial_cambios",
    "column_name": "elemento_id",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "proyectos",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "proyectos",
    "column_name": "nombre",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "proyectos",
    "column_name": "descripcion",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "proyectos",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "proyectos",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO"
  },
  {
    "table_name": "proyectos",
    "column_name": "sheets_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "proyectos",
    "column_name": "slides_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "proyectos",
    "column_name": "hojastitulo",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "proyectos",
    "column_name": "presentaciontitulo",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "proyectos",
    "column_name": "usuario_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "sheets",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "sheets",
    "column_name": "proyecto_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "sheets",
    "column_name": "sheets_id",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "sheets",
    "column_name": "nombre",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "sheets",
    "column_name": "titulo",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "sheets",
    "column_name": "ultima_sincronizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "sheets",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "sheets",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "sheets",
    "column_name": "google_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "slides",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "slides",
    "column_name": "proyecto_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "slides",
    "column_name": "google_presentation_id",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "slides",
    "column_name": "google_id",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "slides",
    "column_name": "titulo",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "slides",
    "column_name": "nombre",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "slides",
    "column_name": "url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "slides",
    "column_name": "ultima_sincronizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "slides",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "slides",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usuarios",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "usuarios",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "usuarios",
    "column_name": "nombre",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "usuarios",
    "column_name": "avatar_url",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "usuarios",
    "column_name": "provider",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "usuarios",
    "column_name": "ultimo_acceso",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usuarios",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usuarios",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "usuarios",
    "column_name": "auth_id",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "estados_lead",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "estados_lead",
    "column_name": "nombre",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "estados_lead",
    "column_name": "color",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "estados_lead",
    "column_name": "orden",
    "data_type": "integer",
    "is_nullable": "NO"
  },
  {
    "table_name": "estados_lead",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "estados_lead",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "leads",
    "column_name": "nombre",
    "data_type": "text",
    "is_nullable": "NO"
  },
  {
    "table_name": "leads",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "telefono",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "empresa",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "cargo",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "estado_id",
    "data_type": "uuid",
    "is_nullable": "NO"
  },
  {
    "table_name": "leads",
    "column_name": "probabilidad_cierre",
    "data_type": "integer",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "tags",
    "data_type": "text[]",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "valor_potencial",
    "data_type": "numeric",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "origen",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "notas",
    "data_type": "text",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "ultima_interaccion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "asignado_a",
    "data_type": "uuid",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "fecha_creacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  },
  {
    "table_name": "leads",
    "column_name": "fecha_actualizacion",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES"
  }
]

-- Vista para obtener los leads junto con el último mensaje de la conversación asociada
CREATE OR REPLACE VIEW vista_leads_con_mensaje AS
SELECT
  l.*,
  m.contenido AS ultimo_mensaje,
  m.fecha_mensaje AS fecha_ultimo_mensaje
FROM leads l
LEFT JOIN conversaciones c ON c.lead_id = l.id
LEFT JOIN LATERAL (
  SELECT contenido, fecha_mensaje
  FROM mensajes_conversacion
  WHERE conversacion_id = c.id
  ORDER BY fecha_mensaje DESC
  LIMIT 1
) m ON true;