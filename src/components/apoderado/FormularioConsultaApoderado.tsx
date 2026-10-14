"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
} from "lucide-react";
import { formatearRut, limpiarRut, validarRut } from "@/lib/rut";

interface Props {
  rutInicial?: string;
  pinInicial?: string;
  errorInicial?: string | null;
  requierePinInicial?: boolean;
  nombreParvulo?: string;
}

export default function FormularioConsultaApoderado({
  rutInicial = "",
  pinInicial = "",
  errorInicial = null,
  requierePinInicial = false,
  nombreParvulo,
}: Props) {
  const router = useRouter();
  const [rut, setRut] = useState(formatearRut(rutInicial));
  const [pin, setPin] = useState(pinInicial);
  const [mostrarPasoPin, setMostrarPasoPin] = useState(requierePinInicial);
  const [mostrarPin, setMostrarPin] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(errorInicial);

  const rutValido = validarRut(rut);
  const rutCompleto = limpiarRut(rut).length >= 8;
  const mostrarErrorRut = (tocado || rutCompleto) && rut.length > 0 && !rutValido;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTocado(true);
    setError(null);

    if (!rutValido) {
      setError("Por favor ingresa un RUT chileno válido antes de consultar.");
      return;
    }

    if (mostrarPasoPin && pin.length !== 4) {
      setError("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }

    setCargando(true);
    let url = `/apoderado?rut=${encodeURIComponent(rut)}`;
    if (pin.trim()) {
      url += `&pin=${encodeURIComponent(pin.trim())}`;
    }
    router.push(url);
  }

  return (
    <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-flotante sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mostrarPasoPin ? (
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
                <label htmlFor="pin-apoderado-portal" className="etiqueta text-sm font-bold">
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
                id="pin-apoderado-portal"
                type={mostrarPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                autoFocus
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

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarPasoPin(false);
                  setPin("");
                  setError(null);
                  router.push("/apoderado");
                }}
                className="boton-suave px-4 py-3 text-xs font-bold flex-1"
              >
                <ArrowLeft className="size-4" /> Ingresar otro RUT
              </button>
              <button
                type="submit"
                disabled={cargando || pin.length !== 4}
                className="boton-sol px-6 py-3 text-sm font-bold flex-1 shadow-md inline-flex items-center justify-center gap-2"
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

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-center text-[11px] text-tinta-suave">
              <span>¿No recuerdas tu PIN? Solicita a la educadora de tu nivel o a dirección restablecerlo en segundos.</span>
            </div>
          </div>
        ) : (
          /* Paso 1: Ingreso de RUT */
          <div className="space-y-4">
            <div>
              <label htmlFor="rut-apoderado-portal" className="etiqueta text-sm font-bold">
                RUT del párvulo
              </label>
              <div className="relative">
                <input
                  id="rut-apoderado-portal"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  placeholder="12.345.678-9"
                  value={rut}
                  onChange={(e) => {
                    setRut(formatearRut(e.target.value));
                    setError(null);
                  }}
                  onBlur={() => setTocado(true)}
                  className={`campo pr-12 text-lg font-bold tracking-wider ${
                    mostrarErrorRut ? "campo-error" : ""
                  }`}
                />
                {rutValido && (
                  <CheckCircle2 className="absolute right-4 top-1/2 size-6 -translate-y-1/2 text-menta-500" />
                )}
              </div>
              <p
                className={`mt-1.5 text-xs font-semibold ${
                  mostrarErrorRut ? "text-coral-500" : "text-tinta-suave"
                }`}
              >
                {mostrarErrorRut
                  ? "El RUT ingresado no es válido. Verifica el número y dígito verificador."
                  : "Formato automático con puntos y guion. Ej: 24.123.456-7"}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-2xl bg-coral-50 p-4 text-sm font-semibold text-coral-600 animate-sacudir"
              >
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </p>
            )}

            <button
              id="btn-consultar-apoderado"
              type="submit"
              disabled={cargando || !rutValido}
              className="boton-sol w-full py-4 text-lg font-bold shadow-md"
            >
              {cargando ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> Buscando información…
                </>
              ) : (
                <>
                  <Search className="size-5" /> Consultar Ficha del Párvulo
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
