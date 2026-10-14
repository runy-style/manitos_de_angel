-- =====================================================================
-- MÓDULO DE SEGURIDAD Y PRIVACIDAD CON PIN DE 4 DÍGITOS PARA APODERADOS
-- Jardín Infantil Manitos de Ángel
-- =====================================================================

-- 1. Asegurar columna pin_apoderado en la tabla parvulos
alter table public.parvulos
  add column if not exists pin_apoderado text default null;

-- 2. Función segura para que el apoderado cree o cambie su PIN de 4 dígitos
create or replace function public.establecer_pin_apoderado(
  p_rut text,
  p_pin_actual text,
  p_nuevo_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_rut_limpio text;
  v_parvulo record;
begin
  v_rut_limpio := upper(replace(replace(trim(p_rut), '.', ''), ' ', ''));

  select id, pin_apoderado into v_parvulo
  from public.parvulos
  where upper(replace(replace(trim(rut), '.', ''), ' ', '')) = v_rut_limpio
    and activo = true
  limit 1;

  if v_parvulo.id is null then
    return jsonb_build_object('ok', false, 'error', 'Párvulo no encontrado.');
  end if;

  -- Validar formato del nuevo PIN (exactamente 4 dígitos numéricos o vacío para borrarlo)
  if p_nuevo_pin is not null and trim(p_nuevo_pin) != '' and not (trim(p_nuevo_pin) ~ '^[0-9]{4}$') then
    return jsonb_build_object('ok', false, 'error', 'El PIN debe contener exactamente 4 dígitos numéricos.');
  end if;

  -- Si ya tenía PIN asignado, verificar el PIN actual
  if v_parvulo.pin_apoderado is not null and trim(v_parvulo.pin_apoderado) != '' then
    if trim(coalesce(p_pin_actual, '')) != trim(v_parvulo.pin_apoderado) then
      return jsonb_build_object('ok', false, 'error', 'El PIN actual ingresado no coincide.');
    end if;
  end if;

  -- Actualizar PIN
  update public.parvulos
  set pin_apoderado = nullif(trim(p_nuevo_pin), '')
  where id = v_parvulo.id;

  return jsonb_build_object(
    'ok', true,
    'mensaje', case
      when p_nuevo_pin is null or trim(p_nuevo_pin) = '' then 'PIN de seguridad eliminado.'
      else 'PIN de seguridad establecido exitosamente.'
    end
  );
end;
$$;

grant execute on function public.establecer_pin_apoderado(text, text, text) to anon, authenticated;

-- 3. Función para que educadoras y administración restablezcan el PIN de un alumno
create or replace function public.restablecer_pin_educadora(
  p_parvulo_id uuid,
  p_nuevo_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if p_nuevo_pin is not null and trim(p_nuevo_pin) != '' and not (trim(p_nuevo_pin) ~ '^[0-9]{4}$') then
    return jsonb_build_object('ok', false, 'error', 'El PIN debe ser de 4 dígitos numéricos.');
  end if;

  update public.parvulos
  set pin_apoderado = nullif(trim(p_nuevo_pin), '')
  where id = p_parvulo_id;

  return jsonb_build_object('ok', true, 'mensaje', 'PIN actualizado correctamente.');
end;
$$;

grant execute on function public.restablecer_pin_educadora(uuid, text) to authenticated;

-- 4. Actualizar función consultar_ficha_apoderado con validación de PIN
-- Eliminamos primero la versión de 1 solo parámetro para evitar conflicto de sobrecarga
drop function if exists public.consultar_ficha_apoderado(text);

create or replace function public.consultar_ficha_apoderado(
  p_rut text,
  p_pin text default null
)
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
  v_tiene_pin boolean;
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
    return jsonb_build_object(
      'encontrado', false,
      'mensaje', 'No se encontró un párvulo activo con el RUT indicado.'
    );
  end if;

  v_tiene_pin := (v_parvulo.pin_apoderado is not null and trim(v_parvulo.pin_apoderado) != '');

  -- Validar PIN si el párvulo lo tiene configurado
  if v_tiene_pin then
    -- Si no envió PIN
    if p_pin is null or trim(p_pin) = '' then
      return jsonb_build_object(
        'encontrado', false,
        'requiere_pin', true,
        'parvulo_nombre', v_parvulo.nombres || ' ' || v_parvulo.apellidos,
        'rut', v_parvulo.rut,
        'mensaje', 'Esta ficha cuenta con PIN de seguridad. Ingresa los 4 dígitos para acceder.'
      );
    end if;

    -- Si envió PIN pero no coincide
    if trim(p_pin) != trim(v_parvulo.pin_apoderado) then
      return jsonb_build_object(
        'encontrado', false,
        'requiere_pin', true,
        'pin_incorrecto', true,
        'parvulo_nombre', v_parvulo.nombres || ' ' || v_parvulo.apellidos,
        'rut', v_parvulo.rut,
        'mensaje', 'El PIN ingresado es incorrecto. Verifica los 4 dígitos o consulta con la educadora de tu nivel.'
      );
    end if;
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
      'drive_folder_url', v_parvulo.drive_folder_url,
      'tiene_pin', v_tiene_pin
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

grant execute on function public.consultar_ficha_apoderado(text, text) to anon, authenticated;
