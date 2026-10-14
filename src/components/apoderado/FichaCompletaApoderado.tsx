"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  FileText,
  Heart,
  HeartPulse,
  Image as ImageIcon,
  Plus,
  Printer,
  Sparkles,
  User,
} from "lucide-react";
import type { FichaApoderado } from "@/lib/types";
import ModalSubirLicencia from "./ModalSubirLicencia";
import ModalSolicitarEntrevista from "./ModalSolicitarEntrevista";

interface Props {
  ficha: FichaApoderado;
  onConsultarOtro?: () => void;
}

const COLOR_ESTADO: Record<string, string> = {
  presente: "bg-menta-100 text-menta-700 border-menta-200",
  ausente: "bg-coral-100 text-coral-700 border-coral-200",
  justificado: "bg-sol-100 text-sol-700 border-sol-200",
};

const ESTILOS_AREA: Record<string, { bg: string; texto: string; borde: string }> = {
  "Autonomía y Convivencia": {
    bg: "bg-menta-100/90",
    texto: "text-menta-800",
    borde: "border-menta-300",
  },
  "Comunicación y Lenguaje": {
    bg: "bg-cielo-100/90",
    texto: "text-cielo-800",
    borde: "border-cielo-300",
  },
  "Motricidad y Corporalidad": {
    bg: "bg-sol-100/90",
    texto: "text-sol-800",
    borde: "border-sol-300",
  },
  "Alimentación y Rutina": {
    bg: "bg-coral-100/90",
    texto: "text-coral-800",
    borde: "border-coral-300",
  },
  "Pensamiento Matemático": {
    bg: "bg-lavanda-100/90",
    texto: "text-lavanda-800",
    borde: "border-lavanda-300",
  },
  "Exploración del Entorno": {
    bg: "bg-emerald-100/90",
    texto: "text-emerald-800",
    borde: "border-emerald-300",
  },
  "Observación General": {
    bg: "bg-slate-100",
    texto: "text-slate-800",
    borde: "border-slate-300",
  },
};

