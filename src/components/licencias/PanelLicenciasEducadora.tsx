"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileHeart,
  FileText,
  Filter,
  HeartPulse,
  Info,
  Loader2,
  Search,
  Sparkles,
  User,
  X,
  XCircle,
} from "lucide-react";
import {
  justificarLicenciaAction,
  rechazarLicenciaAction,
} from "@/app/actions/licencias";
import { puedeEditarNivel } from "@/lib/permisos";
import type { LicenciaMedica, Nivel, PerfilConNivel } from "@/lib/types";

interface Props {
  licencias: LicenciaMedica[];
  niveles: Nivel[];
  nivelSeleccionadoId: string;
  perfil: PerfilConNivel;
}

export default function PanelLicenciasEducadora({
  licencias,
  niveles,
  nivelSeleccionadoId,
  perfil,
}: Props) {
  const [filtroEstado, setFiltroEstado] = useState<"todas" | "pendiente" | "justificada" | "rechazada">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [modalRechazoId, setModalRechazoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const puedeEditar = puedeEditarNivel(perfil, nivelSeleccionadoId);

  const licenciasFiltradas = useMemo(() => {
    return licencias.filter((l) => {
      if (filtroEstado !== "todas" && l.estado !== filtroEstado) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const nom = `${l.parvulo?.nombres ?? ""} ${l.parvulo?.apellidos ?? ""}`.toLowerCase();
        const rut = (l.parvulo?.rut ?? "").toLowerCase();
        const mot = (l.diagnostico_motivo ?? "").toLowerCase();
        if (!nom.includes(q) && !rut.includes(q) && !mot.includes(q)) return false;
      }
      return true;
    });
  }, [licencias, filtroEstado, busqueda]);

  const pendientesCount = licencias.filter((l) => l.estado === "pendiente").length;

  function manejarAprobar(licenciaId: string) {
    setMensajeExito(null);
    setMensajeError(null);
    startTransition(async () => {
      const res = await justificarLicenciaAction(licenciaId);
      if (res.ok) {
        setMensajeExito(
          `¡Licencia aprobada con éxito! Se registraron ${res.diasJustificados ?? 0} días hábiles como "Justificado" en el Control de Asistencia.`,
        );
      } else {
        setMensajeError(res.error || "No se pudo justificar la asistencia.");
      }
    });
  }

  function manejarRechazarConfirmar() {
    if (!modalRechazoId) return;
    setMensajeExito(null);
    setMensajeError(null);
    const id = modalRechazoId;
    const obs = motivoRechazo;
    setModalRechazoId(null);
    setMotivoRechazo("");

    startTransition(async () => {
      const res = await rechazarLicenciaAction(id, obs);
      if (res.ok) {
        setMensajeExito("La licencia fue marcada como observada/rechazada.");
      } else {
        setMensajeError(res.error || "No se pudo actualizar el estado.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Mensajes de retroalimentación */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-2xl bg-menta-100 p-4 text-sm font-semibold text-menta-800 shadow-xs animate-aparecer">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0 text-menta-600" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-menta-600 hover:text-menta-800"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {mensajeError && (
        <div className="flex items-center justify-between rounded-2xl bg-coral-100 p-4 text-sm font-semibold text-coral-800 shadow-xs animate-aparecer">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0 text-coral-600" />
            <span>{mensajeError}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeError(null)}
            className="text-coral-600 hover:text-coral-800"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Barra de filtros y búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-white/80 bg-white/90 p-4 shadow-suave">
        {/* Pestañas de estado */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFiltroEstado("todas")}
            className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
              filtroEstado === "todas"
                ? "bg-cielo-500 text-white shadow-xs"
                : "bg-cielo-50 text-tinta-suave hover:bg-cielo-100"
            }`}
          >
            Todas ({licencias.length})
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado("pendiente")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
              filtroEstado === "pendiente"
                ? "bg-sol-500 text-white shadow-xs"
                : "bg-sol-50 text-sol-700 hover:bg-sol-100"
            }`}
          >
            <Clock className="size-3.5" />
            Pendientes ({pendientesCount})
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado("justificada")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
              filtroEstado === "justificada"
                ? "bg-menta-500 text-white shadow-xs"
                : "bg-menta-50 text-menta-700 hover:bg-menta-100"
            }`}
          >
            <CheckCircle2 className="size-3.5" />
            Aprobadas
          </button>

          <button
            type="button"
            onClick={() => setFiltroEstado("rechazada")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
              filtroEstado === "rechazada"
                ? "bg-coral-500 text-white shadow-xs"
                : "bg-coral-50 text-coral-700 hover:bg-coral-100"
            }`}
          >
            <XCircle className="size-3.5" />
            Observadas
          </button>
        </div>

        {/* Input búsqueda */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tinta-suave" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por párvulo o motivo…"
            className="campo pl-9 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Listado de tarjetas de licencias */}
      {licenciasFiltradas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {licenciasFiltradas.map((lic) => {
            const badgeClases =
              lic.estado === "justificada"
                ? "bg-menta-100 text-menta-800 border-menta-300"
                : lic.estado === "rechazada"
                ? "bg-coral-100 text-coral-800 border-coral-300"
                : "bg-sol-100 text-sol-800 border-sol-300";

            const badgeTexto =
              lic.estado === "justificada"
                ? "Aprobada en Asistencia"
                : lic.estado === "rechazada"
                ? "Observada / Rechazada"
                : "Pendiente de revisión";

            return (
              <article
                key={lic.id}
                className="flex flex-col justify-between rounded-3xl border border-white/90 bg-white/95 p-5 shadow-suave transition hover:shadow-flotante space-y-4"
              >
                <div className="space-y-3">
                  {/* Encabezado párvulo */}
                  <div className="flex items-start justify-between gap-3 border-b border-cielo-50 pb-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-tinta">
                        {lic.parvulo?.nombres} {lic.parvulo?.apellidos}
                      </h3>
                      <p className="text-xs font-semibold text-cielo-700">
                        RUT: {lic.parvulo?.rut} · {lic.nivel?.nombre}
                      </p>
                    </div>
                    <span className={`insignia border text-[0.7rem] font-bold ${badgeClases}`}>
                      {badgeTexto}
                    </span>
                  </div>

                  {/* Fechas y motivo */}
                  <div className="rounded-2xl bg-cielo-50/50 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-tinta">
                      <Calendar className="size-4 text-coral-500" />
                      <span>
                        Reposo: {lic.fecha_inicio} al {lic.fecha_termino} ({lic.dias_reposo} {lic.dias_reposo === 1 ? "día" : "días"})
                      </span>
                    </div>
                    <p className="text-tinta-suave">
                      <span className="font-semibold text-tinta">Motivo: </span>
                      {lic.diagnostico_motivo || "No especificado por el apoderado"}
                    </p>
                    <p className="text-tinta-suave truncate">
                      <span className="font-semibold text-tinta">Archivo: </span>
                      {lic.nombre_archivo}
                    </p>
                  </div>

                  {/* Observación previa de educadora */}
                  {lic.observacion_educadora && (
                    <div className="rounded-2xl bg-sol-50 p-3 text-xs text-sol-900 border border-sol-100">
                      <span className="font-bold">Observación registrada: </span>
                      {lic.observacion_educadora}
                    </div>
                  )}
                </div>

                {/* Acciones y enlace a Google Drive */}
                <div className="pt-2 border-t border-cielo-50 flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={lic.drive_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cielo-600 hover:text-cielo-700"
                  >
                    <ExternalLink className="size-3.5" />
                    Abrir en Drive (Carpeta Licencias)
                  </a>

                  {puedeEditar && lic.estado === "pendiente" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalRechazoId(lic.id)}
                        disabled={isPending}
                        className="rounded-xl border border-coral-200 bg-coral-50 px-3 py-1.5 text-xs font-bold text-coral-700 hover:bg-coral-100 disabled:opacity-50"
                      >
                        Observar
                      </button>
                      <button
                        type="button"
                        onClick={() => manejarAprobar(lic.id)}
                        disabled={isPending}
                        className="boton-menta px-3.5 py-1.5 text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1"
                      >
                        {isPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        Aprobar y Justificar
                      </button>
                    </div>
                  )}

                  {puedeEditar && lic.estado === "justificada" && (
                    <span className="text-[0.7rem] font-bold text-menta-700 flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-menta-500" />
                      Registrado en Asistencia
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="tarjeta-vidrio p-12 text-center text-tinta-suave space-y-3">
          <HeartPulse className="mx-auto size-12 text-cielo-300" />
          <h2 className="text-xl font-bold text-tinta">No hay licencias en esta vista</h2>
          <p className="text-sm max-w-md mx-auto">
            {filtroEstado !== "todas"
              ? "No se encontraron licencias médicas con el filtro seleccionado."
              : "Cuando un apoderado suba una licencia médica desde el portal, aparecerá aquí para que la revises y justifiques la asistencia en un solo clic."}
          </p>
        </div>
      )}

      {/* Modal para ingresar observación al rechazar/observar */}
      {modalRechazoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer">
          <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-tinta flex items-center gap-2">
              <XCircle className="size-5 text-coral-500" />
              Observar o Rechazar Licencia
            </h3>
            <p className="text-xs text-tinta-suave">
              Indica el motivo para que el apoderado lo visualice en su portal (ej. documento ilegible, faltan datos).
            </p>
            <textarea
              rows={3}
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Escribe la observación aquí…"
              className="campo text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalRechazoId(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-tinta-suave hover:bg-cielo-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={manejarRechazarConfirmar}
                className="boton-coral px-4 py-2 text-xs font-bold"
              >
                Guardar Observación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
