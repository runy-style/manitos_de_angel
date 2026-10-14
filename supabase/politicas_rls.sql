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

-- 3. Lectura para personal con perfil (idempotente)
drop policy if exists "personal lee niveles" on public.niveles;
create policy "personal lee niveles" on public.niveles
  for select to authenticated using (public.mi_rol() is not null);

drop policy if exists "personal lee perfiles" on public.perfiles;
create policy "personal lee perfiles" on public.perfiles
  for select to authenticated using (id = auth.uid() or public.mi_rol() is not null);

drop policy if exists "admin gestiona perfiles" on public.perfiles;
create policy "admin gestiona perfiles" on public.perfiles
  for all to authenticated
  using (public.mi_rol() = 'admin')
  with check (public.mi_rol() = 'admin');

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

-- 4. Escritura solo para la educadora del nivel o admin
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

-- 5. Función RPC Segura para Consulta del Apoderado mediante RUT del Párvulo
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
begin
  -- Normalizar RUT (quitar puntos y espacios, pasar a mayúsculas)
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

  -- Calcular estadísticas de asistencia
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

  -- Observaciones de bitácora visibles para el apoderado
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

  -- Archivos y fotos compartidos con el apoderado
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
    'archivos', v_archivos
  );
end;
$$;

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
