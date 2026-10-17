"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Printer,
  Trash2,
  Users2,
  X,
  AlertCircle,
} from "lucide-react";
import {
  eliminarPermiso,
  obtenerHistorialAuditoria,
} from "@/app/actions/personal-direccion";
import { formatearRut } from "@/lib/rut";
import {
  ETIQUETAS_CONTRATO,
  ETIQUETAS_ESTAMENTO,
  type FuncionariaConSaldo,
  type ReemplazoPersonal,
  type SolicitudPermiso,
} from "@/lib/types";

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  funcionaria: FuncionariaConSaldo | null;
  alActualizar: () => void;
}

export default function ModalHistorialAuditoria({
  abierto,
  alCerrar,
  funcionaria,
  alActualizar,
}: Props) {
  const [cargando, setCargando] = useState(true);
  const [permisos, setPermisos] = useState<SolicitudPermiso[]>([]);
  const [reemplazos, setReemplazos] = useState<ReemplazoPersonal[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!abierto || !funcionaria) return;

    let cancelado = false;
    setCargando(true);

    obtenerHistorialAuditoria(funcionaria.id).then((res) => {
      if (!cancelado) {
        setPermisos(res.permisos);
        setReemplazos(res.reemplazos);
        setCargando(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [abierto, funcionaria]);

  if (!abierto || !funcionaria) return null;

  function manejarEliminarPermiso(id: string) {
    if (!confirm("¿Deseas anular este permiso administrativo? Los días volverán automáticamente al saldo disponible.")) {
      return;
    }

    startTransition(async () => {
      await eliminarPermiso(id);
      setPermisos((prev) => prev.filter((p) => p.id !== id));
      alActualizar();
    });
  }

  function imprimirFicha() {
    window.print();
  }

  const saldoRestante = Number(funcionaria.dias_restantes);
  const saldoUtilizado = Number(funcionaria.dias_utilizados);
  const saldoTotal = Number(funcionaria.total_dias_asignados);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-xs animate-aparecer">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-cielo-100 overflow-hidden">
        {/* Cabecera */}
        <header className="flex items-center justify-between border-b border-cielo-100 bg-cielo-50/70 px-6 py-4 print:hidden">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-menta-500 text-white shadow-sm">
              <FileText className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-tinta">
                Ficha de Auditoría e Historial
              </h2>
              <p className="text-xs text-tinta-suave">
                Registro de permisos administrativos y reemplazos por funcionaria
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={imprimirFicha}
              className="boton-suave text-xs px-3 py-1.5 flex items-center gap-1.5"
              title="Imprimir o guardar en PDF"
            >
              <Printer className="size-3.5" /> Imprimir
            </button>
            <button
              type="button"
              onClick={alCerrar}
              className="grid size-9 cursor-pointer place-items-center rounded-xl text-tinta-suave hover:bg-white hover:text-tinta transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tarjeta de Identificación */}
          <section className="p-5 rounded-2xl border border-cielo-100 bg-linear-to-br from-cielo-50/50 to-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-cielo-600 block">
                  {ETIQUETAS_ESTAMENTO[funcionaria.estamento_rol]} · Contrato {ETIQUETAS_CONTRATO[funcionaria.tipo_contrato]}
                </span>
                <h3 className="text-xl font-bold font-display text-tinta mt-0.5">
                  {funcionaria.nombres} {funcionaria.apellidos}
                </h3>
                <p className="text-xs text-tinta-suave mt-1 font-mono">
                  RUT: <b>{formatearRut(funcionaria.rut)}</b>
                  {funcionaria.correo && ` · ${funcionaria.correo}`}
                  {funcionaria.telefono && ` · Tel: ${funcionaria.telefono}`}
                </p>
              </div>

              {/* Semáforo de Saldo Anual */}
              <div className="text-right">
                <span
                  className={`inline-block font-mono font-bold px-3 py-1 rounded-full text-xs ${
                    saldoRestante >= 3
                      ? "bg-menta-100 text-menta-800 border border-menta-200"
                      : saldoRestante > 0.5
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-coral-100 text-coral-800 border border-coral-200"
                  }`}
                >
                  {saldoRestante.toFixed(1)} / {saldoTotal.toFixed(1)} días disponibles
                </span>
                <p className="text-[0.65rem] text-tinta-suave mt-1">
                  Gastados este año: <b>{saldoUtilizado.toFixed(1)} días</b>
                </p>
              </div>
            </div>

            {/* Barra de Saldo */}
            <div className="mt-4">
              <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-cielo-200">
                <div
                  className={`h-full transition-all duration-500 ${
                    saldoRestante >= 3 ? "bg-menta-500" : saldoRestante > 0.5 ? "bg-amber-500" : "bg-coral-500"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (saldoUtilizado / saldoTotal) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* Historial de Permisos Administrativos */}
          <section>
            <h4 className="text-sm font-bold text-tinta flex items-center gap-2 mb-3">
              <Calendar className="size-4 text-amber-500" /> Historial de Permisos Administrativos (
              {permisos.length})
            </h4>

            {cargando ? (
              <div className="py-8 text-center text-tinta-suave text-xs flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin text-cielo-500" /> Cargando historial…
              </div>
            ) : permisos.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-cielo-200 text-center text-xs text-tinta-suave bg-cielo-50/20">
                No registra permisos administrativos tomados en este período.
              </div>
            ) : (
              <div className="rounded-2xl border border-cielo-100 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-cielo-50/80 text-tinta font-bold text-[0.7rem] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Fecha Tomada</th>
                      <th className="py-2.5 px-3 text-center">Días</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Motivo / Notas</th>
                      <th className="py-2.5 px-3 text-right print:hidden">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cielo-100/60 bg-white">
                    {permisos.map((p) => (
                      <tr key={p.id} className="hover:bg-cielo-50/30">
                        <td className="py-2.5 px-3 font-medium text-tinta">
                          {p.fecha_solicitada}
                          {p.fecha_termino && p.fecha_termino !== p.fecha_solicitada && (
                            <span className="text-[0.65rem] text-tinta-suave block">
                              hasta {p.fecha_termino}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {Number(p.dias_solicitados).toFixed(1)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${
                              p.estado === "aprobado"
                                ? "bg-menta-100 text-menta-700"
                                : p.estado === "pendiente"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-coral-100 text-coral-700"
                            }`}
                          >
                            {p.estado.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-tinta-suave max-w-xs truncate">
                          {p.observaciones || "Sin observaciones"}
                        </td>
                        <td className="py-2.5 px-3 text-right print:hidden">
                          <button
                            type="button"
                            onClick={() => manejarEliminarPermiso(p.id)}
                            disabled={isPending}
                            className="p-1 rounded-lg text-tinta-suave hover:bg-coral-50 hover:text-coral-600 transition"
                            title="Anular permiso y reintegrar días"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Historial de Reemplazos / Coberturas */}
          <section>
            <h4 className="text-sm font-bold text-tinta flex items-center gap-2 mb-3">
              <Users2 className="size-4 text-indigo-500" /> Reemplazos Registrados por Ausencia (
              {reemplazos.length})
            </h4>

            {cargando ? (
              <div className="py-4 text-center text-tinta-suave text-xs">Cargando…</div>
            ) : reemplazos.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-cielo-200 text-center text-xs text-tinta-suave bg-cielo-50/20">
                No hay registros de reemplazos asociados a esta funcionaria.
              </div>
            ) : (
              <div className="rounded-2xl border border-cielo-100 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-cielo-50/80 text-tinta font-bold text-[0.7rem] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Persona Reemplazante</th>
                      <th className="py-2.5 px-3">Período</th>
                      <th className="py-2.5 px-3">Motivo Ausencia</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cielo-100/60 bg-white">
                    {reemplazos.map((r) => (
                      <tr key={r.id} className="hover:bg-cielo-50/30">
                        <td className="py-2.5 px-3 font-semibold text-tinta">
                          {r.reemplazante_nombre}
                        </td>
                        <td className="py-2.5 px-3 text-tinta-suave">
                          {r.fecha_inicio} al {r.fecha_termino}
                        </td>
                        <td className="py-2.5 px-3 text-tinta">{r.motivo}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${
                              r.activo
                                ? "bg-menta-100 text-menta-700"
                                : "bg-cielo-100 text-tinta-suave"
                            }`}
                          >
                            {r.activo ? "VIGENTE" : "CONCLUIDO"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Pie de modal */}
        <footer className="flex items-center justify-between border-t border-cielo-100 bg-white px-6 py-4 print:hidden">
          <p className="text-xs text-tinta-suave">
            Auditoría Dirección · Jardín Infantil y Sala Cuna Manitos de Ángel
          </p>
          <button
            type="button"
            onClick={alCerrar}
            className="boton-suave text-xs px-4 py-2"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
