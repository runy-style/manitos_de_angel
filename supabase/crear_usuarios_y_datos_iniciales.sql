-- =====================================================================
-- SCRIPT MAESTRO DE INICIALIZACIÓN COMPLETA
-- Jardín Infantil Manitos de Ángel
--
-- Incluye:
--  1. Estructura de tablas (Niveles, Perfiles, Párvulos, Asistencia,
--     Bitácoras, Documentos Nivel, Archivos Párvulo y LICENCIAS MÉDICAS).
--  2. Políticas de Seguridad (RLS) para proteger los datos de cada nivel.
--  3. Funciones RPC seguras (Consulta de apoderado por RUT, subida de licencias,
--     justificación automática de asistencia).
--  4. Creación de usuarios en Supabase Auth y asignación de roles.
--  5. Datos de prueba iniciales (párvulos, bitácora, asistencias y una licencia médica).
--
-- INSTRUCCIONES:
-- 1. Entra a tu proyecto en https://supabase.com
-- 2. Ve a "SQL Editor" en el menú izquierdo.
-- 3. Pega todo este contenido y haz clic en "Run".
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- =====================================================================
-- SECCIÓN 1: CREACIÓN DE TABLAS
-- =====================================================================

create table if not exists public.niveles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  created_at timestamptz default now()
);

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  email text not null,
  rol text not null check (rol in ('educadora', 'organizacion', 'admin')),
  nivel_id uuid references public.niveles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.parvulos (
  id uuid primary key default gen_random_uuid(),
  rut text not null unique,
  pin_apoderado text default null,
  nombres text not null,
  apellidos text not null,
  fecha_nacimiento date,
  nombre_apoderado text,
  telefono_apoderado text,
  nivel_id uuid not null references public.niveles(id) on delete restrict,
  drive_folder_id text,
  drive_folder_url text,
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.asistencia (
  id uuid primary key default gen_random_uuid(),
  parvulo_id uuid not null references public.parvulos(id) on delete cascade,
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  fecha date not null default current_date,
  estado text not null check (estado in ('presente', 'ausente', 'justificado')),
  observacion_dia text,
  registrado_por uuid references public.perfiles(id),
  created_at timestamptz default now(),
  unique(parvulo_id, fecha)
);

create table if not exists public.bitacoras (
  id uuid primary key default gen_random_uuid(),
  parvulo_id uuid not null references public.parvulos(id) on delete cascade,
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  educadora_id uuid references public.perfiles(id),
  fecha date not null default current_date,
  area_avance text not null default 'Avance Pedagógico',
  observacion text not null,
  visible_apoderado boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.documentos_nivel (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  educadora_id uuid references public.perfiles(id),
  tipo_documento text not null check (tipo_documento in ('planificacion_mensual', 'pauta_evaluacion')),
  mes integer not null check (mes between 1 and 12),
  anio integer not null default extract(year from current_date),
  titulo text not null,
  descripcion text,
  drive_file_id text,
  drive_file_url text not null,
  nombre_archivo text,
  created_at timestamptz default now()
);

create table if not exists public.archivos_parvulo (
  id uuid primary key default gen_random_uuid(),
  parvulo_id uuid not null references public.parvulos(id) on delete cascade,
  educadora_id uuid references public.perfiles(id),
  categoria text not null check (categoria in ('fotografia', 'documento_word', 'pauta_individual', 'otro')),
  titulo text not null,
  drive_file_id text,
  drive_file_url text not null,
  visible_apoderado boolean default true,
  created_at timestamptz default now()
);

-- NUEVA TABLA: Licencias Médicas subidas por Apoderados
create table if not exists public.licencias_medicas (
  id uuid primary key default gen_random_uuid(),
  parvulo_id uuid not null references public.parvulos(id) on delete cascade,
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  fecha_emision date not null default current_date,
  fecha_inicio date not null default current_date,
  fecha_termino date not null,
  dias_reposo integer not null default 1,
  diagnostico_motivo text,
  drive_file_id text,
  drive_file_url text not null,
  nombre_archivo text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'justificada', 'rechazada')),
  observacion_educadora text,
  revisado_por uuid references public.perfiles(id),
  revisado_el timestamptz,
  created_at timestamptz default now()
);


