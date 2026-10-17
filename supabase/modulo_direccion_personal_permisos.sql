-- =====================================================================
-- MÓDULO EXCLUSIVO DE DIRECCIÓN: PERSONAL, REEMPLAZOS Y PERMISOS ADMINISTRATIVOS
-- Jardín Infantil y Sala Cuna Manitos de Ángel
--
-- PROPÓSITO:
--   Centraliza el control de la dotación completa de funcionarias,
--   gestión de reemplazos vigentes e históricos, y seguimiento estricto
--   del saldo de permisos administrativos anuales con semáforos y
--   validación de sobregiro.
--
-- SEGURIDAD:
--   Acceso restringido EXCLUSIVAMENTE a Dirección ('organizacion') y
--   Administración ('admin') vía Row Level Security (RLS).
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

BEGIN;

-- =====================================================================
-- 1. TABLA: PERSONAL / FUNCIONARIAS
-- =====================================================================
create table if not exists public.personal (
  id uuid primary key default gen_random_uuid(),
  rut text not null unique,
  nombres text not null,
  apellidos text not null,
  correo text,
  telefono text,
  estamento_rol text not null check (
    estamento_rol in ('educadora', 'tecnico_parvulos', 'auxiliar', 'cocinera', 'directora', 'administrativo')
  ),
  tipo_contrato text not null default 'planta' check (
    tipo_contrato in ('planta', 'contrata', 'reemplazo')
  ),
  activo boolean not null default true,
  fecha_ingreso date not null default current_date,
  dias_permiso_anual numeric(3,1) not null default 6.0 check (dias_permiso_anual >= 0),
  perfil_id uuid references public.perfiles(id) on delete set null,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_personal_estamento on public.personal(estamento_rol);
create index if not exists idx_personal_activo on public.personal(activo);
create index if not exists idx_personal_rut on public.personal(rut);

-- =====================================================================
-- 2. TABLA: REEMPLAZOS DE PERSONAL
-- =====================================================================
create table if not exists public.reemplazos (
  id uuid primary key default gen_random_uuid(),
  titular_id uuid not null references public.personal(id) on delete cascade,
  reemplazante_nombre text not null,
  reemplazante_id uuid references public.personal(id) on delete set null,
  motivo text not null, -- 'Licencia médica', 'Permiso administrativo', 'Vacaciones', 'Capacitación', 'Otro'
  fecha_inicio date not null,
  fecha_termino date not null,
  observaciones text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_fechas_reemplazo check (fecha_termino >= fecha_inicio)
);

create index if not exists idx_reemplazos_titular on public.reemplazos(titular_id);
create index if not exists idx_reemplazos_activo on public.reemplazos(activo);
create index if not exists idx_reemplazos_fechas on public.reemplazos(fecha_inicio, fecha_termino);

-- =====================================================================
-- 3. TABLA: SOLICITUDES Y REGISTRO DE PERMISOS ADMINISTRATIVOS
-- =====================================================================
create table if not exists public.solicitudes_permisos (
  id uuid primary key default gen_random_uuid(),
  funcionaria_id uuid not null references public.personal(id) on delete cascade,
  fecha_solicitada date not null,
  fecha_termino date, -- opcional si abarca más de un día consecutivo
  dias_solicitados numeric(3,1) not null check (dias_solicitados > 0), -- ej: 0.5 (medio día), 1.0 (día completo)
  estado text not null default 'aprobado' check (
    estado in ('pendiente', 'aprobado', 'rechazado')
  ),
  periodo_ano int not null default extract(year from current_date)::int,
  observaciones text,
  registrado_por uuid references public.perfiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_permisos_funcionaria on public.solicitudes_permisos(funcionaria_id);
create index if not exists idx_permisos_periodo on public.solicitudes_permisos(periodo_ano);
create index if not exists idx_permisos_estado on public.solicitudes_permisos(estado);

-- =====================================================================
-- 4. VISTA: SALDOS DE DÍAS ADMINISTRATIVOS EN TIEMPO REAL
-- =====================================================================
create or replace view public.vista_saldos_permisos as
select
  p.id as id,
  p.id as funcionaria_id,
  p.rut,
  p.nombres,
  p.apellidos,
  trim(p.nombres || ' ' || p.apellidos) as nombre_completo,
  p.correo,
  p.telefono,
  p.estamento_rol,
  p.tipo_contrato,
  p.activo,
  p.fecha_ingreso,
  p.dias_permiso_anual,
  p.dias_permiso_anual as total_dias_asignados,
  p.perfil_id,
  p.observaciones,
  p.created_at,
  p.updated_at,
  extract(year from current_date)::int as periodo_ano,
  coalesce(
    (
      select sum(sp.dias_solicitados)
      from public.solicitudes_permisos sp
      where sp.funcionaria_id = p.id
        and sp.estado = 'aprobado'
        and sp.periodo_ano = extract(year from current_date)::int
    ), 0.0
  ) as dias_utilizados,
  coalesce(
    (
      select sum(sp.dias_solicitados)
      from public.solicitudes_permisos sp
      where sp.funcionaria_id = p.id
        and sp.estado = 'pendiente'
        and sp.periodo_ano = extract(year from current_date)::int
    ), 0.0
  ) as dias_pendientes,
  greatest(
    0.0,
    p.dias_permiso_anual - coalesce(
      (
        select sum(sp.dias_solicitados)
        from public.solicitudes_permisos sp
        where sp.funcionaria_id = p.id
          and sp.estado = 'aprobado'
          and sp.periodo_ano = extract(year from current_date)::int
      ), 0.0
    )
  ) as dias_restantes
from public.personal p;

-- =====================================================================
-- 5. TRIGGER DE VALIDACIÓN: PREVENIR SOBREGIRO DE DÍAS (SALDOS NEGATIVOS)
-- =====================================================================
create or replace function public.validar_saldo_permiso()
returns trigger
language plpgsql
as $$
declare
  v_total_asignado numeric(3,1);
  v_dias_ya_usados numeric(3,1);
  v_saldo_disponible numeric(3,1);
begin
  -- Solo se valida el saldo si el permiso está o pasa a estado 'aprobado'
  if new.estado = 'aprobado' then
    select coalesce(dias_permiso_anual, 6.0) into v_total_asignado
    from public.personal
    where id = new.funcionaria_id;

    if v_total_asignado is null then
      raise exception 'La funcionaria especificada no existe en la dotación.';
    end if;

    select coalesce(sum(dias_solicitados), 0.0) into v_dias_ya_usados
    from public.solicitudes_permisos
    where funcionaria_id = new.funcionaria_id
      and estado = 'aprobado'
      and periodo_ano = new.periodo_ano
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    v_saldo_disponible := v_total_asignado - v_dias_ya_usados;

    if new.dias_solicitados > v_saldo_disponible then
      raise exception 'Saldo insuficiente: la funcionaria dispone de % días restantes en el año %, y se intentan descontar % días.',
        v_saldo_disponible, new.periodo_ano, new.dias_solicitados;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_saldo_permiso on public.solicitudes_permisos;
create trigger trg_validar_saldo_permiso
  before insert or update on public.solicitudes_permisos
  for each row
  execute function public.validar_saldo_permiso();

-- =====================================================================
-- 6. SEGURIDAD Y PERMISOS: ROW LEVEL SECURITY (RLS)
-- =====================================================================
alter table public.personal enable row level security;
alter table public.reemplazos enable row level security;
alter table public.solicitudes_permisos enable row level security;

-- Función de conveniencia para chequear rol de Dirección o Admin
create or replace function public.es_direccion_o_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid()
      and p.rol in ('organizacion', 'admin')
  );
$$;

-- Políticas para personal: SOLO dirección y admin tienen acceso total
drop policy if exists "direccion gestiona personal" on public.personal;
create policy "direccion gestiona personal" on public.personal
  for all to authenticated
  using (public.es_direccion_o_admin())
  with check (public.es_direccion_o_admin());

-- Políticas para reemplazos: SOLO dirección y admin tienen acceso total
drop policy if exists "direccion gestiona reemplazos" on public.reemplazos;
create policy "direccion gestiona reemplazos" on public.reemplazos
  for all to authenticated
  using (public.es_direccion_o_admin())
  with check (public.es_direccion_o_admin());

-- Políticas para permisos: SOLO dirección y admin tienen acceso total
drop policy if exists "direccion gestiona permisos" on public.solicitudes_permisos;
create policy "direccion gestiona permisos" on public.solicitudes_permisos
  for all to authenticated
  using (public.es_direccion_o_admin())
  with check (public.es_direccion_o_admin());

COMMIT;
