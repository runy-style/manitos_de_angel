"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  MessageSquare,
  Save,
  Sparkles,
  UserX,
} from "lucide-react";
import { guardarAsistenciaNivel, type ItemAsistenciaInput } from "@/app/actions/asistencia";
import { puedeEditarNivel } from "@/lib/permisos";
import type { EstadoAsistencia, Nivel, Parvulo, PerfilConNivel, RegistroAsistencia } from "@/lib/types";

interface Props {
  niveles: Nivel[];
  nivelSeleccionado: Nivel;
  fechaSeleccionada: string;
  parvulos: Parvulo[];
  asistenciasGuardadas: RegistroAsistencia[];
  perfil: PerfilConNivel;
}

export default function PanelControlAsistencia({
  nivelSeleccionado,
  fechaSeleccionada,
  parvulos,
  asistenciasGuardadas,
  perfil,
}: Props) {
  const puedeEditar = puedeEditarNivel(perfil, nivelSeleccionado.id);
  const [isPending, startTransition] = useTransition();
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Inicializar estado de asistencia con lo guardado en BD o por defecto "presente"
  const [estadoLocal, setEstadoLocal] = useState<Record<string, EstadoAsistencia>>(() => {
    const mapa: Record<string, EstadoAsistencia> = {};
    const guardadosMap = new Map(asistenciasGuardadas.map((a) => [a.parvulo_id, a.estado]));
    parvulos.forEach((p) => {
      mapa[p.id] = guardadosMap.get(p.id) ?? "presente";
    });
    return mapa;
  });

  // Observaciones del día
  const [observaciones, setObservaciones] = useState<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    asistenciasGuardadas.forEach((a) => {
      if (a.observacion_dia) mapa[a.parvulo_id] = a.observacion_dia;
    });
    return mapa;
  });

  // Alumno con campo de observación abierto
  const [obsAbierta, setObsAbierta] = useState<Record<string, boolean>>({});

  // Estadísticas del día en tiempo real
  const statsDia = useMemo(() => {
    let presente = 0;
    let ausente = 0;
    let justificado = 0;
    parvulos.forEach((p) => {
      const e = estadoLocal[p.id];
      if (e === "presente") presente++;
      else if (e === "ausente") ausente++;
      else if (e === "justificado") justificado++;
    });
    const total = parvulos.length;
    const porcentaje = total > 0 ? Math.round((presente / total) * 100) : 0;
    return { presente, ausente, justificado, total, porcentaje };
  }, [parvulos, estadoLocal]);

  function marcarEstado(parvuloId: string, estado: EstadoAsistencia) {
    if (!puedeEditar) return;
    setEstadoLocal((prev) => ({ ...prev, [parvuloId]: estado }));
    setMensajeExito(null);
  }

  function marcarTodosPresentes() {
    if (!puedeEditar) return;
    const nuevo: Record<string, EstadoAsistencia> = {};
    parvulos.forEach((p) => {
      nuevo[p.id] = "presente";
    });
    setEstadoLocal(nuevo);
    setMensajeExito(null);
  }

  function toggleObs(parvuloId: string) {
    setObsAbierta((prev) => ({ ...prev, [parvuloId]: !prev[parvuloId] }));
  }

  function guardar() {
    if (!puedeEditar) return;
    setMensajeError(null);
    setMensajeExito(null);

    const registros: ItemAsistenciaInput[] = parvulos.map((p) => ({
      parvulo_id: p.id,
      estado: estadoLocal[p.id] || "presente",
      observacion_dia: observaciones[p.id] || undefined,
    }));

    startTransition(async () => {
      const res = await guardarAsistenciaNivel(
        nivelSeleccionado.id,
        fechaSeleccionada,
        registros,
      );
      if (res.ok) {
        setMensajeExito(
          `¡Asistencia guardada correctamente! (${res.guardados} párvulos registrados)`,
        );
      } else {
        setMensajeError(res.error || "Ocurrió un error al guardar.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de Resumen del Día */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="tarjeta-vidrio flex items-center gap-3 p-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-cielo-100 text-cielo-600">
            <Calendar className="size-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              Total párvulos
            </p>
            <p className="text-2xl font-bold text-tinta">{statsDia.total}</p>
          </div>
        </div>

        <div className="tarjeta-vidrio flex items-center gap-3 p-4 ring-1 ring-menta-200">
          <span className="grid size-12 place-items-center rounded-2xl bg-menta-100 text-menta-600">
            <Check className="size-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              Presentes ({statsDia.porcentaje}%)
            </p>
            <p className="text-2xl font-bold text-menta-600">{statsDia.presente}</p>
          </div>
        </div>

        <div className="tarjeta-vidrio flex items-center gap-3 p-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-coral-100 text-coral-600">
            <UserX className="size-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-tinta-suave">Ausentes</p>
            <p className="text-2xl font-bold text-coral-600">{statsDia.ausente}</p>
          </div>
        </div>

        <div className="tarjeta-vidrio flex items-center gap-3 p-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-sol-100 text-sol-600">
            <Clock className="size-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              Justificados
            </p>
            <p className="text-2xl font-bold text-sol-600">{statsDia.justificado}</p>
          </div>
        </div>
      </div>

      {/* Barra de Acciones Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 backdrop-blur">
        <div className="flex items-center gap-2">
          {puedeEditar ? (
            <button
              type="button"
              onClick={marcarTodosPresentes}
              className="boton-suave text-xs py-2 px-3 gap-1.5"
            >
              <CheckCheck className="size-4 text-menta-600" />
              Marcar todos presentes
            </button>
          ) : (
            <span className="insignia bg-cielo-100 text-cielo-700">
              <Lock className="size-3" /> Modo solo lectura (visualización)
            </span>
          )}
        </div>

        {/* Botón Guardar */}
        <button
          id="btn-guardar-asistencia"
          type="button"
          onClick={guardar}
          disabled={!puedeEditar || isPending || parvulos.length === 0}
          title={
            puedeEditar
              ? "Guardar asistencia del nivel"
              : "Solo la educadora a cargo del nivel puede guardar cambios."
          }
          className="boton-menta text-sm py-2.5 px-6 shadow-flotante"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Guardando…
            </>
          ) : (
            <>
              <Save className="size-4" /> Guardar Asistencia del Nivel
            </>
          )}
        </button>
      </div>

      {/* Alertas de resultado */}
      {mensajeExito && (
        <aside
          role="status"
          className="flex items-center gap-3 rounded-2xl bg-menta-50 p-4 ring-1 ring-menta-200 text-menta-700 font-semibold text-sm animate-aparecer"
        >
          <Sparkles className="size-5 shrink-0 text-menta-500" />
          {mensajeExito}
        </aside>
      )}

      {mensajeError && (
        <aside
          role="alert"
          className="flex items-center gap-3 rounded-2xl bg-coral-50 p-4 ring-1 ring-coral-200 text-coral-700 font-semibold text-sm animate-sacudir"
        >
          <AlertCircle className="size-5 shrink-0 text-coral-500" />
          {mensajeError}
        </aside>
      )}

      {/* Lista de Alumnos */}
      {parvulos.length === 0 ? (
        <div className="tarjeta-vidrio p-12 text-center text-tinta-suave">
          <Info className="mx-auto mb-2 size-10 text-cielo-400" />
          <h3 className="text-lg font-semibold text-tinta">No hay párvulos activos en este nivel</h3>
          <p className="mt-1 text-sm">
            Inscribe párvulos en la sección de Nómina para poder registrar su asistencia.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {parvulos.map((p, idx) => {
            const estado = estadoLocal[p.id] || "presente";
            const obs = observaciones[p.id] || "";
            const tieneObs = obs.trim().length > 0;
            const openObs = obsAbierta[p.id] || tieneObs;

            return (
              <article
                key={p.id}
                className={`tarjeta-vidrio p-4 transition duration-200 sm:p-5 ${
                  estado === "presente"
                    ? "ring-1 ring-menta-200/60"
                    : estado === "ausente"
                    ? "ring-1 ring-coral-200/60"
                    : "ring-1 ring-sol-200/60"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Info Párvulo */}
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sol-200 to-cielo-200 font-display font-bold text-tinta">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-tinta text-base sm:text-lg">
                        {p.nombres} {p.apellidos}
                      </h4>
                      <p className="text-xs font-mono text-tinta-suave">RUT: {p.rut}</p>
                    </div>
                  </div>

                  {/* Botones de Estado de Asistencia (1 toque táctil) */}
                  <div className="flex items-center gap-2">
                    {/* Presente */}
                    <button
                      type="button"
                      onClick={() => marcarEstado(p.id, "presente")}
                      disabled={!puedeEditar}
                      className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                        estado === "presente"
                          ? "bg-menta-500 text-white shadow-md shadow-menta-500/30 scale-105"
                          : "bg-white text-tinta-suave border border-cielo-100 hover:bg-menta-50 hover:text-menta-700"
                      }`}
                    >
                      <Check className="size-4" />
                      Presente
                    </button>

                    {/* Ausente */}
                    <button
                      type="button"
                      onClick={() => marcarEstado(p.id, "ausente")}
                      disabled={!puedeEditar}
                      className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                        estado === "ausente"
                          ? "bg-coral-500 text-white shadow-md shadow-coral-500/30 scale-105"
                          : "bg-white text-tinta-suave border border-cielo-100 hover:bg-coral-50 hover:text-coral-700"
                      }`}
                    >
                      <UserX className="size-4" />
                      Ausente
                    </button>

                    {/* Justificado */}
                    <button
                      type="button"
                      onClick={() => marcarEstado(p.id, "justificado")}
                      disabled={!puedeEditar}
                      className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                        estado === "justificado"
                          ? "bg-sol-400 text-tinta shadow-md shadow-sol-400/30 scale-105"
                          : "bg-white text-tinta-suave border border-cielo-100 hover:bg-sol-50 hover:text-sol-700"
                      }`}
                    >
                      <Clock className="size-4" />
                      Justificado
                    </button>

                    {/* Botón Observación */}
                    <button
                      type="button"
                      onClick={() => toggleObs(p.id)}
                      title="Agregar o editar observación del día"
                      className={`grid size-9 shrink-0 place-items-center rounded-xl transition ${
                        tieneObs
                          ? "bg-sol-100 text-sol-700 ring-1 ring-sol-300"
                          : "text-tinta-suave hover:bg-cielo-50"
                      }`}
                    >
                      <MessageSquare className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Campo Desplegable de Observación */}
                {openObs && (
                  <div className="mt-3 pt-3 border-t border-cielo-50 flex items-center gap-2">
                    <MessageSquare className="size-4 text-sol-500 shrink-0" />
                    <input
                      type="text"
                      disabled={!puedeEditar}
                      placeholder="Observación opcional del día (ej. Llegó con fiebre leve, se retira a las 12:00)..."
                      value={observaciones[p.id] || ""}
                      onChange={(e) => {
                        setObservaciones((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }));
                      }}
                      className="campo py-1.5 text-xs bg-white"
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