-- =====================================================================
-- SECCIÓN 2: NIVELES INICIALES
-- =====================================================================

insert into public.niveles (nombre, descripcion) values
  ('Sala Cuna Menor', 'Párvulos de 85 días a 1 año'),
  ('Sala Cuna Mayor', 'Párvulos de 1 a 2 años'),
  ('Nivel Medio Menor', 'Párvulos de 2 a 3 años'),
  ('Nivel Medio Mayor', 'Párvulos de 3 a 4 años')
on conflict (nombre) do nothing;


-- =====================================================================
-- SECCIÓN 3: FUNCIONES DE SEGURIDAD Y RLS
-- =====================================================================

create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_educadora_de(p_nivel uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and (rol = 'admin' or (rol = 'educadora' and nivel_id = p_nivel))
  );
$$;

alter table public.niveles          enable row level security;
alter table public.perfiles         enable row level security;
alter table public.parvulos         enable row level security;
alter table public.asistencia       enable row level security;
alter table public.bitacoras        enable row level security;
alter table public.documentos_nivel enable row level security;
alter table public.archivos_parvulo enable row level security;
alter table public.licencias_medicas enable row level security;

-- Políticas de lectura para personal autenticado
drop policy if exists "personal lee niveles" on public.niveles;
create policy "personal lee niveles" on public.niveles
  for select to authenticated using (public.mi_rol() is not null);

drop policy if exists "personal lee perfiles" on public.perfiles;
create policy "personal lee perfiles" on public.perfiles
  for select to authenticated using (id = auth.uid() or public.mi_rol() is not null);

drop policy if exists "personal lee parvulos" on public.parvulos;
create policy "personal lee parvulos" on public.parvulos
  for select to authenticated using (public.mi_rol() is not null);

drop policy if exists "personal lee asistencia" on public.asistencia;
create policy "personal lee asistencia" on public.asistencia
  for select to authenticated using (public.mi_rol() is not null);

drop policy if exists "personal lee bitacoras" on public.bitacoras;
create policy "personal lee bitacoras" on public.bitacoras
  for select to authenticated using (public.mi_rol() is not null);

drop policy if exists "personal lee documentos" on public.documentos_nivel;
create policy "personal lee documentos" on public.documentos_nivel
  for select to authenticated using (public.mi_rol() is not null);

drop policy if exists "personal lee archivos" on public.archivos_parvulo;
create policy "personal lee archivos" on public.archivos_parvulo
  for select to authenticated using (public.mi_rol() is not null);

drop policy if exists "personal lee licencias" on public.licencias_medicas;
create policy "personal lee licencias" on public.licencias_medicas
  for select to authenticated using (public.mi_rol() is not null);

-- Políticas de escritura para Educadoras del nivel y Admin
drop policy if exists "educadora gestiona parvulos" on public.parvulos;
create policy "educadora gestiona parvulos" on public.parvulos
  for all to authenticated
  using (public.es_educadora_de(nivel_id))
  with check (public.es_educadora_de(nivel_id));

drop policy if exists "educadora gestiona asistencia" on public.asistencia;
create policy "educadora gestiona asistencia" on public.asistencia
  for all to authenticated
  using (public.es_educadora_de(nivel_id))
  with check (public.es_educadora_de(nivel_id));

drop policy if exists "educadora gestiona bitacoras" on public.bitacoras;
create policy "educadora gestiona bitacoras" on public.bitacoras
  for all to authenticated
  using (public.es_educadora_de(nivel_id))
  with check (public.es_educadora_de(nivel_id));

drop policy if exists "educadora gestiona documentos" on public.documentos_nivel;
create policy "educadora gestiona documentos" on public.documentos_nivel
  for all to authenticated
  using (public.es_educadora_de(nivel_id))
  with check (public.es_educadora_de(nivel_id));

