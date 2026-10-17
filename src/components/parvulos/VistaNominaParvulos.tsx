"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  FolderX,
  Lock,
  NotebookPen,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Trash2,
  Unlock,
  User,
  Users,
} from "lucide-react";
import ModalParvulo from "./ModalParvulo";
import ModalArchivosParvulo from "./ModalArchivosParvulo";
import ModalCargaMasivaParvulos from "./ModalCargaMasivaParvulos";
import { alternarEstadoParvulo, eliminarParvulo } from "@/app/actions/parvulos";
import { formatearRut } from "@/lib/rut";
import { puedeEditarNivel } from "@/lib/permisos";
import type { Nivel, Parvulo, ParvuloConAsistencia, PerfilConNivel } from "@/lib/types";

interface Props {
  niveles: Nivel[];
  nivelSeleccionado: Nivel;
  parvulos: ParvuloConAsistencia[];
  perfil: PerfilConNivel;
}

export default function VistaNominaParvulos({
  niveles,
  nivelSeleccionado,
  parvulos,
  perfil,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"activos" | "inactivos" | "todos">("activos");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalCargaMasivaAbierto, setModalCargaMasivaAbierto] = useState(false);
  const [parvuloEditar, setParvuloEditar] = useState<Parvulo | null>(null);
  const [parvuloArchivos, setParvuloArchivos] = useState<Parvulo | null>(null);
  const [isPending, startTransition] = useTransition();

  const puedeEditar = puedeEditarNivel(perfil, nivelSeleccionado.id);

  const filtrados = useMemo(() => {
    return parvulos.filter((p) => {
      // Filtro de estado
      if (filtroEstado === "activos" && !p.activo) return false;
      if (filtroEstado === "inactivos" && p.activo) return false;

      // Filtro de búsqueda
      if (!busqueda) return true;
      const q = busqueda.toLowerCase().trim();
      const nombreCompleto = `${p.nombres} ${p.apellidos}`.toLowerCase();
      const rutLimpio = p.rut.toLowerCase().replace(/[^0-9k]/g, "");
      const busquedaLimpia = q.replace(/[^0-9k]/g, "");
      return nombreCompleto.includes(q) || (busquedaLimpia && rutLimpio.includes(busquedaLimpia));
    });
  }, [parvulos, busqueda, filtroEstado]);

  // Alumnos con asistencia menor al 75%
  const alumnosEnObservacion = useMemo(() => {
    return parvulos.filter(
      (p) => p.activo && (p.total_dias ?? 0) > 0 && (p.porcentaje_asistencia ?? 0) < 75,
    );
  }, [parvulos]);

  function abrirCrear() {
    setParvuloEditar(null);
    setModalAbierto(true);
  }

  function abrirEditar(p: Parvulo) {
    setParvuloEditar(p);
    setModalAbierto(true);
  }

  function toggleEstado(p: Parvulo) {
    const accionTexto = p.activo ? "desactivar" : "reactivar";
    if (confirm(`¿Seguro que deseas ${accionTexto} a ${p.nombres} ${p.apellidos}?`)) {
      startTransition(async () => {
        await alternarEstadoParvulo(p.id, !p.activo);
      });
    }
  }

  function handleEliminar(p: Parvulo) {
    const confirmacion = confirm(
      `¿Estás seguro de que deseas ELIMINAR a ${p.nombres} ${p.apellidos}?\n\nEsta acción eliminará de forma permanente al párvulo y todos sus registros (asistencias, bitácoras, licencias y archivos).`,
    );
    if (!confirmacion) return;

    startTransition(async () => {
      const res = await eliminarParvulo(p.id);
      if (!res.ok) {
        alert(res.error || "No se pudo eliminar el párvulo.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Barra superior con filtros y botón de agregar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave/60" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUT..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="campo pl-12 py-2.5 text-sm"
            />
          </div>

          <div className="flex rounded-2xl bg-white p-1 ring-1 ring-cielo-100 text-xs font-bold text-tinta-suave">
            <button
              type="button"
              onClick={() => setFiltroEstado("activos")}
              className={`rounded-xl px-3 py-1.5 transition ${
                filtroEstado === "activos" ? "bg-cielo-500 text-white shadow-xs" : "hover:text-tinta"
              }`}
            >
              Activos ({parvulos.filter((p) => p.activo).length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado("inactivos")}
              className={`rounded-xl px-3 py-1.5 transition ${
                filtroEstado === "inactivos" ? "bg-cielo-500 text-white shadow-xs" : "hover:text-tinta"
              }`}
            >
              Inactivos ({parvulos.filter((p) => !p.activo).length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado("todos")}
              className={`rounded-xl px-3 py-1.5 transition ${
                filtroEstado === "todos" ? "bg-cielo-500 text-white shadow-xs" : "hover:text-tinta"
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-carga-masiva-parvulo"
            type="button"
            onClick={() => setModalCargaMasivaAbierto(true)}
            disabled={!puedeEditar}
            title={
              puedeEditar
                ? "Importar nómina de alumnos en bloque"
                : "Solo lectura: solo la educadora a cargo o administración pueden importar párvulos."
            }
            className="boton-suave text-sm py-2.5 flex items-center gap-2 border border-cielo-200 hover:border-cielo-300"
          >
            <FileSpreadsheet className="size-4 text-cielo-600" /> Carga en Bloque
          </button>

          <button
            id="btn-agregar-parvulo"
            type="button"
            onClick={abrirCrear}
            disabled={!puedeEditar}
            title={
              puedeEditar
                ? "Inscribir nuevo párvulo en este nivel"
                : "Solo lectura: solo la educadora a cargo o administración pueden inscribir párvulos."
            }
            className="boton-menta text-sm py-2.5"
          >
            <Plus className="size-4" /> Agregar Párvulo
          </button>
        </div>
      </div>

      {/* Alerta de párvulos con asistencia < 75% */}
      {alumnosEnObservacion.length > 0 && (
        <aside
          role="status"
          aria-label="Atención por baja asistencia"
          className="flex items-center gap-3 rounded-2xl bg-coral-50 p-4 ring-1 ring-coral-200 text-coral-700 animate-aparecer"
        >
          <AlertTriangle className="size-5 shrink-0 text-coral-500" />
          <div className="text-sm">
            <span className="font-bold">
              {alumnosEnObservacion.length}{" "}
              {alumnosEnObservacion.length === 1 ? "párvulo tiene" : "párvulos tienen"} asistencia inferior al 75%:
            </span>{" "}
            {alumnosEnObservacion.map((p) => `${p.nombres} ${p.apellidos} (${p.porcentaje_asistencia}%)`).join(", ")}
          </div>
        </aside>
      )}

      {/* Listado de Párvulos */}
      {filtrados.length === 0 ? (
        <div className="tarjeta-vidrio p-12 text-center text-tinta-suave">
          <Users className="mx-auto mb-3 size-12 text-cielo-300" />
          <h3 className="text-lg font-semibold text-tinta">No se encontraron párvulos</h3>
          <p className="mt-1 text-sm">
            {busqueda
              ? "Prueba cambiando el término de búsqueda o el filtro de estado."
              : `Aún no hay párvulos inscritos en ${nivelSeleccionado.nombre}.`}
          </p>
          {puedeEditar && !busqueda && (
            <button
              type="button"
              onClick={abrirCrear}
              className="boton-primario mt-5 text-sm py-2.5 px-4"
            >
              <Plus className="size-4" /> Inscribir el primer párvulo
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-suave">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cielo-100 bg-cielo-50/60 text-xs font-bold uppercase tracking-wider text-tinta-suave">
                <tr>
                  <th className="px-6 py-4">Párvulo</th>
                  <th className="px-6 py-4">RUT</th>
                  <th className="px-6 py-4">Apoderado / Contacto</th>
                  <th className="px-6 py-4 text-center">Asistencia Acum.</th>
                  <th className="px-6 py-4 text-center">Google Drive</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cielo-50">
                {filtrados.map((p) => {
                  const pct = p.porcentaje_asistencia ?? 0;
                  const colorPct =
                    (p.total_dias ?? 0) === 0
                      ? "bg-gray-100 text-gray-600"
                      : pct >= 85
                      ? "bg-menta-100 text-menta-700"
                      : pct >= 75
                      ? "bg-sol-100 text-sol-700"
                      : "bg-coral-100 text-coral-700 ring-1 ring-coral-300";

                  return (
                    <tr
                      key={p.id}
                      className={`transition hover:bg-cielo-50/30 ${!p.activo ? "opacity-60 bg-gray-50/50" : ""}`}
                    >
                      {/* Párvulo */}
                      <td className="px-6 py-4 font-semibold text-tinta">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sol-200 to-menta-200 font-display font-bold text-tinta">
                            {p.nombres[0]}
                            {p.apellidos[0]}
                          </span>
                          <div>
                            <p className="font-bold">
                              {p.nombres} {p.apellidos}
                            </p>
                            {!p.activo && (
                              <span className="insignia bg-gray-200 text-gray-700 text-[0.65rem] py-0 px-2">
                                Inactivo
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* RUT */}
                      <td className="px-6 py-4 font-mono font-medium text-tinta-suave">
                        {formatearRut(p.rut)}
                      </td>

                      {/* Apoderado */}
                      <td className="px-6 py-4">
                        {p.nombre_apoderado ? (
                          <div>
                            <p className="font-medium text-tinta">{p.nombre_apoderado}</p>
                            {p.telefono_apoderado && (
                              <a
                                href={`tel:${p.telefono_apoderado.replace(/\s+/g, "")}`}
                                className="inline-flex items-center gap-1 text-xs text-cielo-600 hover:underline"
                              >
                                <Phone className="size-3" />
                                {p.telefono_apoderado}
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-tinta-suave/60">Sin apoderado</span>
                        )}
                        <div className="mt-1">
                          {p.pin_apoderado ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-menta-100/90 px-2 py-0.5 text-[11px] font-bold text-menta-800"
                              title={`PIN apoderado: ${p.pin_apoderado}`}
                            >
                              <Lock className="size-2.5 text-menta-600" /> PIN: {p.pin_apoderado}
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500"
                              title="Sin PIN asignado (consulta directa por RUT)"
                            >
                              <Unlock className="size-2.5 text-slate-400" /> Sin PIN
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Porcentaje Asistencia */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`insignia text-xs font-bold ${colorPct}`}>
                            {(p.total_dias ?? 0) === 0 ? "Sin datos" : `${pct}%`}
                          </span>
                          {(p.total_dias ?? 0) > 0 && (
                            <span className="text-[0.65rem] text-tinta-suave mt-0.5">
                              {p.dias_presente}/{p.total_dias} días
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Carpeta Drive */}
                      <td className="px-6 py-4 text-center">
                        {p.drive_folder_url ? (
                          <button
                            type="button"
                            onClick={() => setParvuloArchivos(p)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-sol-50 px-3 py-1 text-xs font-bold text-sol-700 hover:bg-sol-100 transition ring-1 ring-sol-200 cursor-pointer"
                            title="Ver archivos y carpeta en Google Drive"
                          >
                            <Folder className="size-3.5 text-sol-500" />
                            Drive <ExternalLink className="size-2.5 opacity-60" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setParvuloArchivos(p)}
                            className="inline-flex items-center gap-1 rounded-xl bg-cielo-50 px-2.5 py-1 text-[0.7rem] font-bold text-cielo-700 hover:bg-cielo-100 transition cursor-pointer"
                            title="Subir archivos o generar carpeta en Google Drive"
                          >
                            <FolderOpen className="size-3 text-cielo-500" /> Gestionar
                          </button>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setParvuloArchivos(p)}
                            title="Archivos y fotos en Google Drive"
                            className="grid size-8 place-items-center rounded-xl text-tinta-suave hover:bg-sol-50 hover:text-sol-700 transition"
                          >
                            <FolderOpen className="size-4 text-sol-600" />
                          </button>
                          <Link
                            href={`/dashboard/bitacora?nivelId=${p.nivel_id}&parvuloId=${p.id}`}
                            title="Ver bitácora de avances del párvulo"
                            className="grid size-8 place-items-center rounded-xl text-tinta-suave hover:bg-cielo-50 hover:text-cielo-600 transition"
                          >
                            <NotebookPen className="size-4 text-cielo-600" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => abrirEditar(p)}
                            disabled={!puedeEditar}
                            title={
                              puedeEditar
                                ? "Editar datos del párvulo"
                                : "Solo lectura: solo la educadora del nivel o administración pueden editar."
                            }
                            className="grid size-8 place-items-center rounded-xl text-tinta-suave hover:bg-cielo-50 hover:text-cielo-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleEstado(p)}
                            disabled={!puedeEditar || isPending}
                            title={
                              puedeEditar
                                ? p.activo
                                  ? "Desactivar párvulo"
                                  : "Reactivar párvulo"
                                : "Solo lectura"
                            }
                            className={`grid size-8 place-items-center rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${
                              p.activo
                                ? "text-tinta-suave hover:bg-sol-50 hover:text-sol-600"
                                : "text-menta-600 hover:bg-menta-50"
                            }`}
                          >
                            <Power className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(p)}
                            disabled={!puedeEditar || isPending}
                            title={
                              puedeEditar
                                ? "Eliminar párvulo definitivamente"
                                : "Solo lectura"
                            }
                            className="grid size-8 place-items-center rounded-xl text-tinta-suave hover:bg-coral-50 hover:text-coral-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para crear / editar */}
      <ModalParvulo
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        niveles={niveles}
        nivelSeleccionadoId={nivelSeleccionado.id}
        parvuloEditar={parvuloEditar}
      />

      {/* Modal para archivos y fotos en Google Drive */}
      {parvuloArchivos && (
        <ModalArchivosParvulo
          abierto={!!parvuloArchivos}
          onCerrar={() => setParvuloArchivos(null)}
          parvulo={parvuloArchivos}
          puedeEditar={puedeEditar}
          nombreNivel={nivelSeleccionado.nombre}
        />
      )}

      {/* Modal para carga en bloque de párvulos */}
      <ModalCargaMasivaParvulos
        abierto={modalCargaMasivaAbierto}
        alCerrar={() => setModalCargaMasivaAbierto(false)}
        niveles={niveles}
        nivelSeleccionado={nivelSeleccionado}
      />
    </div>
  );
}
