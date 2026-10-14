import Image from "next/image";
import Link from "next/link";
import {
  BookHeart,
  CalendarCheck2,
  FolderHeart,
  LayoutDashboard,
  NotebookPen,
  Star,
} from "lucide-react";
import TarjetaLogin from "@/components/inicio/TarjetaLogin";
import PortalApoderados from "@/components/inicio/PortalApoderados";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { obtenerSesion } from "@/lib/sesion";

const CARACTERISTICAS = [
  {
    icono: CalendarCheck2,
    titulo: "Asistencia diaria",
    texto: "Registro en un toque y porcentajes por párvulo, nivel y mes.",
    color: "bg-cielo-100 text-cielo-600",
  },
  {
    icono: NotebookPen,
    titulo: "Bitácora de avances",
    texto: "Observaciones pedagógicas compartidas con cada familia.",
    color: "bg-menta-100 text-menta-600",
  },
  {
    icono: BookHeart,
    titulo: "Planificaciones",
    texto: "Planificaciones mensuales y pautas de evaluación por nivel.",
    color: "bg-sol-100 text-sol-600",
  },
  {
    icono: FolderHeart,
    titulo: "Carpeta en Drive",
    texto: "Fotos y documentos ordenados en una carpeta por párvulo.",
    color: "bg-coral-100 text-coral-500",
  },
];

export default async function Inicio(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const accesoRequerido = searchParams.acceso === "requerido";
  const sesion = await obtenerSesion();
  const conSesion = sesion.tipo === "ok" || sesion.tipo === "sin-perfil";

  return (
    <div className="relative isolate flex-1 overflow-hidden">
      {/* Fondo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 size-[28rem] rounded-full bg-cielo-200/60 blur-3xl animate-flotar-lento" />
        <div className="absolute -right-24 top-40 size-[24rem] rounded-full bg-menta-200/60 blur-3xl animate-flotar" />
        <div className="absolute bottom-0 left-1/3 size-[26rem] rounded-full bg-sol-200/50 blur-3xl animate-flotar-lento" />
        <Star className="absolute left-[8%] top-[22%] size-6 fill-sol-300 text-sol-300 animate-flotar" />
        <Star className="absolute right-[12%] top-[12%] size-4 fill-cielo-300 text-cielo-300 animate-flotar-lento" />
        <Star className="absolute right-[6%] top-[58%] size-5 fill-coral-200 text-coral-200 animate-flotar" />
      </div>

      {/* Barra superior */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" id="logo-inicio">
          <Image
            src="/img/logo-manitos.jpg"
            alt="Logo Jardín Infantil Manitos de Ángel"
            width={56}
            height={56}
            priority
            className="size-12 rounded-2xl bg-white object-cover shadow-suave sm:size-14"
          />
          <span className="leading-tight">
            <span className="block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-cielo-600">
              Jardín Infantil
            </span>
            <span className="block font-display text-xl font-semibold text-tinta sm:text-2xl">
              Manitos de Ángel
            </span>
          </span>
        </Link>
        {conSesion ? (
          <Link href="/dashboard" id="ir-dashboard" className="boton-primario px-4 py-2.5 text-sm">
            <LayoutDashboard className="size-4" /> Ir al panel
          </Link>
        ) : (
          <a href="#acceso" className="boton-suave hidden px-4 py-2.5 text-sm sm:inline-flex">
            Ingresar
          </a>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-10 pt-4 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-16 lg:pt-10">
          <div className="animate-aparecer">
            <p className="insignia mb-5 bg-white/80 text-menta-600 shadow-suave">
              <span className="size-2 rounded-full bg-menta-400" /> Plataforma educativa del jardín
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] text-tinta sm:text-5xl lg:text-6xl">
              Cuidamos cada paso de su{" "}
              <span className="relative whitespace-nowrap text-cielo-500">
                gran aventura
                <svg
                  aria-hidden
                  viewBox="0 0 200 12"
                  className="absolute -bottom-2 left-0 h-3 w-full text-sol-300"
                  preserveAspectRatio="none"
                >
                  <path d="M2 9 Q 50 2 100 7 T 198 5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-tinta-suave">
              Un espacio cálido y seguro donde educadoras y familias comparten la asistencia, los
              avances y los mejores momentos de nuestros párvulos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#acceso" id="cta-acceso" className="boton-primario">
                Acceso al sistema
              </a>
              <a href="#acceso" id="cta-apoderados" className="boton-suave">
                Soy apoderado/a
              </a>
            </div>
          </div>

          <div className="relative animate-aparecer [animation-delay:150ms]">
            <div className="absolute inset-4 -z-10 rotate-3 rounded-[2.5rem] bg-linear-to-br from-sol-200 to-menta-200" />
            <Image
              src="/img/hero-jardin.jpg"
              alt="Ilustración de niños y niñas jugando felices en el jardín"
              width={1200}
              height={896}
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="w-full -rotate-1 rounded-[2.5rem] border-8 border-white object-cover shadow-flotante"
            />
          </div>
        </section>

        {/* Accesos */}
        <section id="acceso" className="mx-auto w-full max-w-6xl scroll-mt-6 px-5 pb-16 sm:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold text-tinta sm:text-4xl">¿Cómo quieres ingresar?</h2>
            <p className="mt-2 text-tinta-suave">Elige tu tipo de acceso para continuar.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <TarjetaLogin accesoRequerido={accesoRequerido} />
            <PortalApoderados supabaseListo={supabaseConfigurado()} />
          </div>
        </section>

        {/* Características */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARACTERISTICAS.map(({ icono: Icono, titulo, texto, color }) => (
              <article
                key={titulo}
                className="group rounded-3xl border border-white/70 bg-white/60 p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-suave"
              >
                <span className={`mb-4 grid size-12 place-items-center rounded-2xl transition group-hover:scale-110 group-hover:-rotate-6 ${color}`}>
                  <Icono className="size-6" />
                </span>
                <h3 className="text-lg font-semibold">{titulo}</h3>
                <p className="mt-1 text-sm text-tinta-suave">{texto}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-cielo-100 bg-white/60 py-6 text-center text-sm text-tinta-suave backdrop-blur">
        © {new Date().getFullYear()} Jardín Infantil Manitos de Ángel · Hecho con cariño para nuestras familias
      </footer>
    </div>
  );
}
