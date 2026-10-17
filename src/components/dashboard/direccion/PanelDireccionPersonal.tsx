"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  UserCheck,
  UserPlus,
  Users,
  Users2,
  X,
  Pencil,
  Check,
  Ban,
  ShieldAlert,
} from "lucide-react";
import ModalFuncionaria from "./ModalFuncionaria";
import ModalRegistrarPermiso from "./ModalRegistrarPermiso";
import ModalRegistrarReemplazo from "./ModalRegistrarReemplazo";
import ModalHistorialAuditoria from "./ModalHistorialAuditoria";
import {
  cambiarEstadoPermiso,
  eliminarFuncionaria,
  eliminarPermiso,
  eliminarReemplazo,
  finalizarReemplazo,
} from "@/app/actions/personal-direccion";
import { formatearRut } from "@/lib/rut";
import {
  ETIQUETAS_CONTRATO,
  ETIQUETAS_ESTAMENTO,
  type EstamentoPersonal,
  type EstadoPermiso,
  type Funcionaria,
  type FuncionariaConSaldo,
  type ReemplazoPersonal,
  type SolicitudPermiso,
  type TipoContratoPersonal,
} from "@/lib/types";

interface Props {
  dotacion: FuncionariaConSaldo[];
  reemplazos: ReemplazoPersonal[];
  permisosRecientes: SolicitudPermiso[];
}

