-- =====================================================================
-- SCRIPT DE REPARACIÓN DE INICIO DE SESIÓN Y USUARIOS EN SUPABASE
-- Jardín Infantil Manitos de Ángel
--
-- ¿POR QUÉ FALLABA EL LOGIN?
-- 1. En Supabase Auth (GoTrue), la tabla `auth.identities` exige que para
--    el proveedor 'email', `id` y `provider_id` sean exactamente el UUID
--    del usuario (`user_id::text`), y no el texto del correo ni un UUID aleatorio.
-- 2. El campo `confirmation_token` en `auth.users` tenía un valor aleatorio
--    en lugar de estar vacío (''), lo cual hace que el motor de autenticación
--    bloquee el acceso creyendo que la cuenta está pendiente de confirmación.
-- 3. La contraseña debe generarse con factor de costo 10 (`bf, 10`).
--
-- INSTRUCCIONES:
-- 1. Ve a https://supabase.com/dashboard
-- 2. Abre tu proyecto y ve a "SQL Editor".
-- 3. Pega este script completo y haz clic en "Run".
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

BEGIN;

-- 1. Limpiar y confirmar todas las cuentas en auth.users
update auth.users
set 
  confirmation_token = '',
  recovery_token = '',
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
  aud = 'authenticated',
  role = 'authenticated'
where email is not null;

-- 2. Reconstruir identidades correctas en auth.identities
-- Borramos las identidades previas con formato erróneo
delete from auth.identities
where provider = 'email';

-- Reinsertamos con el formato exacto requerido por GoTrue:
-- id = user_id (UUID)
-- provider_id = user_id::text
-- identity_data con sub y email
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id,
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', lower(u.email)),
  'email',
  now(),
  u.created_at,
  now()
from auth.users u
where u.email is not null;

-- 3. Actualizar la función para la creación futura de usuarios
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
    created_at, updated_at, confirmation_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    lower(trim(p_email)), v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre_completo', p_nombre),
    now(), now(), ''
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
  values (v_user_id, trim(p_nombre), lower(trim(p_email)), p_rol, p_nivel_id);

  return jsonb_build_object('ok', true, 'user_id', v_user_id);
end;
$$;

grant execute on function public.admin_crear_usuario(text, text, text, text, uuid) to authenticated;

-- 4. Actualizar la función para cambio de contraseña
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
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_cambiar_password(uuid, text) to authenticated;

COMMIT;

-- 5. Consulta de verificación: muestra los usuarios reparados y sus identidades
select 
  u.id as user_id,
  u.email,
  p.rol,
  p.nombre_completo,
  u.email_confirmed_at is not null as email_confirmado,
  u.confirmation_token = '' as token_limpio,
  i.provider,
  i.provider_id
from auth.users u
left join public.perfiles p on p.id = u.id
left join auth.identities i on i.user_id = u.id;