drop policy if exists "educadora gestiona archivos" on public.archivos_parvulo;
create policy "educadora gestiona archivos" on public.archivos_parvulo
  for all to authenticated
  using (exists (
    select 1 from public.parvulos p
    where p.id = parvulo_id and public.es_educadora_de(p.nivel_id)
  ))
  with check (exists (
    select 1 from public.parvulos p
    where p.id = parvulo_id and public.es_educadora_de(p.nivel_id)
  ));

drop policy if exists "educadora gestiona licencias" on public.licencias_medicas;
create policy "educadora gestiona licencias" on public.licencias_medicas
  for all to authenticated
  using (public.es_educadora_de(nivel_id))
  with check (public.es_educadora_de(nivel_id));


-- =====================================================================
-- SECCIÓN 4: FUNCIONES RPC
-- =====================================================================

-- A) Consulta segura de la ficha del párvulo para el Apoderado por RUT
create or replace function public.consultar_ficha_apoderado(p_rut text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rut_limpio text;
  v_parvulo record;
  v_total_dias integer;
  v_dias_presente integer;
  v_porcentaje numeric(5,2);
  v_asistencias jsonb;
  v_bitacoras jsonb;
  v_archivos jsonb;
  v_licencias jsonb;
begin
  v_rut_limpio := upper(replace(replace(trim(p_rut), '.', ''), ' ', ''));

  select p.*, n.nombre as nivel_nombre
  into v_parvulo
  from public.parvulos p
  join public.niveles n on n.id = p.nivel_id
  where upper(replace(replace(trim(p.rut), '.', ''), ' ', '')) = v_rut_limpio
    and p.activo = true
  limit 1;

  if not found then
    return jsonb_build_object('encontrado', false, 'mensaje', 'No se encontró un párvulo activo con el RUT indicado.');
  end if;

  -- Estadísticas de asistencia
  select count(*), count(*) filter (where estado = 'presente')
  into v_total_dias, v_dias_presente
  from public.asistencia
  where parvulo_id = v_parvulo.id;

  if v_total_dias > 0 then
    v_porcentaje := round((v_dias_presente::numeric / v_total_dias::numeric) * 100, 1);
  else
    v_porcentaje := 0;
  end if;

  -- Últimos 30 registros de asistencia
  select coalesce(jsonb_agg( jsonb_build_object(
    'fecha', a.fecha,
    'estado', a.estado,
    'observacion_dia', a.observacion_dia
  ) order by a.fecha desc), '[]'::jsonb)
  into v_asistencias
  from (
    select fecha, estado, observacion_dia
    from public.asistencia
    where parvulo_id = v_parvulo.id
    order by fecha desc
    limit 30
  ) a;

  -- Bitácoras visibles para apoderados
  select coalesce(jsonb_agg( jsonb_build_object(
    'id', b.id,
    'fecha', b.fecha,
    'area_avance', b.area_avance,
    'observacion', b.observacion,
    'educadora', pf.nombre_completo
  ) order by b.fecha desc), '[]'::jsonb)
  into v_bitacoras
  from public.bitacoras b
  left join public.perfiles pf on pf.id = b.educadora_id
  where b.parvulo_id = v_parvulo.id
    and b.visible_apoderado = true;

  -- Archivos y fotos
  select coalesce(jsonb_agg( jsonb_build_object(
    'id', ar.id,
    'titulo', ar.titulo,
    'categoria', ar.categoria,
    'url', ar.drive_file_url,
    'fecha', ar.created_at
  ) order by ar.created_at desc), '[]'::jsonb)
  into v_archivos
  from public.archivos_parvulo ar
  where ar.parvulo_id = v_parvulo.id
    and ar.visible_apoderado = true;

  -- Licencias médicas del párvulo
  select coalesce(jsonb_agg( jsonb_build_object(
    'id', lm.id,
    'fecha_emision', lm.fecha_emision,
    'fecha_inicio', lm.fecha_inicio,
    'fecha_termino', lm.fecha_termino,
    'dias_reposo', lm.dias_reposo,
    'diagnostico_motivo', lm.diagnostico_motivo,
    'url', lm.drive_file_url,
    'nombre_archivo', lm.nombre_archivo,
    'estado', lm.estado,
    'observacion_educadora', lm.observacion_educadora,
    'created_at', lm.created_at
  ) order by lm.fecha_inicio desc), '[]'::jsonb)
  into v_licencias
  from public.licencias_medicas lm
  where lm.parvulo_id = v_parvulo.id;

  return jsonb_build_object(
    'encontrado', true,
    'parvulo', jsonb_build_object(
      'nombres', v_parvulo.nombres,
      'apellidos', v_parvulo.apellidos,
      'rut', v_parvulo.rut,
      'nivel', v_parvulo.nivel_nombre,
      'drive_folder_url', v_parvulo.drive_folder_url
    ),
    'estadisticas', jsonb_build_object(
      'total_dias_registrados', v_total_dias,
      'dias_presente', v_dias_presente,
      'porcentaje_asistencia', v_porcentaje
    ),
    'asistencia_reciente', v_asistencias,
    'bitacora', v_bitacoras,
    'archivos', v_archivos,
    'licencias', v_licencias
  );
end;
$$;

grant execute on function public.consultar_ficha_apoderado(text) to anon, authenticated;

-- B) Subida segura de Licencias Médicas por Apoderados (sin usuario en auth)
create or replace function public.subir_licencia_apoderado(
  p_rut text,
  p_fecha_inicio date,
  p_fecha_termino date,
  p_dias_reposo integer,
  p_diagnostico_motivo text,
  p_drive_file_id text,
  p_drive_file_url text,
  p_nombre_archivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rut_limpio text;
  v_parvulo record;
  v_licencia_id uuid;
begin
  v_rut_limpio := upper(replace(replace(trim(p_rut), '.', ''), ' ', ''));

  select p.*
  into v_parvulo
  from public.parvulos p
  where upper(replace(replace(trim(p.rut), '.', ''), ' ', '')) = v_rut_limpio
    and p.activo = true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'No se encontró un párvulo activo con el RUT indicado.');
  end if;

  insert into public.licencias_medicas (
    parvulo_id,
    nivel_id,
    fecha_emision,
    fecha_inicio,
    fecha_termino,
    dias_reposo,
    diagnostico_motivo,
    drive_file_id,
    drive_file_url,
    nombre_archivo,
    estado
  ) values (
    v_parvulo.id,
    v_parvulo.nivel_id,
    current_date,
    p_fecha_inicio,
    p_fecha_termino,
    p_dias_reposo,
    p_diagnostico_motivo,
    p_drive_file_id,
    p_drive_file_url,
    p_nombre_archivo,
    'pendiente'
  )
  returning id into v_licencia_id;

  return jsonb_build_object(
    'ok', true,
    'licencia_id', v_licencia_id,
    'parvulo_nombre', v_parvulo.nombres || ' ' || v_parvulo.apellidos
  );
