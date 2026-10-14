"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Search,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import type { Nivel } from "@/lib/types";

export interface ItemEstadisticaParvulo {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  total_dias_mes: number;
  dias_presente_mes: number;
  dias_ausente_mes: number;
  dias_justificado_mes: number;
  porcentaje_mes: number;
  porcentaje_anual: number;
  total_dias_anual: number;
}

interface Props {
  nivelSeleccionado: Nivel;
  mes: number;
  anio: number;
  porcentajeDia: number;
  porcentajeMesNivel: number;
  porcentajeAnualNivel: number;
  totalDiasRegistradosMes: number;
  parvulosStats: ItemEstadisticaParvulo[];
}

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function VistaEstadisticas({
  nivelSeleccionado,
  mes,
  anio,
  porcentajeDia,
  porcentajeMesNivel,
  porcentajeAnualNivel,
  totalDiasRegistradosMes,
  parvulosStats,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroAlerta, setFiltroAlerta] = useState(false);

  // Filtrado de alumnos
  const filtrados = useMemo(() => {
    return parvulosStats.filter((p) => {
      if (filtroAlerta && p.porcentaje_mes >= 75) return false;
      if (!busqueda) return true;
      const q = busqueda.toLowerCase().trim();
      const nombreCompleto = `${p.nombres} ${p.apellidos}`.toLowerCase();
      return nombreCompleto.includes(q) || p.rut.toLowerCase().includes(q);
    });
  }, [parvulosStats, busqueda, filtroAlerta]);

  // Alumnos críticos (< 75%)
  const alumnosCriticos = useMemo(() => {
    return parvulosStats.filter((p) => p.total_dias_mes > 0 && p.porcentaje_mes < 75);
  }, [parvulosStats]);

  // Alumnos con asistencia perfecta (100%)
  const alumnosPerfectos = useMemo(() => {
    return parvulosStats.filter((p) => p.total_dias_mes > 0 && p.porcentaje_mes === 100);
  }, [parvulosStats]);

  return (
    <div className="space-y-6">
      {/* Tarjetas de Resumen General */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Asistencia de Hoy */}
        <div className="tarjeta-vidrio p-5 animate-aparecer">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              Asistencia Hoy
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-cielo-100 text-cielo-600">
              <Calendar className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-tinta">{porcentajeDia}%</p>
          <p className="mt-1 text-xs text-tinta-suave">Promedio del nivel hoy</p>
        </div>

        {/* Asistencia Mensual del Nivel */}
        <div className="tarjeta-vidrio p-5 ring-2 ring-menta-200 animate-aparecer [animation-delay:60ms]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              {NOMBRES_MESES[mes - 1]} {anio}
            </span>
            <span className="grid size-9 place-items-center rounded-2xl bg-menta-100 text-menta-600">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-menta-600">{porcentajeMesNivel}%</p>
          <p className="mt-1 text-xs text-tinta-suave">
            {totalDiasRegistradosMes} días registrados en el mes
          </p>
        </div>

        {/* Asistencia Anual Acumulada */}
        <div className="tarjeta-vidrio p-5 animate-aparecer [animation-delay:120ms]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              Acumulado Anual
            </span>
            <span className="grid size-9 place-items-center rounded-xl bg-sol-100 text-sol-600">
              <Award className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-sol-600">{porcentajeAnualNivel}%</p>
          <p className="mt-1 text-xs text-tinta-suave">Total año {anio}</p>
        </div>

        {/* Párvulos en Alerta */}
        <div
          onClick={() => setFiltroAlerta((prev) => !prev)}
          className={`tarjeta-vidrio cursor-pointer p-5 transition duration-200 hover:scale-[1.02] animate-aparecer [animation-delay:180ms] ${
            alumnosCriticos.length > 0
              ? "ring-2 ring-coral-300 bg-coral-50/40"
              : "ring-1 ring-cielo-100"
          }`}
          title="Haz clic para filtrar u ocultar párvulos en alerta"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              Baja Asistencia (&lt; 75%)
            </span>
            <span
              className={`grid size-9 place-items-center rounded-xl ${
                alumnosCriticos.length > 0
                  ? "bg-coral-100 text-coral-600 animate-pulse"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <AlertTriangle className="size-4" />
            </span>
          </div>
          <p
            className={`mt-3 text-3xl font-extrabold ${
              alumnosCriticos.length > 0 ? "text-coral-600" : "text-tinta"
            }`}
          >
            {alumnosCriticos.length}
          </p>
          <p className="mt-1 text-xs text-tinta-suave">
            {filtroAlerta ? "Mostrando solo alertas (clic para quitar)" : "Clic para ver detalle"}
          </p>
        </div>
      </div>

      {/* Alerta Destacada si hay alumnos en riesgo */}
      {alumnosCriticos.length > 0 && (
        <aside
          role="status"
          aria-label="Atención por baja asistencia"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-coral-50 p-4 ring-1 ring-coral-200 text-coral-700 animate-aparecer"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-coral-100 text-coral-600 shrink-0">
              <TrendingDown className="size-5" />
            </span>
            <div>
              <p className="font-bold text-sm">
                Atención: {alumnosCriticos.length}{" "}
                {alumnosCriticos.length === 1 ? "párvulo presenta" : "párvulos presentan"} asistencia
                crítica inferior al 75% en {NOMBRES_MESES[mes - 1]}
              </p>
              <p className="text-xs opacity-80">
                Se sugiere contactar al apoderado para indagar motivos o acompañar el proceso de reintegro.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFiltroAlerta((prev) => !prev)}
            className="boton-suave text-xs py-2 px-3 border-coral-200 bg-white text-coral-700 hover:bg-coral-100 shrink-0"
          >
            {filtroAlerta ? "Ver todos los párvulos" : "Filtrar estos párvulos"}
          </button>
        </aside>
      )}

      {/* Búsqueda y Filtros de la Tabla */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave/60" />
          <input
            type="text"
            placeholder="Buscar párvulo en estadísticas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="campo pl-12 py-2 text-sm"
          />
        </div>
        <div className="text-xs font-bold text-tinta-suave">
          Mostrando {filtrados.length} de {parvulosStats.length} párvulos
        </div>
      </div>

      {/* Tabla y Gráficos de Progreso Individual */}
      {filtrados.length === 0 ? (
        <div className="tarjeta-vidrio p-12 text-center text-tinta-suave">
          <BarChart3 className="mx-auto mb-2 size-10 text-cielo-400" />
          <h3 className="text-lg font-semibold text-tinta">No hay datos para mostrar</h3>
          <p className="mt-1 text-sm">
            {busqueda || filtroAlerta
              ? "Prueba cambiando o limpiando los filtros."
              : `Aún no se ha registrado asistencia en ${NOMBRES_MESES[mes - 1]} de ${anio}.`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-suave">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cielo-100 bg-cielo-50/60 text-xs font-bold uppercase tracking-wider text-tinta-suave">
                <tr>
                  <th className="px-6 py-4">Párvulo</th>
                  <th className="px-6 py-4">RUT</th>
                  <th className="px-6 py-4">Asistencia {NOMBRES_MESES[mes - 1]}</th>
                  <th className="px-6 py-4 text-center">Desglose Días</th>
                  <th className="px-6 py-4 text-center">Acumulado Anual</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cielo-50">
                {filtrados.map((p) => {
                  const pct = p.porcentaje_mes;
                  const sinDatos = p.total_dias_mes === 0;

                  // Color de barra y etiqueta
                  const colorBarra = sinDatos
                    ? "bg-gray-300"
                    : pct >= 85
                    ? "bg-menta-500"
                    : pct >= 75
                    ? "bg-sol-400"
                    : "bg-coral-500";

                  const badgeEstado = sinDatos ? (
                    <span className="insignia bg-gray-100 text-gray-500">Sin registros</span>
                  ) : pct >= 85 ? (
                    <span className="insignia bg-menta-100 text-menta-700">Excelente</span>
                  ) : pct >= 75 ? (
                    <span className="insignia bg-sol-100 text-sol-700">Regular</span>
                  ) : (
                    <span className="insignia bg-coral-100 text-coral-700 ring-1 ring-coral-300 animate-pulse">
                      Alerta &lt;75%
                    </span>
                  );

                  return (
                    <tr
                      key={p.id}
                      className={`transition hover:bg-cielo-50/30 ${
                        !sinDatos && pct < 75 ? "bg-coral-50/25" : ""
                      }`}
                    >
                      {/* Párvulo */}
                      <td className="px-6 py-4 font-bold text-tinta">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-sol-200 to-cielo-200 font-display text-xs font-bold text-tinta">
                            {p.nombres[0]}
                            {p.apellidos[0]}
                          </span>
                          <div>
                            <p>
                              {p.nombres} {p.apellidos}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* RUT */}
                      <td className="px-6 py-4 font-mono text-xs text-tinta-suave">{p.rut}</td>

                      {/* Asistencia Mensual con Barra Gráfica de Progreso */}
                      <td className="px-6 py-4 min-w-[180px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-tinta">
                              {sinDatos ? "—" : `${pct}%`}
                            </span>
                            <span className="text-[0.7rem] text-tinta-suave">
                              {p.dias_presente_mes} de {p.total_dias_mes} días
                            </span>
                          </div>
                          {/* Barra de Progreso */}
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-cielo-100">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${colorBarra}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Desglose de Días */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className="rounded-lg bg-menta-50 px-2 py-0.5 font-bold text-menta-700"
                            title="Días presente"
                          >
                            {p.dias_presente_mes}P
                          </span>
                          <span
                            className="rounded-lg bg-coral-50 px-2 py-0.5 font-bold text-coral-700"
                            title="Días ausente"
                          >
                            {p.dias_ausente_mes}A
                          </span>
                          <span
                            className="rounded-lg bg-sol-50 px-2 py-0.5 font-bold text-sol-700"
                            title="Días justificados"
                          >
                            {p.dias_justificado_mes}J
                          </span>
                        </div>
                      </td>

                      {/* Acumulado Anual */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-bold text-tinta">
                            {p.total_dias_anual > 0 ? `${p.porcentaje_anual}%` : "—"}
                          </span>
                          {p.total_dias_anual > 0 && (
                            <span className="text-[0.65rem] text-tinta-suave">
                              ({p.total_dias_anual} días en {anio})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 text-center">{badgeEstado}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
