"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  HeartHandshake,
  KeyRound,
  Loader2,
  Lock,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatearRut, limpiarRut, normalizarRut, validarRut } from "@/lib/rut";
import type { FichaApoderado } from "@/lib/types";

type Props = { supabaseListo: boolean };

const COLOR_ESTADO: Record<string, string> = {
  presente: "bg-menta-100 text-menta-700",
  ausente: "bg-coral-100 text-coral-600",
  justificado: "bg-sol-100 text-sol-600",
};

export default function PortalApoderados({ supabaseListo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);

  return (
    <>
      <article
        id="tarjeta-apoderados"
        className="tarjeta-vidrio relative flex flex-col overflow-hidden p-6 sm:p-8 animate-aparecer [animation-delay:120ms]"
      >
        <div className="pointer-events-none absolute -bottom-20 -left-16 size-56 rounded-full bg-sol-200/60 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 top-10 size-32 rounded-full bg-menta-200/60 blur-2xl" />

        <header className="relative mb-5 flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sol-100 text-sol-600">
            <HeartHandshake className="size-7" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-tinta">Consulta para Apoderados</h2>
            <p className="mt-1 text-sm text-tinta-suave">
              Sin usuario ni contraseña: solo necesitas el RUT de tu hijo o hija.
            </p>
          </div>
        </header>

        <ul className="relative mb-6 space-y-3 text-sm text-tinta">
          {[
            "Porcentaje de asistencia y días registrados",
            "Historial reciente de asistencia",
            "Observaciones de avance de la educadora",
          ].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-menta-500" />
              {t}
            </li>
          ))}
        </ul>

        <button
          id="abrir-portal-apoderados"
          type="button"
          onClick={() => setAbierto(true)}
          className="boton-sol relative mt-auto w-full py-3.5 text-lg"
        >
          <Sparkles className="size-5" /> Abrir Portal de Apoderados
        </button>
      </article>

      {abierto && (
        <ModalApoderados supabaseListo={supabaseListo} onCerrar={cerrar} />
      )}
    </>
  );
}