end;
$$;

grant execute on function public.subir_licencia_apoderado(text, date, date, integer, text, text, text, text) to anon, authenticated;

-- C) Aprobación y Justificación Automática en Asistencia por parte de la Educadora
create or replace function public.justificar_licencia_asistencia(
  p_licencia_id uuid,
  p_observacion text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_licencia record;
  v_dia date;
  v_dias_actualizados integer := 0;
begin
  select * into v_licencia from public.licencias_medicas where id = p_licencia_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Licencia no encontrada.');
  end if;

  if not public.es_educadora_de(v_licencia.nivel_id) then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos para gestionar licencias de este nivel.');
  end if;

  update public.licencias_medicas
  set estado = 'justificada',
      observacion_educadora = coalesce(p_observacion, observacion_educadora),
      revisado_por = auth.uid(),
      revisado_el = now()
  where id = p_licencia_id;

  -- Registrar los días hábiles en la tabla de asistencia como 'justificado'
  v_dia := v_licencia.fecha_inicio;
  while v_dia <= v_licencia.fecha_termino loop
    if extract(isodow from v_dia) between 1 and 5 then
      insert into public.asistencia (parvulo_id, nivel_id, fecha, estado, observacion_dia, registrado_por)
      values (
        v_licencia.parvulo_id,
        v_licencia.nivel_id,
        v_dia,
        'justificado',
        coalesce(nullif(trim(v_licencia.diagnostico_motivo), ''), 'Licencia médica aprobada'),
        auth.uid()
      )
      on conflict (parvulo_id, fecha) do update set
        estado = 'justificado',
        observacion_dia = excluded.observacion_dia,
        registrado_por = auth.uid();

      v_dias_actualizados := v_dias_actualizados + 1;
    end if;
    v_dia := v_dia + interval '1 day';
  end loop;

  return jsonb_build_object('ok', true, 'dias_justificados', v_dias_actualizados);
end;
$$;

grant execute on function public.justificar_licencia_asistencia(uuid, text) to authenticated;

-- D) Rechazo u observación de Licencia por la Educadora
create or replace function public.rechazar_licencia_medica(
  p_licencia_id uuid,
  p_observacion text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_licencia record;
begin
  select * into v_licencia from public.licencias_medicas where id = p_licencia_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Licencia no encontrada.');
  end if;

  if not public.es_educadora_de(v_licencia.nivel_id) then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos para gestionar licencias de este nivel.');
  end if;

  update public.licencias_medicas
  set estado = 'rechazada',
      observacion_educadora = coalesce(p_observacion, observacion_educadora),
      revisado_por = auth.uid(),
      revisado_el = now()
  where id = p_licencia_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.rechazar_licencia_medica(uuid, text) to authenticated;


-- =====================================================================
-- SECCIÓN 5: CREACIÓN DE USUARIOS DE ACCESO (Auth + Perfiles)
-- =====================================================================

create or replace function public.crear_usuario_sistema(
  p_email text,
  p_password text,
  p_nombre text,
  p_rol text,
  p_nivel_nombre text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
  v_nivel_id uuid := null;
begin
  if p_nivel_nombre is not null then
    select id into v_nivel_id from public.niveles where nombre = p_nivel_nombre limit 1;
  end if;

  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  select id into v_user_id from auth.users where email = lower(trim(p_email));

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      lower(trim(p_email)), v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('nombre_completo', p_nombre),
      now(), now(), encode(extensions.gen_random_bytes(32), 'hex')
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
      'email', lower(trim(p_email)), now(), now(), now()
    );
  else
    update auth.users
    set encrypted_password = v_encrypted_pw,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_user_id;
  end if;

  insert into public.perfiles (id, nombre_completo, email, rol, nivel_id)
  values (v_user_id, p_nombre, lower(trim(p_email)), p_rol, v_nivel_id)
  on conflict (id) do update set
    nombre_completo = excluded.nombre_completo,
    rol = excluded.rol,
    nivel_id = excluded.nivel_id;

  return v_user_id;
end;
$$;

-- Crear usuarios de prueba (Educadoras y Dirección)
do $$
begin
  -- 1) Educadora Sala Cuna Menor
  perform public.crear_usuario_sistema(
    'educadora.salacuna@manitos.cl',
    'Manitos2025!',
    'Tía Marcela Gómez',
    'educadora',
    'Sala Cuna Menor'
  );

  -- 2) Educadora Nivel Medio Menor
  perform public.crear_usuario_sistema(
    'educadora.medio@manitos.cl',
    'Manitos2025!',
    'Tía Camila Valenzuela',
    'educadora',
    'Nivel Medio Menor'
  );

  -- 3) Dirección / Organización
  perform public.crear_usuario_sistema(
    'direccion@manitos.cl',
    'Manitos2025!',
    'Dirección Manitos de Ángel',
    'organizacion',
    null
  );
