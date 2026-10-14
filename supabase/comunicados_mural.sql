-- =====================================================================
-- MÓDULO DE CUADERNO DE COMUNICACIONES / MURAL DIGITAL DE COMUNICADOS
-- Jardín Infantil Manitos de Ángel
-- =====================================================================

-- 1. Tabla de comunicados
create table if not exists public.comunicados (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid references public.niveles(id) on delete cascade, -- null = todo el jardín
  autor_id uuid references public.perfiles(id) on delete set null,
  titulo text not null,
  contenido text not null,
  categoria text not null default 'informativo' check (categoria in ('informativo', 'actividad', 'urgente', 'materiales', 'celebracion')),
  fijado boolean not null default false,
  fecha_evento date,
  adjunto_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de optimización
create index if not exists idx_comunicados_nivel on public.comunicados(nivel_id);
create index if not exists idx_comunicados_activo on public.comunicados(activo);
create index if not exists idx_comunicados_fijado on public.comunicados(fijado desc, created_at desc);

-- 2. Habilitar RLS
alter table public.comunicados enable row level security;

-- Políticas de RLS
drop policy if exists "personal autenticado lee comunicados" on public.comunicados;
create policy "personal autenticado lee comunicados"
  on public.comunicados for select
  to authenticated
  using (true);

drop policy if exists "personal autenticado gestiona comunicados" on public.comunicados;
create policy "personal autenticado gestiona comunicados"
  on public.comunicados for all
  to authenticated
  using (true)
  with check (true);

-- 3. Actualizar función consultar_ficha_apoderado para incorporar los comunicados del nivel y generales
create or replace function public.consultar_ficha_apoderado(p_rut text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
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
  v_entrevistas jsonb;
  v_comunicados jsonb;
begin
  -- Normalizar RUT
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

  -- Calcular asistencia
  select count(*), count(*) filter (where estado = 'presente')
  into v_total_dias, v_dias_presente
  from public.asistencia
  where parvulo_id = v_parvulo.id;

  if v_total_dias > 0 then
    v_porcentaje := round((v_dias_presente::numeric / v_total_dias::numeric) * 100, 1);
  else
    v_porcentaje := 0;
  end if;

  -- Asistencias recientes (últimas 30)
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

  -- Bitácoras pedagógicas
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

  -- Fotos y archivos compartidos
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

  -- Licencias médicas
  select coalesce(jsonb_agg( jsonb_build_object(
    'id', l.id,
    'fecha_emision', l.fecha_emision,
    'fecha_inicio', l.fecha_inicio,
    'fecha_termino', l.fecha_termino,
    'dias_reposo', l.dias_reposo,
    'diagnostico_motivo', l.diagnostico_motivo,
    'drive_file_url', l.drive_file_url,
    'nombre_archivo', l.nombre_archivo,
    'estado', l.estado,
    'observacion_educadora', l.observacion_educadora
  ) order by l.fecha_inicio desc), '[]'::jsonb)
  into v_licencias
  from public.licencias_medicas l
  where l.parvulo_id = v_parvulo.id;

  -- Entrevistas de apoderado y actas
  select coalesce(jsonb_agg( jsonb_build_object(
    'id', e.id,
    'fecha', e.fecha,
    'hora', e.hora,
    'solicitado_por', e.solicitado_por,
    'modalidad', e.modalidad,
    'motivo', e.motivo,
    'estado', e.estado,
    'asistentes', e.asistentes,
    'puntos_tratados', e.puntos_tratados,
    'acuerdos_compromisos', e.acuerdos_compromisos,
    'observaciones', e.observaciones,
    'drive_file_url', e.drive_file_url,
    'nombre_archivo_pdf', e.nombre_archivo_pdf
  ) order by e.fecha desc, e.hora desc), '[]'::jsonb)
  into v_entrevistas
  from public.entrevistas e
  where e.parvulo_id = v_parvulo.id
    and e.visible_apoderado = true;

  -- Comunicados del nivel del párvulo + comunicados para todo el jardín (nivel_id is null)
  select coalesce(jsonb_agg( jsonb_build_object(
    'id', c.id,
    'titulo', c.titulo,
    'contenido', c.contenido,
    'categoria', c.categoria,
    'fijado', c.fijado,
    'fecha_evento', c.fecha_evento,
    'adjunto_url', c.adjunto_url,
    'created_at', c.created_at,
    'es_general', (c.nivel_id is null),
    'nivel_nombre', n.nombre,
    'autor_nombre', pf.nombre_completo
  ) order by c.fijado desc, c.created_at desc), '[]'::jsonb)
  into v_comunicados
  from public.comunicados c
  left join public.niveles n on n.id = c.nivel_id
  left join public.perfiles pf on pf.id = c.autor_id
  where (c.nivel_id = v_parvulo.nivel_id or c.nivel_id is null)
    and c.activo = true;

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
    'licencias', v_licencias,
    'entrevistas', v_entrevistas,
    'comunicados', v_comunicados
  );
end;
$$;

grant execute on function public.consultar_ficha_apoderado(text) to anon, authenticated;