export default function FichaCompletaApoderado({ ficha, onConsultarOtro }: Props) {
  const [pestana, setPestana] = useState<"avances" | "asistencia" | "archivos" | "licencias" | "entrevistas">("avances");
  const [modalLicenciaAbierto, setModalLicenciaAbierto] = useState(false);
  const [modalEntrevistaAbierto, setModalEntrevistaAbierto] = useState(false);

  const porcentaje = Number(ficha.estadisticas?.porcentaje_asistencia ?? 0);
  const radio = 46;
  const circunferencia = 2 * Math.PI * radio;
  const colorGrafico =
    porcentaje >= 85
      ? "#38c98e" // menta
      : porcentaje >= 75
      ? "#f59e0b" // sol
      : "#f87171"; // coral

  const totalAvances = ficha.bitacora?.length ?? 0;
  const totalArchivos = ficha.archivos?.length ?? 0;
  const totalLicencias = ficha.licencias?.length ?? 0;
  const totalEntrevistas = ficha.entrevistas?.length ?? 0;

  function imprimirFicha() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Botones de acción superiores (ocultos al imprimir) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 p-4 backdrop-blur-sm shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-tinta-suave">
          <Sparkles className="size-4 text-sol-500" />
          Ficha oficial del párvulo · Actualizada en tiempo real
        </div>
        <div className="flex items-center gap-2">
          {onConsultarOtro && (
            <button
              type="button"
              onClick={onConsultarOtro}
              className="boton-suave px-3.5 py-1.5 text-xs font-bold"
            >
              Consultar otro RUT
            </button>
          )}
          <button
            type="button"
            onClick={imprimirFicha}
            className="boton-primario px-3.5 py-1.5 text-xs font-bold shadow-xs"
          >
            <Printer className="size-3.5" /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Tarjeta Principal del Párvulo */}
      <header className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-flotante sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-linear-to-br from-sol-200 via-menta-200 to-cielo-200 text-2xl font-bold font-display text-tinta shadow-suave sm:size-20 sm:text-3xl">
              {ficha.parvulo!.nombres[0]}
              {ficha.parvulo!.apellidos[0]}
            </span>
            <div className="space-y-1">
              <span className="insignia bg-cielo-100 text-cielo-700 font-bold">
                {ficha.parvulo!.nivel}
              </span>
              <h1 className="font-display text-2xl font-bold text-tinta sm:text-3xl">
                {ficha.parvulo!.nombres} {ficha.parvulo!.apellidos}
              </h1>
              <p className="font-mono text-xs font-medium text-tinta-suave">
                RUT: {ficha.parvulo!.rut}
              </p>
            </div>
          </div>

          {/* Gráfico circular de asistencia */}
          <div className="flex items-center gap-4 rounded-2xl bg-linear-to-br from-cielo-50/60 to-menta-50/60 p-4 ring-1 ring-cielo-100/60 sm:p-5">
            <div className="relative size-20 shrink-0">
              <svg viewBox="0 0 110 110" className="size-20 -rotate-90">
                <circle
                  cx="55"
                  cy="55"
                  r={radio}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                />
                <circle
                  cx="55"
                  cy="55"
                  r={radio}
                  fill="none"
                  stroke={colorGrafico}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circunferencia}
                  strokeDashoffset={circunferencia * (1 - porcentaje / 100)}
                  className="transition-[stroke-dashoffset] duration-1000"
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold text-tinta">
                {porcentaje}%
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
                Asistencia
              </p>
              <p className="font-display text-xl font-bold text-tinta">
                {ficha.estadisticas?.dias_presente ?? 0}{" "}
                <span className="text-xs font-normal text-tinta-suave">
                  de {ficha.estadisticas?.total_dias_registrados ?? 0} días
                </span>
              </p>
              <p className="text-xs font-semibold text-menta-600 mt-0.5">
                {porcentaje >= 75 ? "Asistencia destacada" : "Alerta de asistencia"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Pestañas de navegación interactiva (ocultas en impresión) */}
      <nav className="print:hidden flex gap-2 border-b border-cielo-100 pb-2">
        <button
          type="button"
          onClick={() => setPestana("avances")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            pestana === "avances"
              ? "bg-cielo-500 text-white shadow-suave"
              : "text-tinta hover:bg-white/80"
          }`}
        >
          <Sparkles className="size-4" />
          Bitácora de Avances ({totalAvances})
        </button>

        <button
          type="button"
          onClick={() => setPestana("asistencia")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            pestana === "asistencia"
              ? "bg-cielo-500 text-white shadow-suave"
              : "text-tinta hover:bg-white/80"
          }`}
        >
          <CalendarCheck className="size-4" />
          Historial Asistencia
        </button>

        {totalArchivos > 0 && (
          <button
            type="button"
            onClick={() => setPestana("archivos")}
            className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
              pestana === "archivos"
                ? "bg-cielo-500 text-white shadow-suave"
                : "text-tinta hover:bg-white/80"
            }`}
          >
            <ImageIcon className="size-4" />
            Fotos y Archivos ({totalArchivos})
          </button>
        )}

        <button
          type="button"
          onClick={() => setPestana("licencias")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            pestana === "licencias"
              ? "bg-coral-500 text-white shadow-suave"
              : "text-tinta hover:bg-white/80"
          }`}
        >
          <HeartPulse className="size-4" />
          Licencias Médicas {totalLicencias > 0 && `(${totalLicencias})`}
        </button>

        <button
          type="button"
          onClick={() => setPestana("entrevistas")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
            pestana === "entrevistas"
              ? "bg-sol-500 text-white shadow-suave"
              : "text-tinta hover:bg-white/80"
          }`}
        >
          <CalendarDays className="size-4" />
          Agenda Entrevistas {totalEntrevistas > 0 && `(${totalEntrevistas})`}
        </button>
      </nav>

      {/* Sección 1: Bitácora de Avances Pedagógicos */}
      {(pestana === "avances" || typeof window === "undefined") && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-tinta flex items-center gap-2">
              <Sparkles className="size-5 text-sol-500" />
              Observaciones de la Educadora
            </h2>
            <span className="text-xs text-tinta-suave">
              {totalAvances} registros compartidos
            </span>
          </div>

          {totalAvances > 0 ? (
            <div className="space-y-4">
              {ficha.bitacora!.map((b) => {
                const estilo =
                  ESTILOS_AREA[b.area_avance] ?? ESTILOS_AREA["Observación General"];
                const fechaFormato = new Date(`${b.fecha}T12:00:00`).toLocaleDateString(
                  "es-CL",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                );

                return (
                  <article
                    key={b.id}
                    className="relative rounded-3xl border border-white/90 bg-white/95 p-6 shadow-suave transition hover:shadow-flotante"
                  >
                    <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-cielo-50 pb-3">
                      <span
                        className={`insignia border text-xs font-bold ${estilo.bg} ${estilo.texto} ${estilo.borde}`}
                      >
                        {b.area_avance}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-tinta-suave">
                        <Calendar className="size-3.5 text-cielo-500" />
                        {fechaFormato}
                      </span>
                    </header>

                    <p className="whitespace-pre-line text-[0.98rem] leading-relaxed text-tinta/90 font-normal">
                      {b.observacion}
                    </p>

                    {b.educadora && (
                      <footer className="mt-4 flex items-center gap-1.5 text-xs font-bold text-tinta-suave">
                        <User className="size-3.5 text-menta-500" />
                        Registrado por Tía {b.educadora}
                      </footer>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-cielo-200 bg-white/60 p-8 text-center text-tinta-suave">
              <Sparkles className="mx-auto mb-2 size-8 text-sol-400" />
              <p className="font-bold text-tinta">Aún no hay observaciones de bitácora publicadas</p>
              <p className="text-xs mt-1">
                La educadora a cargo irá registrando los logros y avances pedagógicos durante el mes.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Sección 2: Historial Detallado de Asistencia */}
      {(pestana === "asistencia" || typeof window === "undefined") && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-tinta flex items-center gap-2">
            <CalendarCheck className="size-5 text-menta-500" />
            Historial Reciente de Asistencia
          </h2>

          {ficha.asistencia_reciente && ficha.asistencia_reciente.length > 0 ? (
            <div className="rounded-3xl border border-white/90 bg-white/95 p-6 shadow-suave">
              <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {ficha.asistencia_reciente.map((a) => {
                  const fechaObj = new Date(`${a.fecha}T12:00:00`);
                  const fechaTexto = fechaObj.toLocaleDateString("es-CL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });

                  return (
                    <div
                      key={a.fecha}
                      className="flex items-center justify-between rounded-2xl border border-cielo-50 bg-cielo-50/30 px-3.5 py-2.5"
                    >
                      <span className="text-xs font-bold capitalize text-tinta">
                        {fechaTexto}
                      </span>
                      <span
                        className={`insignia border text-xs font-bold uppercase tracking-wider ${
                          COLOR_ESTADO[a.estado] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {a.estado}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-cielo-200 bg-white/60 p-8 text-center text-tinta-suave">
              <CalendarCheck className="mx-auto mb-2 size-8 text-cielo-400" />
              <p className="font-bold text-tinta">Sin registros de asistencia disponibles</p>
            </div>
          )}
        </section>
      )}

      {/* Sección 3: Fotos y Documentos de Google Drive */}
      {(pestana === "archivos" || typeof window === "undefined") && totalArchivos > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-tinta flex items-center gap-2">
            <ImageIcon className="size-5 text-coral-500" />
            Fotografías y Archivos Compartidos
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {ficha.archivos!.map((arch) => (
              <a
                key={arch.id}
                href={arch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-3xl border border-white/80 bg-white/95 p-5 shadow-suave transition hover:shadow-flotante hover:border-cielo-200"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-coral-50 text-coral-500 transition group-hover:scale-110">
                  {arch.categoria === "fotografia" ? (
                    <ImageIcon className="size-6" />
                  ) : (
                    <FileText className="size-6" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-tinta group-hover:text-cielo-600 transition">
                    {arch.titulo}
                  </h3>
                  <p className="text-xs text-tinta-suave mt-0.5 capitalize">
                    {arch.categoria.replace("_", " ")}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-cielo-600">
                    Ver en Google Drive <ExternalLink className="size-3" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Sección 4: Licencias Médicas del Párvulo */}
      {(pestana === "licencias" || typeof window === "undefined") && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-tinta flex items-center gap-2">
                <HeartPulse className="size-5 text-coral-500" />
                Licencias Médicas y Reposo
              </h2>
              <p className="text-xs text-tinta-suave mt-0.5">
                Los documentos se guardan directamente en la subcarpeta &quot;Licencias&quot; de Google Drive y se notifican a la educadora.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalLicenciaAbierto(true)}
              className="boton-coral self-start sm:self-auto px-4 py-2 text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="size-4" /> Subir Nueva Licencia
            </button>
          </div>

          {totalLicencias > 0 ? (
            <div className="space-y-3">
              {ficha.licencias!.map((lic) => {
                const badgeColor =
                  lic.estado === "justificada"
                    ? "bg-menta-100 text-menta-800 border-menta-300"
                    : lic.estado === "rechazada"
                    ? "bg-coral-100 text-coral-800 border-coral-300"
                    : "bg-sol-100 text-sol-800 border-sol-300";

                const badgeTexto =
                  lic.estado === "justificada"
                    ? "Aprobada · Justificada en Asistencia"
                    : lic.estado === "rechazada"
                    ? "Rechazada / Observada"
                    : "Pendiente de revisión por Educadora";

                return (
                  <article
                    key={lic.id}
                    className="rounded-3xl border border-white/90 bg-white/95 p-5 shadow-suave space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cielo-50 pb-3">
                      <span className={`insignia border text-xs font-bold ${badgeColor}`}>
                        {badgeTexto}
                      </span>
                      <span className="text-xs font-semibold text-tinta-suave flex items-center gap-1">
                        <Calendar className="size-3.5 text-cielo-500" />
                        Período: {lic.fecha_inicio} al {lic.fecha_termino} ({lic.dias_reposo} {lic.dias_reposo === 1 ? "día" : "días"})
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-bold text-tinta">
                        {lic.diagnostico_motivo || "Reposo prescrito por médico"}
                      </p>
                      <p className="text-xs text-tinta-suave">
                        Archivo: <span className="font-semibold text-tinta">{lic.nombre_archivo}</span>
                      </p>
                    </div>

                    {lic.observacion_educadora && (
                      <div className="rounded-2xl bg-cielo-50/70 p-3 text-xs text-tinta">
                        <span className="font-bold text-cielo-700">Nota de la Educadora: </span>
                        {lic.observacion_educadora}
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <a
                        href={lic.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-cielo-600 hover:text-cielo-700"
                      >
                        Ver documento en Google Drive <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-coral-200 bg-white/70 p-8 text-center space-y-3">
              <HeartPulse className="mx-auto size-10 text-coral-400" />
              <div className="space-y-1">
                <p className="font-bold text-tinta">No hay licencias médicas registradas</p>
                <p className="text-xs text-tinta-suave max-w-md mx-auto">
                  Si tu hijo o hija estuvo con reposo médico, puedes subir el certificado o licencia aquí para que su inasistencia quede justificada en el registro oficial.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalLicenciaAbierto(true)}
                className="boton-coral px-5 py-2.5 text-xs font-bold shadow-xs inline-flex items-center gap-2"
              >
                <Plus className="size-4" /> Subir Certificado o Licencia
              </button>
            </div>
          )}
        </section>
      )}

      {/* Sección 5: Agenda de Entrevistas y Actas PDF */}
      {pestana === "entrevistas" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-tinta flex items-center gap-2">
                <CalendarDays className="size-5 text-sol-500" />
                Agenda y Actas de Entrevistas
              </h2>
              <p className="text-xs text-tinta-suave">
                Coordina reuniones con la educadora de nivel y consulta las actas oficiales de acuerdos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalEntrevistaAbierto(true)}
              className="boton-sol px-4 py-2 text-xs font-bold shadow-xs inline-flex items-center gap-2"
            >
              <CalendarPlus className="size-4" /> Solicitar Entrevista
            </button>
          </div>

          {totalEntrevistas > 0 ? (
            <div className="space-y-4">
              {ficha.entrevistas!.map((e) => {
                const fechaFormateada = new Date(`${e.fecha}T12:00:00`).toLocaleDateString("es-CL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });

                const badgeEstado =
                  e.estado === "realizada"
                    ? "bg-menta-100 text-menta-700 border-menta-200"
                    : e.estado === "confirmada"
                    ? "bg-cielo-100 text-cielo-700 border-cielo-200"
                    : e.estado === "cancelada"
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : "bg-sol-100 text-sol-700 border-sol-200";

                const textoEstado =
                  e.estado === "realizada"
                    ? "Realizada · Con Acta"
                    : e.estado === "confirmada"
                    ? "Confirmada / Agendada"
                    : e.estado === "cancelada"
                    ? "Cancelada"
                    : "Solicitud Pendiente";

                return (
                  <article
                    key={e.id}
                    className="rounded-3xl border border-white/90 bg-white/95 p-6 shadow-suave space-y-4 transition hover:shadow-flotante"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-cielo-50 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="capitalize font-bold text-sm text-tinta">{fechaFormateada}</span>
                        <span className="text-xs text-tinta-suave">a las {e.hora} hrs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeEstado}`}>
                          {textoEstado}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 uppercase">
                          {e.modalidad}
                        </span>
                      </div>
                    </header>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-tinta-suave">
                        {e.solicitado_por === "apoderado" ? "Solicitada por el apoderado" : "Citación de la educadora"}
                      </p>
                      <p className="text-sm text-tinta font-medium leading-relaxed bg-cielo-50/50 p-3.5 rounded-2xl border border-cielo-100/60">
                        <span className="font-bold text-tinta">Motivo: </span>
                        {e.motivo}
                      </p>
                    </div>

                    {e.acuerdos_compromisos && (
                      <div className="rounded-2xl border border-menta-200 bg-menta-50/60 p-3.5 text-xs text-menta-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-menta-600" /> Acuerdos y Compromisos:
                        </p>
                        <p className="whitespace-pre-line leading-relaxed">{e.acuerdos_compromisos}</p>
                      </div>
                    )}

                    {e.drive_file_url && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-tinta-suave">
                          Acta oficial guardada en la carpeta digital del alumno en Google Drive
                        </span>
                        <a
                          href={e.drive_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="boton-sol px-3.5 py-1.5 text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
                        >
                          <FileText className="size-3.5" /> Ver Acta en PDF <ExternalLink className="size-3" />
                        </a>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-sol-200 bg-white/70 p-8 text-center space-y-3">
              <CalendarDays className="mx-auto size-10 text-sol-400" />
              <div className="space-y-1">
                <p className="font-bold text-tinta">No hay entrevistas registradas</p>
                <p className="text-xs text-tinta-suave max-w-md mx-auto">
                  Si necesitas conversar sobre el desarrollo, aprendizaje, salud o adaptación de tu hijo(a), puedes solicitar una cita con la educadora de su nivel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEntrevistaAbierto(true)}
                className="boton-sol px-5 py-2.5 text-xs font-bold shadow-xs inline-flex items-center gap-2"
              >
                <CalendarPlus className="size-4" /> Solicitar Entrevista con la Educadora
              </button>
            </div>
          )}
        </section>
      )}

      {/* Carpeta completa en Google Drive del párvulo (si está configurada) */}
      {ficha.parvulo?.drive_folder_url && (
        <div className="rounded-3xl border border-sol-200 bg-linear-to-r from-sol-100/70 via-white to-menta-100/70 p-6 shadow-suave">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-tinta flex items-center gap-2">
                <Heart className="size-5 text-coral-500 fill-coral-400" />
                Carpeta Digital del Alumno en Google Drive
              </h3>
              <p className="text-xs text-tinta-suave">
                Accede a la carpeta oficial con fotografías de actividades y documentos del jardín.
              </p>
            </div>
            <a
              href={ficha.parvulo.drive_folder_url}
              target="_blank"
              rel="noopener noreferrer"
              className="boton-sol px-4 py-2.5 text-sm font-bold shadow-xs whitespace-nowrap"
            >
              Abrir Carpeta en Drive <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      )}

      {/* Modal para subir licencia */}
      {modalLicenciaAbierto && ficha.parvulo && (
        <ModalSubirLicencia
          rutParvulo={ficha.parvulo.rut}
          nombreParvulo={`${ficha.parvulo.nombres} ${ficha.parvulo.apellidos}`}
          nombreNivel={ficha.parvulo.nivel}
          onCerrar={() => setModalLicenciaAbierto(false)}
          onExito={() => {
            setModalLicenciaAbierto(false);
            window.location.reload();
          }}
        />
      )}

      {/* Modal para solicitar entrevista */}
      {modalEntrevistaAbierto && ficha.parvulo && (
        <ModalSolicitarEntrevista
          rutParvulo={ficha.parvulo.rut}
          nombreParvulo={`${ficha.parvulo.nombres} ${ficha.parvulo.apellidos}`}
          nombreNivel={ficha.parvulo.nivel}
          onCerrar={() => setModalEntrevistaAbierto(false)}
          onExito={() => {
            setModalEntrevistaAbierto(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