export default function PanelDireccionPersonal({
  dotacion,
  reemplazos,
  permisosRecientes,
}: Props) {
  const [tabActiva, setTabActiva] = useState<"dotacion" | "reemplazos" | "permisos">("dotacion");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstamento, setFiltroEstamento] = useState<string>("todos");
  const [filtroContrato, setFiltroContrato] = useState<string>("todos");

  // Estados de Modales
  const [modalFuncAbierto, setModalFuncAbierto] = useState(false);
  const [funcionariaEditar, setFuncionariaEditar] = useState<Funcionaria | null>(null);

  const [modalPermisoAbierto, setModalPermisoAbierto] = useState(false);
  const [funcionariaParaPermiso, setFuncionariaParaPermiso] = useState<FuncionariaConSaldo | null>(null);

  const [modalReemplazoAbierto, setModalReemplazoAbierto] = useState(false);
  const [reemplazoEditar, setReemplazoEditar] = useState<ReemplazoPersonal | null>(null);

  const [modalAuditoriaAbierto, setModalAuditoriaAbierto] = useState(false);
  const [funcionariaAuditoria, setFuncionariaAuditoria] = useState<FuncionariaConSaldo | null>(null);

  const [isPending, startTransition] = useTransition();

  // Fecha de hoy en formato YYYY-MM-DD
  const hoyStr = new Date().toISOString().slice(0, 10);

  // Estadísticas KPI
  const stats = useMemo(() => {
    const activas = dotacion.filter((f) => f.activo);
    const porEstamento: Record<string, number> = {};
    let totalDiasGastados = 0;

    for (const f of activas) {
      porEstamento[f.estamento_rol] = (porEstamento[f.estamento_rol] || 0) + 1;
      totalDiasGastados += Number(f.dias_utilizados || 0);
    }

    const reemplazosHoy = reemplazos.filter(
      (r) => r.activo && r.fecha_inicio <= hoyStr && r.fecha_termino >= hoyStr,
    ).length;

    return {
      totalActivas: activas.length,
      educadoras: porEstamento["educadora"] || 0,
      tecnicos: porEstamento["tecnico_parvulos"] || 0,
      auxiliares: porEstamento["auxiliar"] || 0,
      cocina: porEstamento["cocinera"] || 0,
      otras: (porEstamento["directora"] || 0) + (porEstamento["administrativo"] || 0),
      reemplazosHoy,
      totalDiasGastados,
    };
  }, [dotacion, reemplazos, hoyStr]);

  // Dotación Filtrada
  const dotacionFiltrada = useMemo(() => {
    return dotacion.filter((f) => {
      if (filtroEstamento !== "todos" && f.estamento_rol !== filtroEstamento) return false;
      if (filtroContrato !== "todos" && f.tipo_contrato !== filtroContrato) return false;

      if (!busqueda) return true;
      const q = busqueda.toLowerCase().trim();
      const nombreCompleto = `${f.nombres} ${f.apellidos}`.toLowerCase();
      const rutLimpio = f.rut.toLowerCase().replace(/[^0-9k]/g, "");
      const busquedaLimpia = q.replace(/[^0-9k]/g, "");

      return (
        nombreCompleto.includes(q) ||
        (busquedaLimpia && rutLimpio.includes(busquedaLimpia)) ||
        (f.correo && f.correo.toLowerCase().includes(q))
      );
    });
  }, [dotacion, busqueda, filtroEstamento, filtroContrato]);

  // Handlers
  function abrirNuevoPermiso(func?: FuncionariaConSaldo) {
    setFuncionariaParaPermiso(func ?? null);
    setModalPermisoAbierto(true);
  }

  function abrirAuditoria(func: FuncionariaConSaldo) {
    setFuncionariaAuditoria(func);
    setModalAuditoriaAbierto(true);
  }

  function abrirEditarFuncionaria(func: Funcionaria) {
    setFuncionariaEditar(func);
    setModalFuncAbierto(true);
  }

  function manejarEliminarFuncionaria(id: string, nombre: string) {
    if (!confirm(`¿Estás segura de eliminar a ${nombre} de la dotación?`)) return;
    startTransition(async () => {
      await eliminarFuncionaria(id);
    });
  }

  function manejarFinalizarReemplazo(id: string) {
    if (!confirm("¿Deseas marcar este reemplazo como concluido hoy?")) return;
    startTransition(async () => {
      await finalizarReemplazo(id);
    });
  }

  function manejarEliminarReemplazo(id: string) {
    if (!confirm("¿Deseas eliminar este registro de reemplazo?")) return;
    startTransition(async () => {
      await eliminarReemplazo(id);
    });
  }

  function manejarCambiarEstadoPermiso(id: string, estado: EstadoPermiso) {
    startTransition(async () => {
      await cambiarEstadoPermiso(id, estado);
    });
  }

  function manejarEliminarPermiso(id: string) {
    if (!confirm("¿Deseas anular este permiso administrativo? Los días volverán al saldo.")) return;
    startTransition(async () => {
      await eliminarPermiso(id);
    });
  }

  return (
    <div className="space-y-6 animate-aparecer">
      {/* 1. Header Institucional */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cielo-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="insignia bg-coral-50 text-coral-700 border border-coral-200">
              <ShieldAlert className="size-3" /> Exclusivo Dirección
            </span>
            <span className="text-xs text-tinta-suave">
              Año Escolar {new Date().getFullYear()}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-tinta">
            Control de Dotación, Reemplazos y Permisos
          </h1>
          <p className="text-sm text-tinta-suave mt-1">
            Gestión centralizada del personal del jardín, cobertura de ausencias y seguimiento del saldo de días administrativos.
          </p>
        </div>

        {/* Botones de acción principales */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => abrirNuevoPermiso()}
            className="boton-suave text-xs py-2.5 px-3.5 flex items-center gap-1.5 border border-amber-200 hover:border-amber-300 hover:bg-amber-50"
          >
            <Calendar className="size-4 text-amber-600" /> Registrar Permiso
          </button>

          <button
            type="button"
            onClick={() => {
              setReemplazoEditar(null);
              setModalReemplazoAbierto(true);
            }}
            className="boton-suave text-xs py-2.5 px-3.5 flex items-center gap-1.5 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50"
          >
            <Users2 className="size-4 text-indigo-600" /> Registrar Reemplazo
          </button>

          <button
            type="button"
            onClick={() => {
              setFuncionariaEditar(null);
              setModalFuncAbierto(true);
            }}
            className="boton-primario text-xs py-2.5 px-4 flex items-center gap-1.5"
          >
            <UserPlus className="size-4" /> Nueva Funcionaria
          </button>
        </div>
      </header>

      {/* 2. Tarjetas KPI de Resumen */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dotación */}
        <div className="tarjeta-vidrio p-4 sm:p-5 flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cielo-100 text-cielo-600">
            <Users className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-tinta-suave font-semibold">Dotación Activa</p>
            <p className="text-2xl font-bold font-display text-tinta">{stats.totalActivas}</p>
            <p className="text-[0.65rem] text-tinta-suave truncate mt-0.5">
              {stats.educadoras} Edu · {stats.tecnicos} Téc · {stats.auxiliares} Aux · {stats.cocina} Coc
            </p>
          </div>
        </div>

        {/* Reemplazos Vigentes Hoy */}
        <div className="tarjeta-vidrio p-4 sm:p-5 flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
            <Users2 className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-tinta-suave font-semibold">Reemplazos Hoy</p>
            <p className="text-2xl font-bold font-display text-tinta">{stats.reemplazosHoy}</p>
            <p className="text-[0.65rem] text-tinta-suave truncate mt-0.5">
              {stats.reemplazosHoy > 0 ? "Personal de reemplazo en sala" : "Sin reemplazos activos hoy"}
            </p>
          </div>
        </div>

        {/* Permisos Utilizados */}
        <div className="tarjeta-vidrio p-4 sm:p-5 flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600">
            <Calendar className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-tinta-suave font-semibold">Días Tomados</p>
            <p className="text-2xl font-bold font-display text-tinta font-mono">
              {stats.totalDiasGastados.toFixed(1)}
            </p>
            <p className="text-[0.65rem] text-tinta-suave truncate mt-0.5">
              Días administrativos descontados
            </p>
          </div>
        </div>

        {/* Cobertura / Estado Institucional */}
        <div className="tarjeta-vidrio p-4 sm:p-5 flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-menta-100 text-menta-600">
            <CheckCircle2 className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-tinta-suave font-semibold">Tope Anual</p>
            <p className="text-2xl font-bold font-display text-tinta">6.0 días</p>
            <p className="text-[0.65rem] text-tinta-suave truncate mt-0.5">
              Cupo estándar por funcionaria
            </p>
          </div>
        </div>
      </section>

      {/* 3. Selector de Pestañas (Tabs) */}
      <div className="flex items-center gap-2 border-b border-cielo-100 pb-2">
        <button
          type="button"
          onClick={() => setTabActiva("dotacion")}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            tabActiva === "dotacion"
              ? "bg-cielo-500 text-white shadow-sm"
              : "text-tinta-suave hover:bg-cielo-50 hover:text-tinta"
          }`}
        >
          <UserCheck className="size-4" /> Dotación y Saldos de Permisos ({dotacion.length})
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("reemplazos")}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            tabActiva === "reemplazos"
              ? "bg-cielo-500 text-white shadow-sm"
              : "text-tinta-suave hover:bg-cielo-50 hover:text-tinta"
          }`}
        >
          <Users2 className="size-4" /> Reemplazos y Coberturas ({reemplazos.length})
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("permisos")}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            tabActiva === "permisos"
              ? "bg-cielo-500 text-white shadow-sm"
              : "text-tinta-suave hover:bg-cielo-50 hover:text-tinta"
          }`}
        >
          <Calendar className="size-4" /> Historial de Permisos del Año ({permisosRecientes.length})
        </button>
      </div>

      {/* =====================================================================
          PESTAÑA 1: DOTACIÓN Y SALDOS DE PERMISOS
         ===================================================================== */}
      {tabActiva === "dotacion" && (
        <div className="space-y-4">
          {/* Filtros y Buscador */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cielo-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar funcionaria por nombre, apellido o RUT..."
                className="entrada pl-10 text-xs sm:text-sm py-2"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroEstamento}
                onChange={(e) => setFiltroEstamento(e.target.value)}
                className="entrada text-xs py-2"
              >
                <option value="todos">Todos los estamentos</option>
                {(Object.keys(ETIQUETAS_ESTAMENTO) as EstamentoPersonal[]).map((k) => (
                  <option key={k} value={k}>
                    {ETIQUETAS_ESTAMENTO[k]}
                  </option>
                ))}
              </select>

              <select
                value={filtroContrato}
                onChange={(e) => setFiltroContrato(e.target.value)}
                className="entrada text-xs py-2"
              >
                <option value="todos">Todos los contratos</option>
                <option value="planta">Planta</option>
                <option value="contrata">Contrata</option>
                <option value="reemplazo">Reemplazo</option>
              </select>
            </div>
          </div>

          {/* Tabla de Dotación */}
          <div className="tarjeta-vidrio overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-cielo-50/70 border-b border-cielo-100 text-[0.7rem] uppercase tracking-wider text-tinta font-bold">
                  <tr>
                    <th className="py-3 px-4">Funcionaria</th>
                    <th className="py-3 px-4">Estamento / Contrato</th>
                    <th className="py-3 px-4">Semáforo de Saldo Anual</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cielo-100/60 bg-white">
                  {dotacionFiltrada.map((f) => {
                    const saldoRestante = Number(f.dias_restantes);
                    const saldoUtilizado = Number(f.dias_utilizados);
                    const saldoTotal = Number(f.total_dias_asignados);

                    // Colores de Semáforo
                    const colorSemaforo =
                      saldoRestante >= 3
                        ? "bg-menta-500"
                        : saldoRestante > 0.5
                        ? "bg-amber-500"
                        : "bg-coral-500";

                    const badgeSemaforo =
                      saldoRestante >= 3
                        ? "bg-menta-100 text-menta-800 border-menta-200"
                        : saldoRestante > 0.5
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-coral-100 text-coral-800 border-coral-200";

                    return (
                      <tr key={f.id} className="hover:bg-cielo-50/30 transition">
                        {/* Nombre y RUT */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-tinta text-sm">
                            {f.apellidos}, {f.nombres}
                          </p>
                          <p className="text-xs text-tinta-suave font-mono">
                            {formatearRut(f.rut)}
                            {f.telefono && ` · ${f.telefono}`}
                          </p>
                        </td>

                        {/* Estamento y Contrato */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-tinta block">
                            {ETIQUETAS_ESTAMENTO[f.estamento_rol]}
                          </span>
                          <span className="text-[0.7rem] text-tinta-suave uppercase font-mono">
                            Contrato {ETIQUETAS_CONTRATO[f.tipo_contrato]}
                          </span>
                        </td>

                        {/* Semáforo de Saldo */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className={`px-2 py-0.5 rounded-full text-[0.7rem] font-bold border ${badgeSemaforo}`}>
                                {saldoRestante.toFixed(1)} días disponibles
                              </span>
                              <span className="text-tinta-suave text-[0.7rem]">
                                Gastados: <b>{saldoUtilizado.toFixed(1)}</b> / {saldoTotal.toFixed(1)}
                              </span>
                            </div>
                            <div className="w-full bg-cielo-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${colorSemaforo} transition-all duration-300`}
                                style={{
                                  width: `${Math.min(100, (saldoUtilizado / saldoTotal) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 text-center">
                          {f.activo ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold bg-menta-100 text-menta-700">
                              Activa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold bg-coral-100 text-coral-700">
                              Inactiva
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => abrirNuevoPermiso(f)}
                              className="boton-suave text-xs py-1.5 px-2.5 flex items-center gap-1 border border-amber-200 hover:bg-amber-50"
                              title="Registrar permiso administrativo"
                            >
                              <Calendar className="size-3.5 text-amber-600" /> Permiso
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirAuditoria(f)}
                              className="p-1.5 rounded-xl text-tinta-suave hover:bg-cielo-50 hover:text-cielo-600 transition"
                              title="Ver ficha de auditoría e historial"
                            >
                              <FileText className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirEditarFuncionaria(f)}
                              className="p-1.5 rounded-xl text-tinta-suave hover:bg-cielo-50 hover:text-tinta transition"
                              title="Editar datos de la funcionaria"
                            >
                              <Pencil className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => manejarEliminarFuncionaria(f.id, `${f.nombres} ${f.apellidos}`)}
                              className="p-1.5 rounded-xl text-tinta-suave hover:bg-coral-50 hover:text-coral-600 transition"
                              title="Eliminar de la dotación"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {dotacionFiltrada.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-tinta-suave text-sm">
                        No se encontraron funcionarias con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 2: REEMPLAZOS Y COBERTURAS
         ===================================================================== */}
      {tabActiva === "reemplazos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-tinta flex items-center gap-2">
              <Users2 className="size-4 text-indigo-500" /> Cobertura de Ausencias y Reemplazos
            </h3>
            <button
              type="button"
              onClick={() => {
                setReemplazoEditar(null);
                setModalReemplazoAbierto(true);
              }}
              className="boton-primario text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <Plus className="size-3.5" /> Registrar Reemplazo
            </button>
          </div>

          <div className="tarjeta-vidrio overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-cielo-50/70 border-b border-cielo-100 text-[0.7rem] uppercase tracking-wider text-tinta font-bold">
                  <tr>
                    <th className="py-3 px-4">Titular Ausente</th>
                    <th className="py-3 px-4">Reemplazante</th>
                    <th className="py-3 px-4">Período</th>
                    <th className="py-3 px-4">Motivo / Notas</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cielo-100/60 bg-white">
                  {reemplazos.map((r) => {
                    const esVigenteHoy = r.activo && r.fecha_inicio <= hoyStr && r.fecha_termino >= hoyStr;

                    return (
                      <tr key={r.id} className="hover:bg-cielo-50/30 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-tinta">
                            {r.titular ? `${r.titular.apellidos}, ${r.titular.nombres}` : "Titular no vinculada"}
                          </p>
                          {r.titular && (
                            <span className="text-[0.7rem] text-tinta-suave">
                              {ETIQUETAS_ESTAMENTO[r.titular.estamento_rol]}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-tinta">
                          {r.reemplazante_nombre}
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono text-tinta-suave">
                          {r.fecha_inicio} al {r.fecha_termino}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <span className="font-semibold text-tinta block">{r.motivo}</span>
                          {r.observaciones && (
                            <span className="text-[0.7rem] text-tinta-suave truncate block">
                              {r.observaciones}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {esVigenteHoy ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold bg-menta-100 text-menta-800 border border-menta-200">
                              VIGENTE HOY
                            </span>
                          ) : r.activo ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold bg-cielo-100 text-cielo-800">
                              PROGRAMADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold bg-slate-100 text-slate-600">
                              CONCLUIDO
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.activo && (
                              <button
                                type="button"
                                onClick={() => manejarFinalizarReemplazo(r.id)}
                                className="boton-suave text-xs py-1 px-2 text-[0.7rem]"
                                title="Marcar como finalizado hoy"
                              >
                                Finalizar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setReemplazoEditar(r);
                                setModalReemplazoAbierto(true);
                              }}
                              className="p-1.5 rounded-xl text-tinta-suave hover:bg-cielo-50 transition"
                              title="Editar reemplazo"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => manejarEliminarReemplazo(r.id)}
                              className="p-1.5 rounded-xl text-tinta-suave hover:bg-coral-50 hover:text-coral-600 transition"
                              title="Eliminar reemplazo"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {reemplazos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-tinta-suave text-sm">
                        No hay registros de reemplazos ingresados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PESTAÑA 3: HISTORIAL GENERAL DE PERMISOS
         ===================================================================== */}
      {tabActiva === "permisos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-tinta flex items-center gap-2">
              <Calendar className="size-4 text-amber-500" /> Registro de Solicitudes y Permisos Administrativos
            </h3>
            <button
              type="button"
              onClick={() => abrirNuevoPermiso()}
              className="boton-primario text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <Plus className="size-3.5" /> Registrar Nuevo Permiso
            </button>
          </div>

          <div className="tarjeta-vidrio overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-cielo-50/70 border-b border-cielo-100 text-[0.7rem] uppercase tracking-wider text-tinta font-bold">
                  <tr>
                    <th className="py-3 px-4">Funcionaria</th>
                    <th className="py-3 px-4">Fecha Solicitada</th>
                    <th className="py-3 px-4 text-center">Días</th>
                    <th className="py-3 px-4">Motivo / Notas</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cielo-100/60 bg-white">
                  {permisosRecientes.map((p) => (
                    <tr key={p.id} className="hover:bg-cielo-50/30 transition">
                      <td className="py-3.5 px-4 font-bold text-tinta">
                        {p.funcionaria
                          ? `${p.funcionaria.apellidos}, ${p.funcionaria.nombres}`
                          : "Funcionaria registrada"}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-tinta">
                        {p.fecha_solicitada}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-sm">
                        {Number(p.dias_solicitados).toFixed(1)}
                      </td>

                      <td className="py-3.5 px-4 text-tinta-suave max-w-xs truncate">
                        {p.observaciones || "Sin observaciones"}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold ${
                            p.estado === "aprobado"
                              ? "bg-menta-100 text-menta-800"
                              : p.estado === "pendiente"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-coral-100 text-coral-800"
                          }`}
                        >
                          {p.estado.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.estado === "pendiente" && (
                            <button
                              type="button"
                              onClick={() => manejarCambiarEstadoPermiso(p.id, "aprobado")}
                              className="p-1.5 rounded-xl text-menta-600 hover:bg-menta-50 transition"
                              title="Aprobar y descontar días"
                            >
                              <Check className="size-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => manejarEliminarPermiso(p.id)}
                            className="p-1.5 rounded-xl text-tinta-suave hover:bg-coral-50 hover:text-coral-600 transition"
                            title="Eliminar permiso"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {permisosRecientes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-tinta-suave text-sm">
                        No hay permisos administrativos registrados en el período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      <ModalFuncionaria
        abierto={modalFuncAbierto}
        alCerrar={() => setModalFuncAbierto(false)}
        funcionariaEditar={funcionariaEditar}
      />

      <ModalRegistrarPermiso
        abierto={modalPermisoAbierto}
        alCerrar={() => setModalPermisoAbierto(false)}
        dotacion={dotacion}
        funcionariaSeleccionada={funcionariaParaPermiso}
      />

      <ModalRegistrarReemplazo
        abierto={modalReemplazoAbierto}
        alCerrar={() => setModalReemplazoAbierto(false)}
        dotacion={dotacion}
        reemplazoEditar={reemplazoEditar}
      />

      <ModalHistorialAuditoria
        abierto={modalAuditoriaAbierto}
        alCerrar={() => setModalAuditoriaAbierto(false)}
        funcionaria={funcionariaAuditoria}
        alActualizar={() => {
          // No-op or trigger re-render
        }}
      />
    </div>
  );
}
