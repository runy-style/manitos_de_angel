-- =====================================================================
-- FUNCIONES DE ADMINISTRACIÓN DE CUENTAS, CONTRASEÑAS Y NIVELES
-- Jardín Infantil Manitos de Ángel
--
-- Ejecuta este script en Supabase > SQL Editor para activar el módulo
-- de administración exclusivo para el Administrador.
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- Asegurar que al eliminar o modificar una educadora no se bloquee por registros históricos
alter table public.asistencia
  drop constraint if exists asistencia_registrado_por_fkey,
  add constraint asistencia_registrado_por_fkey
    foreign key (registrado_por) references public.perfiles(id) on delete set null;

alter table public.bitacoras
  drop constraint if exists bitacoras_educadora_id_fkey,
  add constraint bitacoras_educadora_id_fkey
    foreign key (educadora_id) references public.perfiles(id) on delete set null;

alter table public.documentos_nivel
  drop constraint if exists documentos_nivel_educadora_id_fkey,
  add constraint documentos_nivel_educadora_id_fkey
    foreign key (educadora_id) references public.perfiles(id) on delete set null;

alter table public.archivos_parvulo
  drop constraint if exists archivos_parvulo_educadora_id_fkey,
  add constraint archivos_parvulo_educadora_id_fkey
    foreign key (educadora_id) references public.perfiles(id) on delete set null;

alter table public.licencias_medicas
  drop constraint if exists licencias_medicas_revisado_por_fkey,
  add constraint licencias_medicas_revisado_por_fkey
    foreign key (revisado_por) references public.perfiles(id) on delete set null;

-- 1. Crear nuevo usuario directamente (Auth + Perfiles) sin confirmación por correo
create or replace function public.admin_crear_usuario(
  p_email text,
  p_password text,
  p_nombre text,
  p_rol text,
  p_nivel_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
begin
  if public.mi_rol() != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos de Administrador para crear cuentas.');
  end if;

  if trim(p_email) = '' or p_password = '' or trim(p_nombre) = '' then
    return jsonb_build_object('ok', false, 'error', 'Todos los campos son obligatorios.');
  end if;

  if p_rol not in ('educadora', 'organizacion', 'admin') then
    return jsonb_build_object('ok', false, 'error', 'El rol seleccionado no es válido.');
  end if;

  -- Comprobar si el correo ya existe
  if exists (select 1 from auth.users where email = lower(trim(p_email))) then
    return jsonb_build_object('ok', false, 'error', 'Ya existe un usuario registrado con este correo electrónico.');
  end if;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    lower(trim(p_email)), v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre_completo', p_nombre, 'rol', p_rol),
    now(), now(),
    '', '',
    '', '', '',
    '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
    'email', v_user_id::text, now(), now(), now()
  );

  insert into public.perfiles (id, nombre_completo, email, rol, nivel_id)
  values (v_user_id, trim(p_nombre), lower(trim(p_email)), p_rol, p_nivel_id)
  on conflict (id) do update set
    nombre_completo = excluded.nombre_completo,
    rol = excluded.rol,
    nivel_id = excluded.nivel_id;

  return jsonb_build_object('ok', true, 'user_id', v_user_id);
end;
$$;

grant execute on function public.admin_crear_usuario(text, text, text, text, uuid) to authenticated;


