-- =====================================================================
-- SCRIPT DEFINITIVO DE REPARACIÓN DE USUARIOS, LOGIN Y SINCRONIZACIÓN
-- Jardín Infantil Manitos de Ángel
--
-- ¿QUÉ SOLUCIONA ESTE SCRIPT?
-- 1. "Database error querying schema" (Error 500):
--    El servidor GoTrue de Supabase falla cuando las columnas de tokens
--    (recovery_token, email_change, reauthentication_token, etc.) son NULL.
--    Este script limpia todos los NULL y los convierte en cadenas vacías ('').
-- 2. "Usuario creado en Supabase no aparece en la aplicación":
--    La aplicación muestra los usuarios desde la tabla `public.perfiles`.
--    Este script sincroniza todas las cuentas de `auth.users` hacia `public.perfiles`
--    e instala un TRIGGER automático para que cualquier usuario que crees en el
--    Dashboard de Supabase (Authentication > Add user) aparezca de inmediato.
-- 3. Identidades vinculadas (auth.identities):
--    Asegura que cada cuenta tenga su fila correspondiente con provider_id = user_id::text.
--
-- INSTRUCCIONES:
-- 1. Entra a tu proyecto en https://supabase.com/dashboard
-- 2. Ve a "SQL Editor" en el menú izquierdo.
-- 3. Pega este script completo y haz clic en "Run".
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

BEGIN;

-- 1. SANEAR TODOS LOS USUARIOS EXISTENTES EN auth.users
-- Elimina los valores NULL que provocan el error "Database error querying schema"
update auth.users
set 
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  raw_app_meta_data = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
  aud = 'authenticated',
  role = 'authenticated'
where email is not null;

-- 2. RECONSTRUIR IDENTIDADES EN auth.identities
-- Borramos las identidades de tipo email para reinsertarlas limpias y enlazadas
delete from auth.identities
where provider = 'email';

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

-- 3. SINCRONIZAR CUENTAS DE auth.users HACIA public.perfiles
-- Permite que los usuarios creados directo en el Dashboard de Supabase aparezcan en la app
insert into public.perfiles (id, nombre_completo, email, rol, nivel_id)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'nombre_completo', split_part(u.email, '@', 1)),
  lower(u.email),
  coalesce(u.raw_user_meta_data->>'rol', 'educadora'),
  null
from auth.users u
where not exists (select 1 from public.perfiles p where p.id = u.id)
on conflict (id) do update set
  email = excluded.email;

-- 4. TRIGGER AUTOMÁTICO: Crear perfil cuando se cree un usuario directo en Supabase
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo, email, rol, nivel_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre_completo', split_part(new.email, '@', 1)),
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'rol', 'educadora'),
    null
  )
  on conflict (id) do update set
    email = excluded.email,
    nombre_completo = coalesce(excluded.nombre_completo, perfiles.nombre_completo);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 5. TRIGGER PREVENTIVO: Impedir que futuros inserts en auth.users guarden tokens NULL
create or replace function public.prevent_auth_users_null_tokens()
returns trigger
language plpgsql
security definer
as $$
begin
  new.confirmation_token := coalesce(new.confirmation_token, '');
  new.recovery_token := coalesce(new.recovery_token, '');
  new.email_change := coalesce(new.email_change, '');
  new.email_change_token_new := coalesce(new.email_change_token_new, '');
  new.email_change_token_current := coalesce(new.email_change_token_current, '');
  new.phone_change := coalesce(new.phone_change, '');
  new.phone_change_token := coalesce(new.phone_change_token, '');
  new.reauthentication_token := coalesce(new.reauthentication_token, '');
  return new;
end;
$$;

drop trigger if exists on_auth_users_sanitize_tokens on auth.users;
create trigger on_auth_users_sanitize_tokens
  before insert or update on auth.users
  for each row execute function public.prevent_auth_users_null_tokens();

-- 6. ACTUALIZAR FUNCIÓN admin_crear_usuario PARA CREACIÓN DESDE LA WEB
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

-- 7. ACTUALIZAR FUNCIÓN admin_cambiar_password
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

COMMIT;

-- 8. CONSULTA DE VERIFICACIÓN FINAL: Muestra todos los usuarios y perfiles sincronizados
select 
  u.id as user_id,
  u.email,
  p.nombre_completo,
  p.rol,
  u.email_confirmed_at is not null as email_confirmado,
  (u.confirmation_token = '' and u.recovery_token = '') as tokens_sanos,
  i.provider,
  i.provider_id
from auth.users u
left join public.perfiles p on p.id = u.id
left join auth.identities i on i.user_id = u.id
order by u.created_at desc;