function ModalApoderados({
  supabaseListo,
  onCerrar,
}: {
  supabaseListo: boolean;
  onCerrar: () => void;
}) {
  const [rut, setRut] = useState("");
  const [pin, setPin] = useState("");
  const [requierePin, setRequierePin] = useState(false);
  const [nombreParvulo, setNombreParvulo] = useState<string | null>(null);
  const [mostrarPin, setMostrarPin] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ficha, setFicha] = useState<FichaApoderado | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const rutCompleto = limpiarRut(rut).length >= 8;
  const rutValido = validarRut(rut);
  const mostrarErrorRut = (tocado || rutCompleto) && rut.length > 0 && !rutValido;

  // Cerrar con Escape, bloquear el scroll del fondo y enfocar el campo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar]);

  async function consultar(e: FormEvent) {
    e.preventDefault();
    setTocado(true);
    setError(null);
    if (!rutValido) return;

    if (requierePin && pin.length !== 4) {
      setError("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }

    if (!supabaseListo) {
      setError("El portal aún no está conectado a la base de datos del jardín.");
      return;
    }

    setCargando(true);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("consultar_ficha_apoderado", {
        p_rut: normalizarRut(rut),
        p_pin: pin.trim() || null,
      });
      if (rpcError) throw rpcError;
      const resultado = data as FichaApoderado;
      if (resultado?.requiere_pin && !resultado?.encontrado) {
        setRequierePin(true);
        setNombreParvulo(resultado.parvulo_nombre || null);
        setError(resultado.pin_incorrecto ? (resultado.mensaje ?? "PIN incorrecto.") : null);
        setFicha(null);
        setTimeout(() => pinInputRef.current?.focus(), 100);
      } else if (!resultado?.encontrado) {
        setError(resultado?.mensaje ?? "No se encontró un párvulo activo con el RUT indicado.");
        setFicha(null);
      } else {
        setFicha(resultado);
        setError(null);
      }
    } catch {
      setError("No pudimos realizar la consulta. Intenta nuevamente en unos minutos.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-portal-apoderados"
    >
      <button
        type="button"
        aria-label="Cerrar portal"
        onClick={onCerrar}
        className="absolute inset-0 cursor-default bg-tinta/40 backdrop-blur-sm"
      />

      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-crema shadow-2xl animate-modal sm:rounded-[2rem]">
        {/* Cabecera decorativa */}
        <div className="relative overflow-hidden bg-linear-to-br from-sol-200 via-sol-100 to-menta-100 px-6 pb-6 pt-7">
          <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/40" />
          <div className="pointer-events-none absolute right-16 top-14 size-10 rounded-full bg-cielo-200/70" />
          <button
            id="cerrar-portal-apoderados"
            type="button"
            onClick={onCerrar}
            className="absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full bg-white/70 text-tinta transition hover:bg-white"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
          <p className="insignia mb-3 bg-white/70 text-sol-600">
            <HeartHandshake className="size-3.5" /> Portal de Apoderados
          </p>
          <h2 id="titulo-portal-apoderados" className="text-2xl font-semibold text-tinta">
            {requierePin ? "Ingreso de Seguridad" : "¿Cómo va tu pequeño/a?"}
          </h2>
          <p className="mt-1 text-sm text-tinta-suave">
            {requierePin
              ? "Esta ficha tiene PIN asignado para proteger la privacidad del alumno."
              : "Ingresa el RUT del párvulo para ver su asistencia y avances."}
          </p>
        </div>

        <div className="space-y-5 p-6">
          <form onSubmit={consultar} className="space-y-4" noValidate>
            {requierePin ? (
              /* Paso 2: Ingreso de PIN de Seguridad */
              <div className="space-y-4 animate-aparecer">
                <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4 flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-xs">
                    <Lock className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        Ficha Protegida
                      </span>
                      <span className="rounded-full bg-amber-200/80 px-2 py-0.2 text-[10px] font-bold text-amber-900">
                        PIN Activo
                      </span>
                    </div>
                    <p className="text-sm font-bold text-tinta truncate">
                      {nombreParvulo || `Alumno con RUT ${formatearRut(rut)}`}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="pin-modal-home" className="etiqueta text-sm font-bold">
                      Ingresa tu PIN de 4 dígitos
                    </label>
                    <button
                      type="button"
                      onClick={() => setMostrarPin(!mostrarPin)}
                      className="text-xs font-semibold text-cielo-600 hover:underline inline-flex items-center gap-1"
                    >
                      {mostrarPin ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      {mostrarPin ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <input
                    ref={pinInputRef}
                    id="pin-modal-home"
                    type={mostrarPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                      setPin(val);
                      setError(null);
                    }}
                    placeholder="••••"
                    className="campo text-center text-2xl font-mono tracking-[0.5em] font-bold py-3"
                  />
                  <p className="mt-1 text-xs text-tinta-suave text-center">
                    Ingresa los 4 números establecidos para acceder a los antecedentes.
                  </p>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-2xl bg-coral-50 p-3.5 text-xs font-semibold text-coral-700 animate-sacudir"
                  >
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </p>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRequierePin(false);
                      setPin("");
                      setError(null);
                    }}
                    className="boton-suave px-3 py-3 text-xs font-bold flex-1"
                  >
                    <ArrowLeft className="size-4" /> Cambiar RUT
                  </button>
                  <button
                    id="consultar-pin-home"
                    type="submit"
                    disabled={cargando || pin.length !== 4}
                    className="boton-sol px-4 py-3 text-sm font-bold flex-1 shadow-md inline-flex items-center justify-center gap-2"
                  >
                    {cargando ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Verificando...
                      </>
                    ) : (
                      <>
                        <KeyRound className="size-4" /> Entrar a Ficha
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-tinta-suave text-center">
                  ¿Olvidaste tu PIN? Solicita a la educadora de tu nivel restablecerlo.
                </p>
              </div>
            ) : (
              /* Paso 1: Ingreso de RUT normal */
              <div className="space-y-3">
                <label htmlFor="rut-parvulo" className="etiqueta">
                  RUT del párvulo
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="rut-parvulo"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="12.345.678-9"
                    value={rut}
                    onChange={(e) => {
                      setRut(formatearRut(e.target.value));
                      setError(null);
                    }}
                    onBlur={() => setTocado(true)}
                    aria-invalid={mostrarErrorRut}
                    aria-describedby="rut-ayuda"
                    className={`campo pr-12 text-lg font-bold tracking-wider ${mostrarErrorRut ? "campo-error" : ""}`}
                  />
                  {rutValido && (
                    <CheckCircle2 className="absolute right-4 top-1/2 size-6 -translate-y-1/2 text-menta-500" />
                  )}
                </div>
                <p
                  id="rut-ayuda"
                  className={`text-xs font-semibold ${mostrarErrorRut ? "text-coral-500" : "text-tinta-suave"}`}
                >
                  {mostrarErrorRut
                    ? "El RUT ingresado no es válido. Revisa los números y el dígito verificador."
                    : "Se formatea automáticamente. Ej: 24.123.456-7"}
                </p>

                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-2xl bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-600 animate-sacudir"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </p>
                )}

                <button
                  id="consultar-rut"
                  type="submit"
                  disabled={cargando || !rutValido}
                  className="boton-menta w-full py-3.5 text-lg font-bold"
                >
                  {cargando ? (
                    <>
                      <Loader2 className="size-5 animate-spin" /> Consultando…
                    </>
                  ) : (
                    <>
                      <Search className="size-5" /> Consultar ficha
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          {ficha?.parvulo && <ResumenFicha ficha={ficha} pin={pin} />}
        </div>
      </div>
    </div>
  );
}

function ResumenFicha({ ficha, pin }: { ficha: FichaApoderado; pin?: string }) {
  const porcentaje = Number(ficha.estadisticas?.porcentaje_asistencia ?? 0);
  const radio = 42;
  const circunferencia = 2 * Math.PI * radio;
  const color = porcentaje >= 75 ? "var(--color-menta-400)" : "var(--color-coral-400)";

  return (
    <section className="space-y-4 rounded-3xl border-2 border-menta-100 bg-white p-5 animate-aparecer">
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-24 -rotate-90">
            <circle cx="50" cy="50" r={radio} fill="none" stroke="var(--color-cielo-50)" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r={radio}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circunferencia}
              strokeDashoffset={circunferencia * (1 - porcentaje / 100)}
              className="transition-[stroke-dashoffset] duration-1000"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-xl font-semibold">
            {porcentaje}%
          </span>
        </div>
        <div>
          <h3 className="text-xl font-semibold">
            {ficha.parvulo!.nombres} {ficha.parvulo!.apellidos}
          </h3>
          <p className="insignia mt-1 bg-cielo-100 text-cielo-700">{ficha.parvulo!.nivel}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-tinta-suave">
            <CalendarCheck className="size-4" />
            {ficha.estadisticas?.dias_presente ?? 0} de {ficha.estadisticas?.total_dias_registrados ?? 0} días asistidos
          </p>
        </div>
      </div>

      {!!ficha.asistencia_reciente?.length && (
        <div>
          <p className="mb-2 text-sm font-bold">Últimos días registrados</p>
          <div className="flex flex-wrap gap-2">
            {ficha.asistencia_reciente.slice(0, 10).map((a) => (
              <span key={a.fecha} className={`insignia ${COLOR_ESTADO[a.estado] ?? ""}`}>
                {new Date(`${a.fecha}T12:00:00`).toLocaleDateString("es-CL", {
                  day: "2-digit",
                  month: "short",
                })}{" "}
                · {a.estado}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!ficha.bitacora?.length && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-tinta">Observaciones de la educadora ({ficha.bitacora.length})</p>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {ficha.bitacora.map((b) => (
              <blockquote key={b.id} className="rounded-2xl bg-lavanda-100/70 p-3.5 text-xs text-tinta">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-bold text-lavanda-600">{b.area_avance}</span>
                  <span className="text-[0.65rem] text-tinta-suave">
                    {new Date(`${b.fecha}T12:00:00`).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-line leading-relaxed text-tinta/90">{b.observacion}</p>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Botón para ver ficha completa e imprimir */}
      <div className="pt-2">
        <Link
          href={`/apoderado?rut=${encodeURIComponent(ficha.parvulo!.rut)}${pin ? `&pin=${encodeURIComponent(pin)}` : ""}`}
          className="boton-sol flex w-full items-center justify-center gap-2 py-3 text-sm font-bold shadow-xs"
        >
          <span>Ver Ficha Completa e Imprimir</span>
          <ExternalLink className="size-4" />
        </Link>
      </div>
    </section>
  );
}