end;
$$;


-- =====================================================================
-- SECCIÓN 6: DATOS DE PRUEBA (Párvulos, Asistencia, Bitácora y Licencia)
-- =====================================================================

do $$
declare
  v_sc_menor uuid;
  v_medio_menor uuid;
  v_parvulo1 uuid;
  v_parvulo2 uuid;
  v_educadora1 uuid;
begin
  select id into v_sc_menor from public.niveles where nombre = 'Sala Cuna Menor';
  select id into v_medio_menor from public.niveles where nombre = 'Nivel Medio Menor';
  select id into v_educadora1 from public.perfiles where email = 'educadora.salacuna@manitos.cl';

  -- Párvulo 1: Mateo Morales en Sala Cuna Menor
  insert into public.parvulos (rut, nombres, apellidos, fecha_nacimiento, nombre_apoderado, telefono_apoderado, nivel_id, activo)
  values ('25.432.189-K', 'Mateo Ignacio', 'Morales Silva', '2024-03-15', 'Carolina Silva', '+56 9 8765 4321', v_sc_menor, true)
  on conflict (rut) do update set nombres = excluded.nombres
  returning id into v_parvulo1;

  -- Párvulo 2: Sofía Rojas en Sala Cuna Menor
  insert into public.parvulos (rut, nombres, apellidos, fecha_nacimiento, nombre_apoderado, telefono_apoderado, nivel_id, activo)
  values ('25.876.543-2', 'Sofía Antonella', 'Rojas Castillo', '2024-05-20', 'Gonzalo Rojas', '+56 9 1234 5678', v_sc_menor, true)
  on conflict (rut) do update set nombres = excluded.nombres
  returning id into v_parvulo2;

  -- Párvulo 3: Lucas Araya en Medio Menor
  insert into public.parvulos (rut, nombres, apellidos, fecha_nacimiento, nombre_apoderado, telefono_apoderado, nivel_id, activo)
  values ('24.981.234-5', 'Lucas Benjamín', 'Araya Muñoz', '2023-08-10', 'Patricia Muñoz', '+56 9 5555 4444', v_medio_menor, true)
  on conflict (rut) do nothing;

  if v_parvulo1 is not null and v_educadora1 is not null then
    -- Bitácora de Mateo
    insert into public.bitacoras (parvulo_id, nivel_id, educadora_id, fecha, area_avance, observacion, visible_apoderado)
    values
      (v_parvulo1, v_sc_menor, v_educadora1, current_date - 1, 'Motricidad y Exploración', 'Mateo logró dar sus primeros pasos firmes sosteniéndose de la barra de apoyo.', true),
      (v_parvulo1, v_sc_menor, v_educadora1, current_date, 'Alimentación y Rutina', 'Aceptó excelente la fruta picada y descansó muy bien.', true)
    on conflict do nothing;

    -- Asistencia de Mateo
    insert into public.asistencia (parvulo_id, nivel_id, fecha, estado, observacion_dia, registrado_por)
    values
      (v_parvulo1, v_sc_menor, current_date - 2, 'presente', 'Llegó muy contento con su peluche', v_educadora1),
      (v_parvulo1, v_sc_menor, current_date - 1, 'presente', null, v_educadora1),
      (v_parvulo1, v_sc_menor, current_date, 'presente', 'Asistencia normal', v_educadora1)
    on conflict (parvulo_id, fecha) do nothing;

    -- Licencia médica de prueba pendiente para Mateo (subida por su apoderada)
    insert into public.licencias_medicas (
      parvulo_id, nivel_id, fecha_emision, fecha_inicio, fecha_termino, dias_reposo,
      diagnostico_motivo, drive_file_url, nombre_archivo, estado
    ) values (
      v_parvulo1, v_sc_menor, current_date, current_date + 1, current_date + 3, 3,
      'Cuadro febril viral en observación pediátrica',
      'https://drive.google.com',
      'Certificado_Medico_Mateo_Morales.pdf',
      'pendiente'
    )
    on conflict do nothing;
  end if;
end;
$$;
