-- =====================================================================
-- Políticas de seguridad (RLS) · Jardín Infantil Manitos de Ángel
-- Ejecutar en Supabase > SQL Editor DESPUÉS del script de la Parte 1.
--
-- Reglas:
--  • Personal autenticado (educadora / organizacion / admin): puede LEER todo.
--  • Solo la educadora asignada a un nivel puede CREAR/EDITAR/ELIMINAR
--    registros de ese nivel.
--  • Apoderados (anon): sin acceso directo a tablas; solo pueden usar la
--    función consultar_ficha_apoderado(p_rut), que es SECURITY DEFINER.
-- =====================================================================

-- 1. Funciones auxiliares (SECURITY DEFINER evita recursión en las políticas)
create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.mi_nivel()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select nivel_id from public.perfiles where id = auth.uid();
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

-- 2. Activar RLS en todas las tablas
alter table public.niveles          enable row level security;
alter table public.perfiles         enable row level security;
alter table public.parvulos         enable row level security;
alter table public.asistencia       enable row level security;
alter table public.bitacoras        enable row level security;
alter table public.documentos_nivel enable row level security;
alter table public.archivos_parvulo enable row level security;

-- 3. Lectura para personal con perfil
create policy "personal lee niveles" on public.niveles
  for select to authenticated using (public.mi_rol() is not null);

create policy "personal lee perfiles" on public.perfiles
  for select to authenticated using (id = auth.uid() or public.mi_rol() is not null);

create policy "admin gestiona perfiles" on public.perfiles
  for all to authenticated
  using (public.mi_rol() = 'admin')
  with check (public.mi_rol() = 'admin');

create policy "personal lee parvulos" on public.parvulos
  for select to authenticated using (public.mi_rol() is not null);

create policy "personal lee asistencia" on public.asistencia
  for select to authenticated using (public.mi_rol() is not null);

create policy "personal lee bitacoras" on public.bitacoras
  for select to authenticated using (public.mi_rol() is not null);

create policy "personal lee documentos" on public.documentos_nivel
  for select to authenticated using (public.mi_rol() is not null);

create policy "personal lee archivos" on public.archivos_parvulo
  for select to authenticated using (public.mi_rol() is not null);

-- 4. Escritura solo para la educadora del nivel
create policy "educadora gestiona parvulos" on public.parvulos
  for all to authenticated
  using (public.es_educadora_de(nivel_id))
  with check (public.es_educadora_de(nivel_id));

create policy "educadora gestiona asistencia" on public.asistencia
  for all to authenticated
  using (public.es_educadora_de(nivel_id))
  with check (public.es_educadora_de(nivel_id));

create policy "educadora gestiona bitacoras" on public.bitacoras
  for all to authenticated
  using (public.es_educadora_de(nivel_id))
  with check (public.es_educadora_de(nivel_id));

create policy "educadora gestiona documentos" on public.documentos_nivel
  for all to authenticated
  using (public.es_educadora_de(nivel_id))
  with check (public.es_educadora_de(nivel_id));

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

-- 5. La función del apoderado debe ser ejecutable por visitantes anónimos
alter function public.consultar_ficha_apoderado(text) set search_path = public;
grant execute on function public.consultar_ficha_apoderado(text) to anon, authenticated;

-- =====================================================================
-- 6. Cómo crear usuarios del jardín (referencia)
--    a) Supabase > Authentication > Users > "Add user" (correo + contraseña,
--       marcar "Auto Confirm User").
--    b) Copiar el UUID del usuario y crear su perfil:
--
-- insert into public.perfiles (id, nombre_completo, email, rol, nivel_id)
-- values (
--   'UUID-DEL-USUARIO',
--   'María González',
--   'maria@manitosdeangel.cl',
--   'educadora',
--   (select id from public.niveles where nombre = 'Nivel Medio Menor')
-- );
--
--    Para la dirección: rol = 'organizacion' y nivel_id = null.
-- =====================================================================
