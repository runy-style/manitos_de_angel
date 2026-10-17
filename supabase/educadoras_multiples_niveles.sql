-- =====================================================================
-- MIGRACIÓN: EDUCADORAS CON MÚLTIPLES NIVELES A CARGO
-- Jardín Infantil Manitos de Ángel
--
-- Permite que una educadora pueda tener asignado uno, dos o más niveles
-- de forma simultánea, con permisos completos de edición en todos ellos.
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

BEGIN;

-- 1. Crear tabla intermedia de asignación de múltiples niveles a educadoras
create table if not exists public.educadoras_niveles (
  id uuid primary key default gen_random_uuid(),
  educadora_id uuid not null references public.perfiles(id) on delete cascade,
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (educadora_id, nivel_id)
);

-- Índices para optimizar búsquedas por educadora y nivel
create index if not exists idx_educadoras_niveles_educadora on public.educadoras_niveles(educadora_id);
create index if not exists idx_educadoras_niveles_nivel on public.educadoras_niveles(nivel_id);

-- Activar RLS en la tabla
alter table public.educadoras_niveles enable row level security;

-- Políticas RLS
drop policy if exists "personal autenticado lee educadoras_niveles" on public.educadoras_niveles;
create policy "personal autenticado lee educadoras_niveles" on public.educadoras_niveles
  for select to authenticated using (true);

drop policy if exists "admin gestiona educadoras_niveles" on public.educadoras_niveles;
create policy "admin gestiona educadoras_niveles" on public.educadoras_niveles
  for all to authenticated
  using (public.mi_rol() = 'admin')
  with check (public.mi_rol() = 'admin');

-- 2. Migrar los niveles actualmente asignados en perfiles.nivel_id
insert into public.educadoras_niveles (educadora_id, nivel_id)
select id, nivel_id from public.perfiles
where rol = 'educadora' and nivel_id is not null
on conflict (educadora_id, nivel_id) do nothing;

-- 3. Actualizar función RLS es_educadora_de(p_nivel)
-- Ahora verifica si el nivel coincide con perfiles.nivel_id O con educadoras_niveles
create or replace function public.es_educadora_de(p_nivel uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() 
      and (
        p.rol = 'admin' 
        or (
          p.rol = 'educadora' 
          and (
            p.nivel_id = p_nivel
            or exists (
              select 1 from public.educadoras_niveles en
              where en.educadora_id = p.id and en.nivel_id = p_nivel
            )
          )
        )
      )
  );
$$;

-- 4. Función de administración para actualizar usuario y sus múltiples niveles
create or replace function public.admin_actualizar_usuario_niveles(
  p_user_id uuid,
  p_nombre text,
  p_rol text,
  p_nivel_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primer_nivel uuid := null;
  v_nid uuid;
begin
  if public.mi_rol() != 'admin' then
    return jsonb_build_object('ok', false, 'error', 'No tienes permisos de Administrador.');
  end if;

  if trim(p_nombre) = '' then
    return jsonb_build_object('ok', false, 'error', 'El nombre no puede estar vacío.');
  end if;

  if p_rol not in ('educadora', 'organizacion', 'admin') then
    return jsonb_build_object('ok', false, 'error', 'Rol no válido.');
  end if;

  if p_rol = 'educadora' and array_length(p_nivel_ids, 1) > 0 then
    v_primer_nivel := p_nivel_ids[1];
  end if;

  -- Actualizar perfil principal
  update public.perfiles
  set nombre_completo = trim(p_nombre),
      rol = p_rol,
      nivel_id = v_primer_nivel
  where id = p_user_id;

  -- Reemplazar asignaciones en educadoras_niveles
  delete from public.educadoras_niveles where educadora_id = p_user_id;

  if p_rol = 'educadora' and p_nivel_ids is not null then
    foreach v_nid in array p_nivel_ids loop
      if v_nid is not null then
        insert into public.educadoras_niveles (educadora_id, nivel_id)
        values (p_user_id, v_nid)
        on conflict (educadora_id, nivel_id) do nothing;
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_actualizar_usuario_niveles(uuid, text, text, uuid[]) to authenticated;

-- 5. Actualizar admin_crear_usuario para soportar múltiples niveles
create or replace function public.admin_crear_usuario(
  p_email text,
  p_password text,
  p_nombre text,
  p_rol text,
  p_nivel_id uuid default null,
  p_nivel_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
  v_primer_nivel uuid;
  v_nid uuid;
  v_lista_niveles uuid[];
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

  -- Determinar lista de niveles
  if p_nivel_ids is not null and array_length(p_nivel_ids, 1) > 0 then
    v_lista_niveles := p_nivel_ids;
    v_primer_nivel := p_nivel_ids[1];
  elsif p_nivel_id is not null then
    v_lista_niveles := array[p_nivel_id];
    v_primer_nivel := p_nivel_id;
  else
    v_lista_niveles := '{}';
    v_primer_nivel := null;
  end if;

  if p_rol != 'educadora' then
    v_primer_nivel := null;
    v_lista_niveles := '{}';
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
  values (v_user_id, trim(p_nombre), lower(trim(p_email)), p_rol, v_primer_nivel)
  on conflict (id) do update set
    nombre_completo = excluded.nombre_completo,
    rol = excluded.rol,
    nivel_id = excluded.nivel_id;

  -- Asignar los niveles en educadoras_niveles
  if p_rol = 'educadora' and array_length(v_lista_niveles, 1) > 0 then
    foreach v_nid in array v_lista_niveles loop
      if v_nid is not null then
        insert into public.educadoras_niveles (educadora_id, nivel_id)
        values (v_user_id, v_nid)
        on conflict (educadora_id, nivel_id) do nothing;
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'user_id', v_user_id);
end;
$$;

grant execute on function public.admin_crear_usuario(text, text, text, text, uuid, uuid[]) to authenticated;

COMMIT;

-- 6. Verificación: Listar educadoras y todos los niveles asignados
select 
  p.id as educadora_id,
  p.nombre_completo,
  p.email,
  p.rol,
  coalesce(
    string_agg(n.nombre, ', ' order by n.nombre),
    '(Sin niveles asignados)'
  ) as niveles_a_cargo
from public.perfiles p
left join public.educadoras_niveles en on en.educadora_id = p.id
left join public.niveles n on n.id = en.nivel_id
group by p.id, p.nombre_completo, p.email, p.rol
order by p.nombre_completo;
