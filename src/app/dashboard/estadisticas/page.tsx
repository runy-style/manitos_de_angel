import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, Users } from "lucide-react";
import SelectorNivel from "@/components/dashboard/SelectorNivel";
import FiltroMesAnio from "@/components/estadisticas/FiltroMesAnio";
import VistaEstadisticas, {
  type ItemEstadisticaParvulo,
} from "@/components/estadisticas/VistaEstadisticas";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import type { Nivel, Parvulo } from "@/lib/types";

export const metadata: Metadata = {
  title: "Estadísticas y Porcentajes de Asistencia",
};

export default async function PaginaEstadisticas(props: PageProps<"/dashboard/estadisticas">) {
  const sesion = await obtenerSesion();
  if (sesion.tipo !== "ok") {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
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

  // 2. Determinar nivel seleccionado
  const nivelParam = typeof searchParams.nivel === "string" ? searchParams.nivel : undefined;
  const nivelSeleccionadoId =
    nivelParam && niveles.some((n) => n.id === nivelParam)
      ? nivelParam
      : sesion.perfil.nivel_id && niveles.some((n) => n.id === sesion.perfil.nivel_id)
      ? sesion.perfil.nivel_id
      : niveles[0].id;

  const nivelSeleccionado = niveles.find((n) => n.id === nivelSeleccionadoId)!;

  // 3. Mes y Año seleccionados
  const hoy = new Date();
  const mesParam = typeof searchParams.mes === "string" ? Number(searchParams.mes) : undefined;
  const anioParam = typeof searchParams.anio === "string" ? Number(searchParams.anio) : undefined;

  const mes = mesParam && mesParam >= 1 && mesParam <= 12 ? mesParam : hoy.getMonth() + 1;
  const anio = anioParam && anioParam >= 2020 && anioParam <= 2035 ? anioParam : hoy.getFullYear();

  // Fecha de hoy en Chile
  const hoyChileStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(hoy);

  // Rango del mes
  const primerDiaMes = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDiaNum = new Date(anio, mes, 0).getDate();
  const ultimoDiaMes = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDiaNum).padStart(2, "0")}`;

  // Rango del año
  const primerDiaAnio = `${anio}-01-01`;
  const ultimoDiaAnio = `${anio}-12-31`;

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
  const parvuloIds = parvulos.map((p) => p.id);

  // 5. Cargar asistencias del año para este nivel
  let asistenciasAnio: { parvulo_id: string; fecha: string; estado: string }[] = [];
  if (parvuloIds.length > 0) {
    const { data: asistencias } = await supabase
      .from("asistencia")
      .select("parvulo_id, fecha, estado")
      .eq("nivel_id", nivelSeleccionadoId)
      .gte("fecha", primerDiaAnio)
      .lte("fecha", ultimoDiaAnio)
      .returns<{ parvulo_id: string; fecha: string; estado: string }[]>();

    asistenciasAnio = asistencias ?? [];
  }

  // 6. Calcular porcentajes y estadísticas
  // a) Hoy
  const asistenciasHoy = asistenciasAnio.filter((a) => a.fecha === hoyChileStr);
  const totalHoy = asistenciasHoy.length;
  const presentesHoy = asistenciasHoy.filter((a) => a.estado === "presente").length;
  const porcentajeDia = totalHoy > 0 ? Math.round((presentesHoy / totalHoy) * 100) : 0;

  // b) Mes
  const asistenciasMes = asistenciasAnio.filter(
    (a) => a.fecha >= primerDiaMes && a.fecha <= ultimoDiaMes,
  );
  const fechasUnicasMes = new Set(asistenciasMes.map((a) => a.fecha));
  const totalDiasRegistradosMes = fechasUnicasMes.size;

  const totalMes = asistenciasMes.length;
  const presentesMes = asistenciasMes.filter((a) => a.estado === "presente").length;
  const porcentajeMesNivel = totalMes > 0 ? Math.round((presentesMes / totalMes) * 100) : 0;

  // c) Anual
  const totalAnio = asistenciasAnio.length;
  const presentesAnio = asistenciasAnio.filter((a) => a.estado === "presente").length;
  const porcentajeAnualNivel = totalAnio > 0 ? Math.round((presentesAnio / totalAnio) * 100) : 0;

  // d) Individual por párvulo
  const parvulosStats: ItemEstadisticaParvulo[] = parvulos.map((p) => {
    // Registros del mes para este párvulo
    const delMes = asistenciasMes.filter((a) => a.parvulo_id === p.id);
    const totalM = delMes.length;
    const presM = delMes.filter((a) => a.estado === "presente").length;
    const ausM = delMes.filter((a) => a.estado === "ausente").length;
    const justM = delMes.filter((a) => a.estado === "justificado").length;
    const pctM = totalM > 0 ? Math.round((presM / totalM) * 100) : 0;

    // Registros anuales para este párvulo
    const delAnio = asistenciasAnio.filter((a) => a.parvulo_id === p.id);
    const totalA = delAnio.length;
    const presA = delAnio.filter((a) => a.estado === "presente").length;
    const pctA = totalA > 0 ? Math.round((presA / totalA) * 100) : 0;

    return {
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      rut: p.rut,
      total_dias_mes: totalM,
      dias_presente_mes: presM,
      dias_ausente_mes: ausM,
      dias_justificado_mes: justM,
      porcentaje_mes: pctM,
      total_dias_anual: totalA,
      porcentaje_anual: pctA,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-semibold text-tinta flex items-center gap-2">
          <BarChart3 className="size-8 text-sol-500" />
          Estadísticas y Porcentajes de Asistencia
        </h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Métricas consolidadas por nivel, mes y año con alerta temprana de inasistencia.
        </p>
      </div>

      {/* Controles de Nivel y Fecha */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SelectorNivel
          niveles={niveles}
          nivelSeleccionadoId={nivelSeleccionadoId}
          rutaBase="/dashboard/estadisticas"
        />
        <FiltroMesAnio mesSeleccionado={mes} anioSeleccionado={anio} />
      </div>

      {/* Vista de Estadísticas */}
      <VistaEstadisticas
        nivelSeleccionado={nivelSeleccionado}
        mes={mes}
        anio={anio}
        porcentajeDia={porcentajeDia}
        porcentajeMesNivel={porcentajeMesNivel}
        porcentajeAnualNivel={porcentajeAnualNivel}
        totalDiasRegistradosMes={totalDiasRegistradosMes}
        parvulosStats={parvulosStats}
      />
    </div>
  );
}
