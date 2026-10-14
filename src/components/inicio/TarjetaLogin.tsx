"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, LogIn, Mail } from "lucide-react";
import { iniciarSesion, type EstadoLogin } from "@/app/actions/auth";

export default function TarjetaLogin({ accesoRequerido }: { accesoRequerido: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(
    iniciarSesion,
    undefined,
  );
  const [verClave, setVerClave] = useState(false);

  return (
    <article
      id="tarjeta-login"
      className="tarjeta-vidrio relative overflow-hidden p-6 sm:p-8 animate-aparecer"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-cielo-200/50 blur-2xl" />

      <header className="relative mb-6 flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-cielo-100 text-cielo-600">
          <LockKeyhole className="size-7" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold text-tinta">Acceso Educadoras y Organización</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Ingresa con el correo y contraseña entregados por la dirección del jardín.
          </p>
        </div>
      </header>

      {accesoRequerido && !estado?.error && (
        <p className="relative mb-4 flex items-center gap-2 rounded-2xl bg-sol-100 px-4 py-3 text-sm font-semibold text-sol-600">
          <AlertCircle className="size-4 shrink-0" />
          Debes iniciar sesión para entrar al panel interno.
        </p>
      )}

      <form action={accion} className="relative space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="etiqueta">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-cielo-400" />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={estado?.email}
              placeholder="educadora@manitosdeangel.cl"
              className="campo pl-12"
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="etiqueta">
            Contraseña
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-cielo-400" />
            <input
              id="login-password"
              name="password"
              type={verClave ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="campo px-12"
            />
            <button
              id="login-ver-clave"
              type="button"
              onClick={() => setVerClave((v) => !v)}
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-xl text-tinta-suave transition hover:bg-cielo-50 hover:text-cielo-600"
              aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {verClave ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>

        {estado?.error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-2xl bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-600 animate-sacudir"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {estado.error}
          </p>
        )}

        <button id="login-enviar" type="submit" disabled={pendiente} className="boton-primario w-full py-3.5 text-lg">
          {pendiente ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Ingresando…
            </>
          ) : (
            <>
              <LogIn className="size-5" /> Ingresar al panel
            </>
          )}
        </button>
      </form>
    </article>
  );
}
