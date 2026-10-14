"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileDown,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Sparkles,
  User,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react";
import {
  actualizarEstadoEntrevistaAction,
  crearEntrevistaEducadoraAction,
  guardarYGenerarActaEntrevistaAction,
} from "@/app/actions/entrevistas";
import { puedeEditarNivel } from "@/lib/permisos";
import type { Entrevista, EstadoEntrevista, ModalidadEntrevista, Nivel, Parvulo, PerfilConNivel } from "@/lib/types";

interface Props {
  entrevistas: Entrevista[];
  parvulos: Parvulo[];
  niveles: Nivel[];
  nivelSeleccionadoId: string;
  perfil: PerfilConNivel;
}

const COLOR_ESTADO: Record<EstadoEntrevista, { bg: string; texto: string; borde: string }> = {
  pendiente: { bg: "bg-sol-100", texto: "text-sol-800", borde: "border-sol-300" },
  confirmada: { bg: "bg-cielo-100", texto: "text-cielo-800", borde: "border-cielo-300" },
  realizada: { bg: "bg-menta-100", texto: "text-menta-800", borde: "border-menta-300" },
  cancelada: { bg: "bg-coral-100", texto: "text-coral-800", borde: "border-coral-300" },
};

export default function PanelEntrevistasEducadora({
  entrevistas,
  parvulos,
  niveles,
  nivelSeleccionadoId,
  perfil,
}: Props) {
  const [filtro, setFiltro] = useState<"todas" | "pendientes" | "confirmadas" | "realizadas">("todas");
  const [isPending, startTransition] = useTransition();
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Modales
  const [modalAgendar, setModalAgendar] = useState(false);
  const [modalActaEntrevista, setModalActaEntrevista] = useState<Entrevista | null>(null);

  const puedeEditar = puedeEditarNivel(perfil, nivelSeleccionadoId);

  const entrevistasFiltradas = useMemo(() => {
    return entrevistas.filter((e) => {
      if (filtro === "pendientes") return e.estado === "pendiente";
      if (filtro === "confirmadas") return e.estado === "confirmada";
      if (filtro === "realizadas") return e.estado === "realizada";
      return true;
    });
  }, [entrevistas, filtro]);

  const pendientesCount = entrevistas.filter((e) => e.estado === "pendiente").length;

  function handleConfirmar(id: string) {
    setMensajeExito(null);
    setMensajeError(null);
    startTransition(async () => {
      const res = await actualizarEstadoEntrevistaAction(id, "confirmada");
      if (res.ok) {
        setMensajeExito("Entrevista confirmada exitosamente.");
      } else {
        setMensajeError(res.error || "No se pudo confirmar.");
      }
    });
  }

  function handleCancelar(id: string) {
    if (!confirm("¿Deseas marcar esta entrevista como cancelada?")) return;
    setMensajeExito(null);
    setMensajeError(null);
    startTransition(async () => {
      const res = await actualizarEstadoEntrevistaAction(id, "cancelada");
      if (res.ok) {
        setMensajeExito("Entrevista cancelada.");
      } else {
        setMensajeError(res.error || "Error al cancelar.");
      }
    });
  }

  function handleCrearEntrevista(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensajeExito(null);
    setMensajeError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await crearEntrevistaEducadoraAction(undefined, formData);
      if (res.ok) {
        setMensajeExito(res.mensaje || "Entrevista agendada.");
        setModalAgendar(false);
        form.reset();
      } else {
        setMensajeError(res.error || "Error al agendar entrevista.");
      }
    });
  }

  function handleGuardarActa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modalActaEntrevista) return;
    setMensajeExito(null);
    setMensajeError(null);
    const formData = new FormData(e.currentTarget);
    const id = modalActaEntrevista.id;

    startTransition(async () => {
      const res = await guardarYGenerarActaEntrevistaAction(id, formData);
      if (res.ok) {
        setMensajeExito(res.mensaje || "Acta generada y guardada en Google Drive.");
        setModalActaEntrevista(null);
      } else {
        setMensajeError(res.error || "Error al generar el acta.");
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
          <button type="button" onClick={() => setMensajeExito(null)} className="text-menta-700">
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
          <button type="button" onClick={() => setMensajeError(null)} className="text-coral-700">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Barra de Filtros y Botón Agendar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-white/80 bg-white/90 p-4 shadow-suave">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFiltro("todas")}
            className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
              filtro === "todas"
                ? "bg-cielo-500 text-white shadow-xs"
                : "bg-cielo-50 text-tinta-suave hover:bg-cielo-100"
            }`}
          >
            Todas ({entrevistas.length})
          </button>

          <button
            type="button"
            onClick={() => setFiltro("confirmadas")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
              filtro === "confirmadas"
                ? "bg-cielo-500 text-white shadow-xs"
                : "bg-cielo-50 text-cielo-700 hover:bg-cielo-100"
            }`}
          >
            <CalendarCheck className="size-3.5" />
            Agendadas
          </button>

          <button
            type="button"
            onClick={() => setFiltro("pendientes")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
              filtro === "pendientes"
                ? "bg-sol-500 text-white shadow-xs"
                : "bg-sol-50 text-sol-700 hover:bg-sol-100"
            }`}
          >
            <Clock className="size-3.5" />
            Solicitadas por Apoderados {pendientesCount > 0 && `(${pendientesCount})`}
          </button>

          <button
            type="button"
            onClick={() => setFiltro("realizadas")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
              filtro === "realizadas"
                ? "bg-menta-500 text-white shadow-xs"
                : "bg-menta-50 text-menta-700 hover:bg-menta-100"
            }`}
          >
            <FileCheck2 className="size-3.5" />
            Con Acta PDF en Drive
          </button>
        </div>

        {puedeEditar && (
          <button
            type="button"
            onClick={() => setModalAgendar(true)}
            className="boton-primario px-4 py-2 text-xs font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CalendarPlus className="size-4" /> Agendar Entrevista
          </button>
        )}
      </div>

      {/* Lista de Tarjetas de Entrevistas */}
      {entrevistasFiltradas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {entrevistasFiltradas.map((ent) => {
            const estilo = COLOR_ESTADO[ent.estado] ?? COLOR_ESTADO.pendiente;
            const esOnline = ent.modalidad === "online";
            const esTelefonica = ent.modalidad === "telefonica";

            return (
              <article
                key={ent.id}
                className="flex flex-col justify-between rounded-3xl border border-white/90 bg-white/95 p-5 shadow-suave space-y-4 transition hover:shadow-flotante"
              >
                <div className="space-y-3">
                  {/* Encabezado: Párvulo e Insignias */}
                  <div className="flex items-start justify-between gap-2 border-b border-cielo-50 pb-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-tinta">
                        {ent.parvulo?.nombres} {ent.parvulo?.apellidos}
                      </h3>
                      <p className="text-xs text-tinta-suave">
                        Apoderado: <b className="text-tinta">{ent.parvulo?.nombre_apoderado || "No registrado"}</b>
                        {ent.parvulo?.telefono_apoderado && ` · ${ent.parvulo.telefono_apoderado}`}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`insignia border text-[0.68rem] font-bold capitalize ${estilo.bg} ${estilo.texto} ${estilo.borde}`}>
                        {ent.estado}
                      </span>
                      <span className="text-[0.65rem] font-semibold text-tinta-suave/80">
                        {ent.solicitado_por === "apoderado" ? "Solicitada por Apoderado" : "Citada por Educadora"}
                      </span>
                    </div>
                  </div>

                  {/* Datos de fecha, hora y modalidad */}
                  <div className="rounded-2xl bg-cielo-50/50 p-3 text-xs space-y-1.5">
                    <div className="flex flex-wrap items-center gap-3 font-semibold text-tinta">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-cielo-600" />
                        {ent.fecha}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-sol-600" />
                        {ent.hora} hrs
                      </span>
                      <span className="flex items-center gap-1.5 capitalize text-cielo-700">
                        {esOnline ? (
                          <Video className="size-3.5 text-cielo-600" />
                        ) : esTelefonica ? (
                          <Phone className="size-3.5 text-sol-600" />
                        ) : (
                          <MapPin className="size-3.5 text-menta-600" />
                        )}
                        {ent.modalidad}
                      </span>
                    </div>

                    <p className="text-tinta-suave pt-1">
                      <span className="font-semibold text-tinta">Motivo: </span>
                      {ent.motivo}
                    </p>
                  </div>

                  {/* Si ya tiene acta realizada */}
                  {ent.estado === "realizada" && (
                    <div className="rounded-2xl border border-menta-200 bg-menta-50/70 p-3 text-xs space-y-1.5">
                      <p className="font-bold text-menta-900 flex items-center gap-1.5">
                        <FileCheck2 className="size-4 text-menta-600" />
                        Acta de entrevista registrada y archivada
                      </p>
                      {ent.acuerdos_compromisos && (
                        <p className="text-tinta-suave line-clamp-2">
                          <b className="text-tinta">Acuerdos: </b> {ent.acuerdos_compromisos}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="pt-2 border-t border-cielo-50 flex flex-wrap items-center justify-between gap-2">
                  {ent.drive_file_url ? (
                    <a
                      href={ent.drive_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-cielo-600 hover:text-cielo-700"
                    >
                      <FileDown className="size-3.5" />
                      Ver Acta Oficial en Google Drive <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-[0.7rem] text-tinta-suave">
                      {ent.estado === "confirmada" ? "Pendiente de realización" : "En espera de confirmación"}
                    </span>
                  )}

                  {puedeEditar && (
                    <div className="flex items-center gap-1.5">
                      {ent.estado === "pendiente" && (
                        <button
                          type="button"
                          onClick={() => handleConfirmar(ent.id)}
                          disabled={isPending}
                          className="boton-menta px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                        >
                          <Check className="size-3.5" /> Confirmar
                        </button>
                      )}

                      {ent.estado !== "realizada" && ent.estado !== "cancelada" && (
                        <button
                          type="button"
                          onClick={() => setModalActaEntrevista(ent)}
                          className="boton-sol px-3 py-1.5 text-xs font-bold flex items-center gap-1 shadow-xs"
                        >
                          <FileText className="size-3.5" />
                          Registrar Acta y Generar PDF
                        </button>
                      )}

                      {ent.estado === "realizada" && (
                        <button
                          type="button"
                          onClick={() => setModalActaEntrevista(ent)}
                          className="rounded-xl border border-cielo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-cielo-700 hover:bg-cielo-50"
                        >
                          Editar Acta
                        </button>
                      )}

                      {ent.estado !== "cancelada" && (
                        <button
                          type="button"
                          onClick={() => handleCancelar(ent.id)}
                          className="rounded-xl bg-coral-50 p-1.5 text-coral-600 hover:bg-coral-100"
                          title="Cancelar reunión"
                        >
                          <XCircle className="size-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="tarjeta-vidrio p-12 text-center text-tinta-suave space-y-3">
          <CalendarDays className="mx-auto size-12 text-cielo-300" />
          <h2 className="text-xl font-bold text-tinta">No hay entrevistas en esta vista</h2>
          <p className="text-sm max-w-md mx-auto">
            Puedes agendar una reunión individual con cualquier apoderado de este nivel o revisar las solicitudes que ellos envíen desde el portal.
          </p>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: AGENDAR NUEVA ENTREVISTA DESDE EDUCADORA */}
      {/* ================================================================= */}
      {modalAgendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer">
          <div className="relative w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setModalAgendar(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl bg-cielo-50 text-tinta-suave hover:bg-cielo-100"
            >
              <X className="size-4" />
            </button>

            <header className="space-y-1">
              <h3 className="font-display text-lg font-bold text-tinta flex items-center gap-2">
                <CalendarPlus className="size-5 text-cielo-600" />
                Agendar Entrevista con Apoderado
              </h3>
              <p className="text-xs text-tinta-suave">
                Cita a los padres o tutores para revisar avances pedagógicos o temas individuales.
              </p>
            </header>

            <form onSubmit={handleCrearEntrevista} className="space-y-3">
              <input type="hidden" name="nivel_id" value={nivelSeleccionadoId} />

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">Párvulo</label>
                <select name="parvulo_id" required className="campo text-sm">
                  <option value="">Selecciona al párvulo...</option>
                  {parvulos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.apellidos}, {p.nombres} ({p.nombre_apoderado || "Sin apoderado"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-tinta mb-1">Fecha</label>
                  <input name="fecha" type="date" required className="campo text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-tinta mb-1">Hora</label>
                  <input name="hora" type="time" defaultValue="10:00" required className="campo text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">Modalidad</label>
                <select name="modalidad" defaultValue="presencial" className="campo text-sm">
                  <option value="presencial">Presencial en el Jardín</option>
                  <option value="online">Videollamada / Online</option>
                  <option value="telefonica">Llamada Telefónica</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">Motivo u Objetivo de la Reunión</label>
                <textarea
                  name="motivo"
                  required
                  rows={2}
                  placeholder="Ej. Entrevista diagnóstica inicial, seguimiento de lenguaje y hábitos."
                  className="campo text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cielo-50">
                <button
                  type="button"
                  onClick={() => setModalAgendar(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-tinta-suave hover:bg-cielo-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="boton-primario px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarPlus className="size-3.5" />}
                  Agendar Reunión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: REGISTRAR ACTA Y GENERAR PDF EN GOOGLE DRIVE */}
      {/* ================================================================= */}
      {modalActaEntrevista && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer overflow-y-auto">
          <div className="relative my-8 w-full max-w-2xl rounded-3xl border border-white/80 bg-white p-6 sm:p-8 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setModalActaEntrevista(null)}
              disabled={isPending}
              className="absolute right-5 top-5 grid size-9 place-items-center rounded-xl bg-cielo-50 text-tinta-suave hover:bg-cielo-100 disabled:opacity-50"
            >
              <X className="size-5" />
            </button>

            <header className="space-y-1">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-sol-600">
                Acta Oficial de Entrevista
              </span>
              <h3 className="font-display text-xl font-bold text-tinta flex items-center gap-2">
                <FileText className="size-6 text-sol-500" />
                Registrar Puntos y Generar Acta PDF
              </h3>
              <p className="text-xs text-tinta-suave">
                Párvulo: <b className="text-tinta">{modalActaEntrevista.parvulo?.nombres} {modalActaEntrevista.parvulo?.apellidos}</b> · {modalActaEntrevista.fecha}
              </p>
            </header>

            <form onSubmit={handleGuardarActa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-tinta mb-1">
                  Personas Asistentes a la Entrevista
                </label>
                <input
                  name="asistentes"
                  type="text"
                  required
                  defaultValue={
                    modalActaEntrevista.asistentes ||
                    `${modalActaEntrevista.parvulo?.nombre_apoderado || "Apoderado"} y ${perfil.nombre_completo} (Educadora)`
                  }
                  className="campo text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">
                  1. Puntos Tratados durante la Entrevista <span className="text-coral-500">*</span>
                </label>
                <textarea
                  name="puntos_tratados"
                  required
                  rows={4}
                  defaultValue={modalActaEntrevista.puntos_tratados ?? ""}
                  placeholder="Detalla los aspectos conversados sobre el párvulo (ej. conducta, avances en lenguaje, autonomía, alimentación, adaptación)."
                  className="campo text-sm leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">
                  2. Acuerdos y Compromisos Pedagógicos / del Hogar <span className="text-coral-500">*</span>
                </label>
                <textarea
                  name="acuerdos_compromisos"
                  required
                  rows={3}
                  defaultValue={modalActaEntrevista.acuerdos_compromisos ?? ""}
                  placeholder="Compromisos adquiridos por el jardín y por la familia (ej. reforzar límites en casa, seguimiento semanal, cita con fonoaudiólogo)."
                  className="campo text-sm leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">
                  3. Observaciones y Conclusiones Finales <span className="font-normal text-tinta-suave">(opcional)</span>
                </label>
                <textarea
                  name="observaciones"
                  rows={2}
                  defaultValue={modalActaEntrevista.observaciones ?? ""}
                  placeholder="Comentarios adicionales o fecha tentativa de próximo seguimiento."
                  className="campo text-sm"
                />
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-cielo-50/70 p-3 text-xs text-tinta">
                <input
                  id="visible_apoderado"
                  name="visible_apoderado"
                  type="checkbox"
                  defaultChecked={modalActaEntrevista.visible_apoderado ?? true}
                  className="size-4 rounded accent-cielo-500 cursor-pointer"
                />
                <label htmlFor="visible_apoderado" className="cursor-pointer select-none font-semibold">
                  Hacer visible el acta en el Portal del Apoderado para que la familia pueda revisarla y descargarla
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-cielo-50">
                <p className="text-[0.7rem] text-tinta-suave">
                  Al guardar, se creará un <b>documento PDF oficial</b> y se subirá automáticamente a la carpeta <b>Entrevistas</b> de Google Drive del alumno.
                </p>

                <div className="flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalActaEntrevista(null)}
                    disabled={isPending}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-tinta-suave hover:bg-cielo-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="boton-sol px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-suave disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generando PDF y guardando en Drive…
                      </>
                    ) : (
                      <>
                        <FileDown className="size-4" />
                        Generar Acta PDF y Guardar en Drive
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
