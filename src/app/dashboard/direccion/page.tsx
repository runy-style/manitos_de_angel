import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert, Database } from "lucide-react";
import PanelDireccionPersonal from "@/components/dashboard/direccion/PanelDireccionPersonal";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import type {
  FuncionariaConSaldo,
  ReemplazoPersonal,
  SolicitudPermiso,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Dirección: Dotación, Reemplazos y Permisos",
  description:
    "Módulo exclusivo de Dirección para control de dotación, seguimiento de permisos administrativos y cobertura de reemplazos.",
};

export const dynamic = "force-dynamic";

export default async function PaginaDireccionPersonal() {
  const sesion = await obtenerSesion();

  if (sesion.tipo !== "ok") {
    redirect("/dashboard");
  }

  // Verificación estricta de seguridad en el servidor:
  // Solo los roles "organizacion" (Dirección) o "admin" pueden acceder
  const rol = sesion.perfil.rol;
  const esAutorizado = rol === "admin" || rol === "organizacion";

  if (!esAutorizado) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Consultar en paralelo: dotación con saldos en tiempo real, reemplazos e historial de permisos
  const [dotacionRes, reemplazosRes, permisosRes] = await Promise.all([
    supabase
      .from("vista_saldos_permisos")
      .select("*")
      .order("apellidos", { ascending: true }),
    supabase
      .from("reemplazos")
      .select(`
        id,
        titular_id,
        reemplazante_nombre,
        reemplazante_id,
        motivo,
        fecha_inicio,
        fecha_termino,
        observaciones,
        activo,
        created_at,
        updated_at,
        titular:personal!titular_id (
          id,
          nombres,
          apellidos,
          rut,
          estamento_rol
        )
      `)
      .order("fecha_inicio", { ascending: false }),
    supabase
      .from("solicitudes_permisos")
      .select(`
        id,
        funcionaria_id,
        fecha_solicitada,
        fecha_termino,
        dias_solicitados,
        estado,
        periodo_ano,
        observaciones,
        registrado_por,
        created_at,
        funcionaria:personal!funcionaria_id (
          id,
          nombres,
          apellidos,
          rut,
          estamento_rol
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  // Si las tablas aún no han sido migradas en la base de datos de Supabase
  if (dotacionRes.error && dotacionRes.error.code === "42P01") {
    return (
      <div className="mx-auto max-w-4xl py-12 px-4">
        <div className="tarjeta-vidrio p-8 text-center border-amber-200 bg-amber-50/50">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <Database className="size-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-tinta">
            Módulo de Dirección pendiente de inicializar en Supabase
          </h1>
          <p className="mt-2 text-sm text-tinta-suave max-w-xl mx-auto">
            Las tablas de personal, reemplazos y permisos administrativos aún no están creadas en la base de datos.
          </p>
          <div className="mt-6 rounded-2xl bg-white p-5 text-left border border-amber-200 text-xs text-tinta-suave font-mono overflow-x-auto">
            <p className="font-sans font-bold text-sm text-tinta mb-2">Pasos para activar este módulo:</p>
            <ol className="list-decimal list-inside space-y-1 font-sans text-xs text-tinta/80">
              <li>Ingresa a tu consola de Supabase.</li>
              <li>Abre el <strong>SQL Editor</strong>.</li>
              <li>Copia y ejecuta el archivo: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">supabase/modulo_direccion_personal_permisos.sql</code>.</li>
              <li>Recarga esta página para comenzar a gestionar la dotación y permisos.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const dotacion = ((dotacionRes.data ?? []) as unknown) as FuncionariaConSaldo[];
  const reemplazos = ((reemplazosRes.data ?? []) as unknown) as ReemplazoPersonal[];
  const permisosRecientes = ((permisosRes.data ?? []) as unknown) as SolicitudPermiso[];

  return (
    <PanelDireccionPersonal
      dotacion={dotacion}
      reemplazos={reemplazos}
      permisosRecientes={permisosRecientes}
    />
  );
}
