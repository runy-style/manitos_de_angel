-- =====================================================================
-- MÓDULO DE AGENDA DE ENTREVISTAS Y ACTAS EN PDF PARA GOOGLE DRIVE
-- Jardín Infantil Manitos de Ángel
-- =====================================================================

-- 1. Tabla de entrevistas
create table if not exists public.entrevistas (
  id uuid primary key default gen_random_uuid(),
  parvulo_id uuid not null references public.parvulos(id) on delete cascade,
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  educadora_id uuid references public.perfiles(id) on delete set null,
  fecha date not null,
  hora text not null default '10:00',
  solicitado_por text not null default 'educadora' check (solicitado_por in ('educadora', 'apoderado')),
  modalidad text not null default 'presencial' check (modalidad in ('presencial', 'online', 'telefonica')),
  motivo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'realizada', 'cancelada')),
  asistentes text,
  puntos_tratados text,
  acuerdos_compromisos text,
  observaciones text,
  drive_file_id text,
  drive_file_url text,
  nombre_archivo_pdf text,
  acta_firmada_o_cerrada boolean not null default false,
  visible_apoderado boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices de consulta rápida
create index if not exists idx_entrevistas_parvulo on public.entrevistas(parvulo_id);
create index if not exists idx_entrevistas_nivel on public.entrevistas(nivel_id);
create index if not exists idx_entrevistas_fecha on public.entrevistas(fecha desc);
create index if not exists idx_entrevistas_estado on public.entrevistas(estado);

-- 2. Habilitar RLS
alter table public.entrevistas enable row level security;

-- Políticas de RLS
drop policy if exists "personal autenticado lee entrevistas" on public.entrevistas;
create policy "personal autenticado lee entrevistas"
  on public.entrevistas for select
  to authenticated
  using (true);

drop policy if exists "personal autenticado gestiona entrevistas" on public.entrevistas;
create policy "personal autenticado gestiona entrevistas"
  on public.entrevistas for all
  to authenticated
  using (true)
  with check (true);

-- 3. Función RPC segura para que el Apoderado solicite una entrevista usando el RUT
create or replace function public.solicitar_entrevista_apoderado(
  p_rut text,
  p_fecha date,
  p_hora text,
  p_modalidad text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_rut_limpio text;
  v_parvulo record;
  v_entrevista_id uuid;
begin
  -- Limpiar y normalizar el RUT
  v_rut_limpio := upper(replace(replace(trim(p_rut), '.', ''), ' ', ''));

  select id, nivel_id into v_parvulo
  from public.parvulos
  where upper(replace(replace(trim(rut), '.', ''), ' ', '')) = v_rut_limpio
    and activo = true
  limit 1;

  if v_parvulo.id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'No se encontró un alumno activo con el RUT ingresado.'
    );
  end if;

  insert into public.entrevistas (
    parvulo_id,
    nivel_id,
    fecha,
    hora,
    solicitado_por,
    modalidad,
    motivo,
    estado
  ) values (
    v_parvulo.id,
    v_parvulo.nivel_id,
    p_fecha,
    coalesce(nullif(trim(p_hora), ''), '10:00'),
    'apoderado',
    coalesce(nullif(trim(p_modalidad), ''), 'presencial'),
    trim(p_motivo),
    'pendiente'
  )
  returning id into v_entrevista_id;

  return jsonb_build_object(
    'ok', true,
    'mensaje', 'Solicitud de entrevista enviada con éxito a la educadora.',
    'entrevista_id', v_entrevista_id
  );
end;
$$;

grant execute on function public.solicitar_entrevista_apoderado(text, date, text, text, text) to anon, authenticated;

-- 4. Actualizar función consultar_ficha_apoderado para devolver entrevistas y licencias
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
    'entrevistas', v_entrevistas
  );
end;
$$;

grant execute on function public.consultar_ficha_apoderado(text) to anon, authenticated;