-- 2. Cambiar contraseña de cualquier usuario (Reset inmediato de clave por el Administrador)
create or replace function public.admin_cambiar_password(
  p_user_id uuid,
  p_nueva_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_encrypted_pw text;
begin
  if public.mi_rol() != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos de Administrador para cambiar contraseñas.');
  end if;

  if length(p_nueva_password) < 6 then
    return jsonb_build_object('ok', false, 'error', 'La contraseña debe tener al menos 6 caracteres.');
  end if;

  v_encrypted_pw := extensions.crypt(p_nueva_password, extensions.gen_salt('bf', 10));

  update auth.users
  set encrypted_password = v_encrypted_pw,
      confirmation_token = '',
      recovery_token = '',
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_cambiar_password(uuid, text) to authenticated;


-- 3. Actualizar perfil de usuario (Nombre, Rol y Nivel asignado)
create or replace function public.admin_actualizar_usuario(
  p_user_id uuid,
  p_nombre text,
  p_rol text,
  p_nivel_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.mi_rol() != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos de Administrador.');
  end if;

  if p_rol not in ('educadora', 'organizacion', 'admin') then
    return jsonb_build_object('ok', false, 'error', 'El rol seleccionado no es válido.');
  end if;

  update public.perfiles
  set nombre_completo = trim(p_nombre),
      rol = p_rol,
      nivel_id = case when p_rol = 'educadora' then p_nivel_id else null end
  where id = p_user_id;

  update auth.users
  set raw_user_meta_data = jsonb_build_object('nombre_completo', trim(p_nombre)),
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_actualizar_usuario(uuid, text, text, uuid) to authenticated;


-- 4. Eliminar cuenta de usuario
create or replace function public.admin_eliminar_usuario(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.mi_rol() != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos de Administrador.');
  end if;

  -- Impedir que el admin se borre a sí mismo accidentalmente
  if p_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'No puedes eliminar tu propia cuenta de administrador.');
  end if;

  delete from auth.users where id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_eliminar_usuario(uuid) to authenticated;


-- 5. Gestión de Niveles (Crear, Editar, Eliminar niveles)
create or replace function public.admin_crear_nivel(
  p_nombre text,
  p_descripcion text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nivel_id uuid;
begin
  if public.mi_rol() != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos de Administrador.');
  end if;

  insert into public.niveles (nombre, descripcion)
  values (trim(p_nombre), trim(p_descripcion))
  returning id into v_nivel_id;

  return jsonb_build_object('ok', true, 'nivel_id', v_nivel_id);
end;
$$;

grant execute on function public.admin_crear_nivel(text, text) to authenticated;

create or replace function public.admin_actualizar_nivel(
  p_nivel_id uuid,
  p_nombre text,
  p_descripcion text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.mi_rol() != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos de Administrador.');
  end if;

  update public.niveles
  set nombre = trim(p_nombre),
      descripcion = trim(p_descripcion)
  where id = p_nivel_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_actualizar_nivel(uuid, text, text) to authenticated;

create or replace function public.admin_eliminar_nivel(
  p_nivel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.mi_rol() != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos de Administrador.');
  end if;

  -- Comprobar si hay párvulos asignados a este nivel
  if exists (select 1 from public.parvulos where nivel_id = p_nivel_id and activo = true) then
    return jsonb_build_object('ok', false, 'error', 'No se puede eliminar este nivel porque tiene párvulos activos asignados. Reasigna los párvulos antes de eliminar.');
  end if;

  delete from public.niveles where id = p_nivel_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_eliminar_nivel(uuid) to authenticated;


-- =====================================================================
-- 6. LIMPIAR TODOS LOS PÁRVULOS DE TODOS LOS NIVELES
-- =====================================================================
create or replace function public.admin_limpiar_todos_los_parvulos()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  if public.mi_rol() != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos de Administrador para vaciar la nómina.');
  end if;

  select count(*) into v_total from public.parvulos;

  delete from public.asistencia;
  delete from public.bitacoras;
  delete from public.archivos_parvulo;
  delete from public.licencias_medicas;
  delete from public.entrevistas;
  delete from public.parvulos;

  return jsonb_build_object(
    'ok', true,
    'mensaje', 'Se eliminaron todos los párvulos y sus registros asociados.',
    'parvulos_eliminados', v_total
  );
end;
$$;

grant execute on function public.admin_limpiar_todos_los_parvulos() to authenticated;


-- =====================================================================
-- 7. ASIGNAR ROL DE ADMINISTRADOR A TU CUENTA ACTUAL
-- Reemplaza 'tu-correo@ejemplo.com' por el correo con el que inicias sesión
-- =====================================================================
-- update public.perfiles
-- set rol = 'admin'
-- where email = 'tu-correo@ejemplo.com';

