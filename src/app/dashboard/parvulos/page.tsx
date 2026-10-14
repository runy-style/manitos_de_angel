import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";
import SelectorNivel from "@/components/dashboard/SelectorNivel";
import VistaNominaParvulos from "@/components/parvulos/VistaNominaParvulos";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import type { Nivel, Parvulo, ParvuloConAsistencia } from "@/lib/types";

export const metadata: Metadata = {
  title: "Nómina de Párvulos",
};

interface PaginaParvulosProps {
  searchParams?: Promise<{ nivel?: string }>;
}

export default async function PaginaParvulos(props: PaginaParvulosProps) {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const supabase = await createClient();

  // 1. Cargar todos los niveles
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
        <p className="mt-2 text-sm">
          Ejecuta el script SQL en Supabase para crear los niveles del jardín.
        </p>
      </div>
    );
  }

  // 2. Determinar nivel seleccionado:
  //    - Si viene por query param ?nivel=... se usa ese
  //    - Sino, si el usuario es educadora y tiene nivel asignado, se usa el suyo
  //    - Sino, el primer nivel disponible
  const nivelParam = typeof searchParams.nivel === "string" ? searchParams.nivel : undefined;
  const nivelSeleccionadoId =
    nivelParam && niveles.some((n) => n.id === nivelParam)
      ? nivelParam
      : sesion.perfil.nivel_id && niveles.some((n) => n.id === sesion.perfil.nivel_id)
      ? sesion.perfil.nivel_id
      : niveles[0].id;

  const nivelSeleccionado = niveles.find((n) => n.id === nivelSeleccionadoId)!;

  // 3. Cargar párvulos del nivel
  const { data: parvulosRaw } = await supabase
    .from("parvulos")
    .select("*")
    .eq("nivel_id", nivelSeleccionadoId)
    .order("apellidos")
    .order("nombres")
    .returns<Parvulo[]>();

  const parvulosList = parvulosRaw ?? [];

  // 4. Cargar asistencia agregada para calcular % de asistencia acumulada de cada párvulo
  const parvuloIds = parvulosList.map((p) => p.id);
  const estadisticasMap = new Map<
    string,
    { total: number; presente: number; ausente: number; justificado: number }
  >();

  if (parvuloIds.length > 0) {
    const { data: asistencias } = await supabase
      .from("asistencia")
      .select("parvulo_id, estado")
      .in("parvulo_id", parvuloIds)
      .returns<{ parvulo_id: string; estado: string }[]>();

    asistencias?.forEach((a) => {
      const actual = estadisticasMap.get(a.parvulo_id) ?? {
        total: 0,
        presente: 0,
        ausente: 0,
        justificado: 0,
      };
      actual.total += 1;
      if (a.estado === "presente") actual.presente += 1;
      else if (a.estado === "ausente") actual.ausente += 1;
      else if (a.estado === "justificado") actual.justificado += 1;
      estadisticasMap.set(a.parvulo_id, actual);
    });
  }

  // 5. Mapear párvulos con estadísticas
  const parvulosConEstadisticas: ParvuloConAsistencia[] = parvulosList.map((p) => {
    const stats = estadisticasMap.get(p.id) ?? {
      total: 0,
      presente: 0,
      ausente: 0,
      justificado: 0,
    };
    const porcentaje =
      stats.total > 0 ? Math.round((stats.presente / stats.total) * 1000) / 10 : 0;

    return {
      ...p,
      total_dias: stats.total,
      dias_presente: stats.presente,
      dias_ausente: stats.ausente,
      dias_justificado: stats.justificado,
      porcentaje_asistencia: porcentaje,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-semibold text-tinta">Nómina de Párvulos</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Gestión de alumnos, apoderados, carpetas en Drive y seguimiento individual.
        </p>
      </div>

      {/* Selector de Niveles */}
      <SelectorNivel
        niveles={niveles}
        nivelSeleccionadoId={nivelSeleccionadoId}
        rutaBase="/dashboard/parvulos"
      />

      {/* Vista de Alumnos del nivel */}
      <VistaNominaParvulos
        niveles={niveles}
        nivelSeleccionado={nivelSeleccionado}
        parvulos={parvulosConEstadisticas}
        perfil={sesion.perfil}
      />
    </div>
  );
}
