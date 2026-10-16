-- =====================================================================
-- MÓDULO INTEGRAL DE PUBLICACIONES Y NOTICIAS WEB
-- Jardín Infantil Manitos de Ángel
--
-- 1. Tabla: publicaciones
-- 2. Políticas RLS (Row Level Security)
-- 3. Bucket de Storage: noticias-imagenes y políticas de acceso
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

-- =====================================================================
-- 1. CREACIÓN DE TABLA: publicaciones
-- =====================================================================

create table if not exists public.publicaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (trim(titulo) != ''),
  contenido text not null check (trim(contenido) != ''),
  imagen_url text,
  autor_id uuid references auth.users(id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clave foránea opcional hacia perfiles para facilitar joins directos
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'publicaciones_autor_id_perfiles_fkey'
  ) then
    alter table public.publicaciones
      add constraint publicaciones_autor_id_perfiles_fkey
      foreign key (autor_id) references public.perfiles(id) on delete set null;
  end if;
end $$;

-- Índices para optimizar consultas en la página de inicio y panel
create index if not exists idx_publicaciones_activo_fecha 
  on public.publicaciones(activo, created_at desc);

create index if not exists idx_publicaciones_autor 
  on public.publicaciones(autor_id);

-- Función y trigger para actualizar automáticamente updated_at
create or replace function public.actualizar_updated_at_publicaciones()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_publicaciones_updated_at on public.publicaciones;
create trigger trigger_publicaciones_updated_at
  before update on public.publicaciones
  for each row
  execute function public.actualizar_updated_at_publicaciones();


-- =====================================================================
-- 2. POLÍTICAS DE SEGURIDAD (RLS) PARA LA TABLA publicaciones
-- =====================================================================

alter table public.publicaciones enable row level security;

-- Función de ayuda: verifica si el usuario autenticado es dirección o admin
create or replace function public.es_admin_o_directora()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol in ('admin', 'organizacion', 'directora')
  );
$$;

grant execute on function public.es_admin_o_directora() to authenticated, anon;

-- POLÍTICA 1: Lectura (SELECT)
-- Los usuarios públicos/anónimos solo ven noticias activas.
-- La dirección y administración pueden ver tanto activas como inactivas.
drop policy if exists "Lectura publica de publicaciones activas" on public.publicaciones;
create policy "Lectura publica de publicaciones activas"
  on public.publicaciones
  for select
  to public
  using (
    activo = true 
    or (auth.role() = 'authenticated' and public.es_admin_o_directora())
  );

-- POLÍTICA 2: Inserción (INSERT)
-- Exclusivo para usuarios autenticados con rol de dirección o administración.
drop policy if exists "Insercion de publicaciones solo direccion y admin" on public.publicaciones;
create policy "Insercion de publicaciones solo direccion y admin"
  on public.publicaciones
  for insert
  to authenticated
  with check (public.es_admin_o_directora());

-- POLÍTICA 3: Modificación (UPDATE)
-- Exclusivo para dirección o administración.
drop policy if exists "Actualizacion de publicaciones solo direccion y admin" on public.publicaciones;
create policy "Actualizacion de publicaciones solo direccion y admin"
  on public.publicaciones
  for update
  to authenticated
  using (public.es_admin_o_directora())
  with check (public.es_admin_o_directora());

-- POLÍTICA 4: Eliminación (DELETE)
-- Exclusivo para dirección o administración.
drop policy if exists "Eliminacion de publicaciones solo direccion y admin" on public.publicaciones;
create policy "Eliminacion de publicaciones solo direccion y admin"
  on public.publicaciones
  for delete
  to authenticated
  using (public.es_admin_o_directora());


-- =====================================================================
-- 3. SUPABASE STORAGE: BUCKET noticias-imagenes Y POLÍTICAS RLS
-- =====================================================================

-- Asegurar creación del bucket público
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'noticias-imagenes',
  'noticias-imagenes',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- POLÍTICA STORAGE 1: Lectura pública sin autenticación requerida
drop policy if exists "Lectura publica de imagenes de noticias" on storage.objects;
create policy "Lectura publica de imagenes de noticias"
  on storage.objects
  for select
  to public
  using (bucket_id = 'noticias-imagenes');

-- POLÍTICA STORAGE 2: Subida restringida a dirección y administración
drop policy if exists "Subida de imagenes de noticias solo personal autorizado" on storage.objects;
create policy "Subida de imagenes de noticias solo personal autorizado"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'noticias-imagenes' 
    and public.es_admin_o_directora()
  );

-- POLÍTICA STORAGE 3: Edición de archivos en el bucket
drop policy if exists "Modificacion de imagenes de noticias solo personal autorizado" on storage.objects;
create policy "Modificacion de imagenes de noticias solo personal autorizado"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'noticias-imagenes' 
    and public.es_admin_o_directora()
  );

-- POLÍTICA STORAGE 4: Eliminación de archivos en el bucket
drop policy if exists "Eliminacion de imagenes de noticias solo personal autorizado" on storage.objects;
create policy "Eliminacion de imagenes de noticias solo personal autorizado"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'noticias-imagenes' 
    and public.es_admin_o_directora()
  );


-- =====================================================================
-- 4. PUBLICACIÓN INICIAL DE BIENVENIDA (Opcional / Demostración)
-- =====================================================================
insert into public.publicaciones (titulo, contenido, activo, imagen_url)
values (
  '¡Bienvenidos al Año Escolar en Manitos de Ángel!',
  'Con mucha alegría abrimos nuestras puertas para recibir a nuestros pequeños párvulos en este nuevo ciclo de aprendizajes, risas, juegos y descubrimientos. Recuerden que a través de este portal las familias pueden consultar la asistencia diaria, registrar licencias médicas y conocer los avances pedagógicos.',
  true,
  null
)
on conflict do nothing;
