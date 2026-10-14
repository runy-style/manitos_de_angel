import {
  BarChart3,
  CalendarCheck2,
  Eye,
  NotebookPen,
  PencilLine,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puedeEditarNivel } from "@/lib/permisos";
import type { Nivel } from "@/lib/types";
import BotonEdicion from "@/components/dashboard/BotonEdicion";
import InsigniaRol from "@/components/dashboard/InsigniaRol";

const COLORES_NIVEL = [
  "from-cielo-200 to-cielo-100 text-cielo-700",
  "from-menta-200 to-menta-100 text-menta-700",
  "from-sol-200 to-sol-100 text-sol-600",
  "from-coral-200 to-coral-100 text-coral-600",
  "from-lavanda-200 to-lavanda-100 text-lavanda-500",
];

function saludo() {
  const hora = Number(
    new Intl.DateTimeFormat("es-CL", { hour: "numeric", hour12: false, timeZone: "America/Santiago" }).format(new Date()),
  );
  if (hora < 12) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function PanelInicio() {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") return null; // El layout ya gestiona los demás casos.
  const { perfil } = sesion;

  const supabase = await createClient();
  const [{ data: niveles }, { data: parvulos }] = await Promise.all([
    supabase.from("niveles").select("id, nombre, descripcion").order("created_at").returns<Nivel[]>(),
    supabase.from("parvulos").select("nivel_id").eq("activo", true).returns<{ nivel_id: string }[]>(),
  ]);

  const conteo = new Map<string, number>();
  parvulos?.forEach((p) => conteo.set(p.nivel_id, (conteo.get(p.nivel_id) ?? 0) + 1));

  const fecha = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Santiago",
  }).format(new Date());

  const esAdmin = perfil.rol === "admin";
  const esEducadora = perfil.rol === "educadora";
  const primerNombre = perfil.nombre_completo.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Bienvenida */}
      <header className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-cielo-400 via-cielo-300 to-menta-300 p-6 text-white shadow-flotante sm:p-8 animate-aparecer">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/20" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-24 size-24 rounded-full bg-sol-200/50" />
        <p className="text-sm font-bold capitalize text-white/90">{fecha}</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
          {saludo()}, {primerNombre} 👋
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <InsigniaRol rol={perfil.rol} className="bg-white/90!" />
          {perfil.nivel && <span className="insignia bg-white/25 text-white ring-1 ring-white/40">Nivel: {perfil.nivel.nombre}</span>}
        </div>
      </header>

      {/* Permisos del usuario */}
      <section
        className={`flex items-start gap-4 rounded-3xl p-5 ring-1 animate-aparecer [animation-delay:80ms] ${
          esAdmin
            ? "bg-sol-50 ring-sol-200"
            : esEducadora
            ? "bg-menta-50 ring-menta-200"
            : "bg-cielo-50 ring-cielo-200"
        }`}
      >
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
            esAdmin
              ? "bg-sol-100 text-sol-600"
              : esEducadora
              ? "bg-menta-100 text-menta-600"
              : "bg-cielo-100 text-cielo-600"
          }`}
        >
          {esAdmin || esEducadora ? <ShieldCheck className="size-6" /> : <Eye className="size-6" />}
        </span>
        <div>
          <h2 className="text-lg font-semibold">
            {esAdmin
              ? "Administrador del Sistema — Permisos Totales"
              : esEducadora
              ? "Puedes editar tu nivel asignado"
              : "Modo solo lectura"}
          </h2>
          <p className="text-sm text-tinta-suave">
            {esAdmin
              ? "Tienes permisos completos para inscribir párvulos, registrar asistencia, bitácoras y gestionar archivos en todos los niveles del jardín infantil."
              : esEducadora
              ? perfil.nivel
                ? `Registras asistencia, bitácoras, planificaciones y archivos de ${perfil.nivel.nombre}. Los demás niveles los ves en solo lectura.`
                : "Aún no tienes un nivel asignado. Pide a la dirección que lo configure en tu perfil."
              : "Puedes revisar todos los niveles, estadísticas, bitácoras y planificaciones del jardín, sin modificar los registros de las educadoras."}
          </p>
        </div>
      </section>

      {/* Niveles */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Niveles del jardín</h2>
          <p className="text-sm text-tinta-suave">{niveles?.length ?? 0} niveles</p>
        </div>

        {!niveles?.length ? (
          <p className="tarjeta-vidrio p-6 text-center text-tinta-suave">
            No hay niveles registrados todavía. Ejecuta el script SQL inicial en Supabase.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {niveles.map((nivel, i) => {
              const editable = puedeEditarNivel(perfil, nivel.id);
              const color = COLORES_NIVEL[i % COLORES_NIVEL.length];
              return (
                <article
                  key={nivel.id}
                  className={`tarjeta-vidrio group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 animate-aparecer ${
                    editable ? "ring-2 ring-menta-300" : ""
                  }`}
                  style={{ animationDelay: `${120 + i * 70}ms` }}
                >
                  <div className={`relative bg-linear-to-br p-5 ${color}`}>
                    <div aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-white/30 transition group-hover:scale-125" />
                    <div className="relative flex items-start justify-between gap-2">
                      <h3 className="text-xl font-semibold text-tinta">{nivel.nombre}</h3>
                      {editable ? (
                        <span className="insignia shrink-0 bg-white text-menta-600">
                          <PencilLine className="size-3.5" /> {esAdmin ? "Acceso Total" : "Tu nivel"}
                        </span>
                      ) : (
                        <span className="insignia shrink-0 bg-white/70 text-tinta-suave">
                          <Eye className="size-3.5" /> Solo lectura
                        </span>
                      )}
                    </div>
                    {nivel.descripcion && <p className="relative mt-1 text-sm text-tinta/70">{nivel.descripcion}</p>}
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <p className="flex items-center gap-2 text-sm font-bold text-tinta">
                      <Users className="size-4 text-cielo-500" />
                      {conteo.get(nivel.id) ?? 0} párvulos activos
                    </p>
                    <div className="mt-auto grid grid-cols-3 gap-2">
                      <a
                        href={`/dashboard/parvulos?nivel=${nivel.id}`}
                        className="boton-suave flex-col gap-1 px-2 py-2 text-xs text-center"
                        aria-label={`Ver párvulos de ${nivel.nombre}`}
                      >
                        <Users className="size-4 text-cielo-500" /> Párvulos
                      </a>
                      <a
                        href={`/dashboard/asistencia?nivel=${nivel.id}`}
                        className="boton-suave flex-col gap-1 px-2 py-2 text-xs text-center"
                        aria-label={`Controlar asistencia en ${nivel.nombre}`}
                      >
                        <CalendarCheck2 className="size-4 text-menta-500" /> Asistencia
                      </a>
                      <a
                        href={`/dashboard/estadisticas?nivel=${nivel.id}`}
                        className="boton-suave flex-col gap-1 px-2 py-2 text-xs text-center"
                        aria-label={`Estadísticas de ${nivel.nombre}`}
                      >
                        <BarChart3 className="size-4 text-sol-500" /> Estadísticas
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
