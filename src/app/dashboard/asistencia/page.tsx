import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarCheck2, Users } from "lucide-react";
import SelectorNivel from "@/components/dashboard/SelectorNivel";
import SelectorFecha from "@/components/asistencia/SelectorFecha";
import PanelControlAsistencia from "@/components/asistencia/PanelControlAsistencia";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import type { Nivel, Parvulo, RegistroAsistencia } from "@/lib/types";

export const metadata: Metadata = {
  title: "Control de Asistencia Diaria",
};

interface PaginaAsistenciaProps {
  searchParams?: Promise<{ nivel?: string; fecha?: string }>;
}

export default async function PaginaAsistencia(props: PaginaAsistenciaProps) {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const supabase = await createClient();

  // 1. Cargar niveles
  const { data: niveles } = await supabase
    .from("niveles")
    .select("id, nombre, descripcion")
    .order("created_at")
    .returns<Nivel[]>();

  if (!niveles || niveles.length === 0) {
    return (
      <div className="tarjeta-vidrio p-12 text-center text-tinta-suave">
        <Users className="mx-auto mb-3 size-12 text-cielo-300" />
        <h2 className="text-xl font-bold text-tinta">No hay niveles registrados</h2>
        <p className="mt-2 text-sm">Ejecuta el script SQL en Supabase para crear los niveles.</p>
      </div>
    );
  }

  // 2. Resolver nivel seleccionado
  const nivelParam = typeof searchParams.nivel === "string" ? searchParams.nivel : undefined;
  const nivelSeleccionadoId =
    nivelParam && niveles.some((n) => n.id === nivelParam)
      ? nivelParam
      : sesion.perfil.nivel_id && niveles.some((n) => n.id === sesion.perfil.nivel_id)
      ? sesion.perfil.nivel_id
      : niveles[0].id;

  const nivelSeleccionado = niveles.find((n) => n.id === nivelSeleccionadoId)!;

  // 3. Resolver fecha seleccionada (por defecto hoy en Chile)
  const fechaHoyChile = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const fechaParam = typeof searchParams.fecha === "string" ? searchParams.fecha : undefined;
  const fechaSeleccionada =
    fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : fechaHoyChile;

  // 4. Cargar párvulos activos del nivel
  const { data: parvulosRaw } = await supabase
    .from("parvulos")
    .select("*")
    .eq("nivel_id", nivelSeleccionadoId)
    .eq("activo", true)
    .order("apellidos")
    .order("nombres")
    .returns<Parvulo[]>();

  const parvulos = parvulosRaw ?? [];

  // 5. Cargar registros de asistencia ya guardados para esta fecha y nivel
  const { data: asistenciasRaw } = await supabase
    .from("asistencia")
    .select("*")
    .eq("nivel_id", nivelSeleccionadoId)
    .eq("fecha", fechaSeleccionada)
    .returns<RegistroAsistencia[]>();

  const asistenciasGuardadas = asistenciasRaw ?? [];

  // 6. Cargar licencias médicas pendientes para este nivel
  const { count: licenciasPendientes } = await supabase
    .from("licencias_medicas")
    .select("*", { count: "exact", head: true })
    .eq("nivel_id", nivelSeleccionadoId)
    .eq("estado", "pendiente");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-tinta flex items-center gap-2">
            <CalendarCheck2 className="size-8 text-cielo-500" />
            Control de Asistencia Diaria
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Registro rápido en un toque por párvulo con guardado por lote en base de datos.
          </p>
        </div>
      </div>

      {/* Aviso de licencias médicas pendientes */}
      {Boolean(licenciasPendientes && licenciasPendientes > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-coral-200 bg-coral-50/90 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-coral-100 text-coral-600">
              <CalendarCheck2 className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-coral-900">
                Hay {licenciasPendientes} {licenciasPendientes === 1 ? "licencia médica pendiente" : "licencias médicas pendientes"} de revisión para este nivel.
              </p>
              <p className="text-[0.7rem] text-coral-700">
                Al aprobarlas, los días de inasistencia médica se justifican automáticamente en este registro.
              </p>
            </div>
          </div>
          <a
            href={`/dashboard/licencias?nivel=${nivelSeleccionadoId}`}
            className="boton-coral self-start sm:self-auto px-3.5 py-1.5 text-xs font-bold whitespace-nowrap"
          >
            Revisar y Justificar
          </a>
        </div>
      )}

      {/* Controles de Nivel y Fecha */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SelectorNivel
          niveles={niveles}
          nivelSeleccionadoId={nivelSeleccionadoId}
          rutaBase="/dashboard/asistencia"
        />
        <SelectorFecha fechaSeleccionada={fechaSeleccionada} />
      </div>

      {/* Panel interactivo de Asistencia */}
      <PanelControlAsistencia
        niveles={niveles}
        nivelSeleccionado={nivelSeleccionado}
        fechaSeleccionada={fechaSeleccionada}
        parvulos={parvulos}
        asistenciasGuardadas={asistenciasGuardadas}
        perfil={sesion.perfil}
      />
    </div>
  );
}
