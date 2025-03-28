--DEFINICIONES DE TODAS LAS TABLAS


create table public.usuarios (
  id uuid not null default extensions.uuid_generate_v4 (),
  email text not null,
  nombre text not null,
  avatar_url text null,
  provider text null,
  ultimo_acceso timestamp with time zone null,
  fecha_creacion timestamp with time zone null default now(),
  fecha_actualizacion timestamp with time zone null default now(),
  auth_id text null,
  constraint usuarios_pkey primary key (id),
  constraint usuarios_email_key unique (email)
) TABLESPACE pg_default;

create index IF not exists idx_usuarios_email on public.usuarios using btree (email) TABLESPACE pg_default;

create table public.slides (
  id uuid not null default gen_random_uuid (),
  proyecto_id uuid not null,
  google_presentation_id text not null,
  google_id text null,
  titulo text not null,
  nombre text null,
  url text null,
  ultima_sincronizacion timestamp with time zone null default now(),
  fecha_creacion timestamp with time zone null default now(),
  fecha_actualizacion timestamp with time zone null default now(),
  constraint slides_pkey primary key (id),
  constraint slides_proyecto_id_google_presentation_id_key unique (proyecto_id, google_presentation_id),
  constraint slides_proyecto_id_fkey foreign KEY (proyecto_id) references proyectos (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.sheets (
  id uuid not null default gen_random_uuid (),
  proyecto_id uuid not null,
  sheets_id text not null,
  nombre text null,
  titulo text null,
  ultima_sincronizacion timestamp with time zone null default now(),
  fecha_creacion timestamp with time zone null default now(),
  fecha_actualizacion timestamp with time zone null default now(),
  google_id text null,
  constraint sheets_pkey primary key (id),
  constraint sheets_proyecto_id_fkey foreign KEY (proyecto_id) references proyectos (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.proyectos (
  id uuid not null default gen_random_uuid (),
  nombre text not null,
  descripcion text null,
  fecha_creacion timestamp with time zone null default now(),
  fecha_actualizacion timestamp with time zone null default now(),
  sheets_id text null,
  slides_id text null,
  hojastitulo text null,
  presentaciontitulo text null,
  userid text null,
  usuario_id uuid null,
  constraint proyectos_pkey primary key (id),
  constraint proyectos_usuario_id_fkey foreign KEY (usuario_id) references usuarios (id)
) TABLESPACE pg_default;

create index IF not exists idx_proyectos_usuario_id on public.proyectos using btree (usuario_id) TABLESPACE pg_default;

create index IF not exists idx_proyectos_userid on public.proyectos using btree (userid) TABLESPACE pg_default;

create table public.historial_cambios (
  id uuid not null default gen_random_uuid (),
  tipo_cambio text null,
  valor_anterior text null,
  valor_nuevo text null,
  fecha_cambio timestamp with time zone null default now(),
  elemento_id uuid null,
  constraint historial_cambios_pkey primary key (id)
) TABLESPACE pg_default;

create table public.elementos (
  id uuid not null default gen_random_uuid (),
  diapositiva_id text not null,
  elemento_id text not null,
  tipo text not null,
  contenido text null,
  posicion jsonb null default '{}'::jsonb,
  estilo jsonb null default '{}'::jsonb,
  fecha_creacion timestamp with time zone null default now(),
  fecha_actualizacion timestamp with time zone null default now(),
  celda_asociada uuid null,
  tipo_asociacion text null,
  constraint elementos_pkey primary key (id),
  constraint elementos_diapositiva_elemento_key unique (diapositiva_id, elemento_id)
) TABLESPACE pg_default;

create index IF not exists idx_elementos_diapositiva_id on public.elementos using btree (diapositiva_id) TABLESPACE pg_default;

create index IF not exists idx_elementos_elemento_id on public.elementos using btree (elemento_id) TABLESPACE pg_default;

create index IF not exists idx_elementos_celda_asociada on public.elementos using btree (celda_asociada) TABLESPACE pg_default;

create index IF not exists elementos_diapositiva_id_idx on public.elementos using btree (diapositiva_id) TABLESPACE pg_default;

create index IF not exists elementos_elemento_id_idx on public.elementos using btree (elemento_id) TABLESPACE pg_default;

create trigger trigger_update_elementos_fecha_actualizacion BEFORE
update on elementos for EACH row
execute FUNCTION update_fecha_actualizacion ();

create table public.diapositivas (
  id uuid not null default gen_random_uuid (),
  orden integer null,
  titulo text null,
  configuracion jsonb null,
  slides_id uuid not null,
  diapositiva_id text null,
  fecha_creacion timestamp with time zone null default now(),
  fecha_actualizacion timestamp with time zone null default now(),
  google_presentation_id text null,
  constraint diapositivas_pkey primary key (id),
  constraint diapositivas_slides_id_fkey foreign KEY (slides_id) references slides (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_diapositivas_diapositiva_id on public.diapositivas using btree (diapositiva_id) TABLESPACE pg_default;

create index IF not exists idx_diapositivas_google_presentation_id on public.diapositivas using btree (google_presentation_id) TABLESPACE pg_default;

create trigger trigger_update_diapositivas_fecha_actualizacion BEFORE
update on diapositivas for EACH row
execute FUNCTION update_fecha_actualizacion ();


create table public.configuracion_proyecto (
  id uuid not null default gen_random_uuid (),
  configuracion jsonb null,
  proyecto_id uuid null,
  constraint configuracion_proyecto_pkey primary key (id)
) TABLESPACE pg_default;

create table public.celdas (
  id uuid not null default gen_random_uuid (),
  sheet_id uuid not null,
  fila integer not null,
  columna text not null,
  referencia_celda text not null,
  contenido text null,
  tipo text null,
  formato jsonb null default '{}'::jsonb,
  metadata jsonb null default '{}'::jsonb,
  fecha_creacion timestamp with time zone null default now(),
  fecha_actualizacion timestamp with time zone null default now(),
  constraint celdas_pkey primary key (id),
  constraint celdas_sheet_id_referencia_celda_key unique (sheet_id, referencia_celda),
  constraint celdas_sheet_id_fkey foreign KEY (sheet_id) references sheets (id) on delete CASCADE,
  constraint celdas_tipo_check check (
    (
      tipo = any (
        array[
          'texto'::text,
          'numero'::text,
          'formula'::text,
          'fecha'::text,
          'imagen'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;


create table public.cache (
  id uuid not null default extensions.uuid_generate_v4 (),
  clave text not null,
  valor jsonb not null,
  tiempo_expiracion timestamp with time zone null,
  fecha_creacion timestamp with time zone null default now(),
  fecha_actualizacion timestamp with time zone null default now(),
  constraint cache_pkey primary key (id),
  constraint cache_clave_key unique (clave)
) TABLESPACE pg_default;


create table public.asociaciones (
  id uuid not null default gen_random_uuid (),
  elemento_id uuid not null,
  sheets_id uuid not null,
  columna text not null,
  tipo text null default 'texto'::text,
  fecha_creacion timestamp with time zone null default now(),
  fecha_actualizacion timestamp with time zone null default now(),
  constraint asociaciones_pkey primary key (id),
  constraint asociaciones_elemento_id_fkey foreign KEY (elemento_id) references elementos (id) on delete CASCADE,
  constraint asociaciones_sheets_id_fkey foreign KEY (sheets_id) references sheets (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_asociaciones_elemento_id on public.asociaciones using btree (elemento_id) TABLESPACE pg_default;

create index IF not exists idx_asociaciones_sheets_id on public.asociaciones using btree (sheets_id) TABLESPACE pg_default;

create index IF not exists asociaciones_elemento_id_idx on public.asociaciones using btree (elemento_id) TABLESPACE pg_default;

create index IF not exists asociaciones_sheets_id_idx on public.asociaciones using btree (sheets_id) TABLESPACE pg_default;

create trigger trigger_update_asociaciones_fecha_actualizacion BEFORE
update on asociaciones for EACH row
execute FUNCTION update_fecha_actualizacion ();

-- Tabla para registrar eventos de sincronización forzada
create table if not exists public.sincro_log (
  id uuid not null default gen_random_uuid(),
  tipo text not null,
  sheets_id uuid null,
  diapositiva_id text null,
  mensaje text null,
  fecha timestamp with time zone not null default now(),
  datos jsonb null,
  constraint sincro_log_pkey primary key (id)
) TABLESPACE pg_default;