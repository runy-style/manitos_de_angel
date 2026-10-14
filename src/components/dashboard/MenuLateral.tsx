"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookHeart,
  CalendarCheck2,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  NotebookPen,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cerrarSesion } from "@/app/actions/auth";
import { usePerfil } from "./PerfilProvider";
import InsigniaRol from "./InsigniaRol";

type Item = { href: string; etiqueta: string; icono: LucideIcon; etapa?: number };

const ITEMS: Item[] = [
  { href: "/dashboard", etiqueta: "Inicio", icono: Home },
  { href: "/dashboard/parvulos", etiqueta: "Párvulos", icono: Users },
  { href: "/dashboard/asistencia", etiqueta: "Asistencia", icono: CalendarCheck2 },
  { href: "/dashboard/licencias", etiqueta: "Licencias Médicas", icono: HeartPulse },
  { href: "/dashboard/estadisticas", etiqueta: "Estadísticas", icono: BarChart3 },
  { href: "/dashboard/bitacora", etiqueta: "Bitácora", icono: NotebookPen },
  { href: "/dashboard/planificaciones", etiqueta: "Planificaciones", icono: BookHeart },
];

export default function MenuLateral() {
  const perfil = usePerfil();
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

  const iniciales = perfil.nombre_completo
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <>
      {/* Barra superior móvil */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-cielo-100 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/img/logo-manitos.jpg" alt="Logo" width={40} height={40} className="size-10 rounded-xl" />
          <span className="font-display text-lg font-semibold">Manitos de Ángel</span>
        </Link>
        <button
          id="abrir-menu"
          type="button"
          onClick={() => setAbierto(true)}
          className="grid size-11 cursor-pointer place-items-center rounded-2xl bg-cielo-50 text-cielo-600"
          aria-label="Abrir menú"
        >
          <Menu className="size-6" />
        </button>
      </div>

      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-40 bg-tinta/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/70 bg-white/90 p-5 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          abierto ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/img/logo-manitos.jpg" alt="Logo Manitos de Ángel" width={48} height={48} className="size-12 rounded-2xl shadow-suave" />
            <span className="leading-tight">
              <span className="block text-[0.65rem] font-bold uppercase tracking-[0.2em] text-cielo-600">Jardín Infantil</span>
              <span className="block font-display text-lg font-semibold">Manitos de Ángel</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="grid size-9 cursor-pointer place-items-center rounded-xl text-tinta-suave hover:bg-cielo-50 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1" aria-label="Menú del panel">
          {ITEMS.map(({ href, etiqueta, icono: Icono, etapa }) => {
            const activo = href === "/dashboard" ? ruta === href : ruta.startsWith(href);
            const base = "group flex items-center gap-3 rounded-2xl px-4 py-3 text-[0.95rem] font-bold transition";

            if (etapa) {
              return (
                <span
                  key={href}
                  className={`${base} cursor-not-allowed text-tinta-suave/60`}
                  title={`Disponible en la Etapa ${etapa}`}
                >
                  <Icono className="size-5" />
                  {etiqueta}
                  <span className="insignia ml-auto bg-sol-50 px-2 py-0.5 text-[0.65rem] text-sol-600">Pronto</span>
                </span>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                id={`menu-${etiqueta.toLowerCase()}`}
                onClick={() => setAbierto(false)}
                className={`${base} ${
                  activo
                    ? "bg-linear-to-r from-cielo-500 to-cielo-400 text-white shadow-flotante"
                    : "text-tinta hover:bg-cielo-50 hover:text-cielo-600"
                }`}
              >
                <Icono className="size-5 transition group-hover:scale-110" />
                {etiqueta}
              </Link>
            );
          })}

          {perfil.rol === "admin" && (
            <div className="pt-3 mt-3 border-t border-sol-200/60">
              <Link
                href="/dashboard/admin"
                id="menu-admin"
                onClick={() => setAbierto(false)}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-[0.95rem] font-bold transition ${
                  ruta.startsWith("/dashboard/admin")
                    ? "bg-linear-to-r from-sol-500 to-sol-400 text-white shadow-flotante"
                    : "text-sol-900 bg-sol-100/70 hover:bg-sol-200/80"
                }`}
              >
                <ShieldCheck className="size-5 transition group-hover:scale-110 text-sol-600 group-hover:text-sol-700" />
                <span>Administración</span>
                <span className="ml-auto rounded-lg bg-sol-300/80 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase text-sol-900">
                  Admin
                </span>
              </Link>
            </div>
          )}
        </nav>

        {/* Tarjeta de usuario */}
        <div className="mt-6 rounded-3xl bg-linear-to-br from-cielo-50 via-white to-menta-50 p-4 ring-1 ring-cielo-100">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sol-300 to-coral-300 font-display font-semibold text-white">
              {iniciales || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold">{perfil.nombre_completo}</p>
              <p className="truncate text-xs text-tinta-suave">{perfil.email}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <InsigniaRol rol={perfil.rol} />
            {perfil.nivel && <span className="insignia bg-sol-100 text-sol-600">{perfil.nivel.nombre}</span>}
          </div>
          <form action={cerrarSesion} className="mt-3">
            <button id="cerrar-sesion" type="submit" className="boton-suave w-full py-2 text-sm">
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
