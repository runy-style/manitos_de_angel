"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Filter,
  FolderOpen,
  Heart,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { usePerfil } from "@/components/dashboard/PerfilProvider";
import ModalEntradaBitacora from "./ModalEntradaBitacora";
import TarjetaBitacora from "./TarjetaBitacora";
import {
  AREAS_AVANCE,
  type EntradaBitacora,
  type Nivel,
  type Parvulo,
} from "@/lib/types";

interface Props {
  niveles: Nivel[];
  nivelActual: Nivel;
  parvulos: Parvulo[];
  bitacoras: EntradaBitacora[];
  parvuloInicialId?: string;
}

export default function VistaBitacora({
  niveles,
  nivelActual,
  parvulos,
  bitacoras,
  parvuloInicialId,
}: Props) {
  const router = useRouter();
  const perfil = usePerfil();

  // El usuario puede editar si es admin o la educadora del nivel actual
  const puedeEditar =
    perfil.rol === "admin" ||
    (perfil.rol === "educadora" && perfil.nivel_id === nivelActual.id);

  const [parvuloFiltro, setParvuloFiltro] = useState<string>(parvuloInicialId ?? "");
  const [areaFiltro, setAreaFiltro] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [entradaEditar, setEntradaEditar] = useState<EntradaBitacora | null>(null);

  const parvuloSeleccionado = useMemo(
    () => parvulos.find((p) => p.id === parvuloFiltro) ?? null,
    [parvulos, parvuloFiltro],
  );

  // Filtrado reactivo de las observaciones
  const bitacorasFiltradas = useMemo(() => {
    return bitacoras.filter((b) => {
      if (parvuloFiltro && b.parvulo_id !== parvuloFiltro) return false;
      if (areaFiltro !== "todas" && b.area_avance !== areaFiltro) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const texto = b.observacion.toLowerCase();
        const nombreNino = `${b.parvulo?.nombres ?? ""} ${b.parvulo?.apellidos ?? ""}`.toLowerCase();
        const rutNino = (b.parvulo?.rut ?? "").toLowerCase();
        if (!texto.includes(q) && !nombreNino.includes(q) && !rutNino.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [bitacoras, parvuloFiltro, areaFiltro, busqueda]);

  function cambiarNivel(nuevoId: string) {
    router.push(`/dashboard/bitacora?nivelId=${nuevoId}`);
  }

  function handleAbrirCrear() {
    setEntradaEditar(null);
    setModalAbierto(true);
  }

  function handleEditar(entrada: EntradaBitacora) {
    setEntradaEditar(entrada);
    setModalAbierto(true);
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Selector de Nivel */}
      <header className="flex flex-col gap-4 rounded-3xl bg-white/80 p-6 backdrop-blur-md shadow-suave sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-cielo-100 text-cielo-600">
              <NotebookPen className="size-5" />
            </span>
            <h1 className="font-display text-2xl font-bold text-tinta sm:text-3xl">
              Bitácora de Avances
            </h1>
          </div>
          <p className="text-sm text-tinta-suave">
            Seguimiento pedagógico, logros y registro individual de cada párvulo.
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Nivel */}
          <div className="flex items-center gap-2">
            <label htmlFor="selector-nivel-bitacora" className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              Nivel:
            </label>
            <select
              id="selector-nivel-bitacora"
              value={nivelActual.id}
              onChange={(e) => cambiarNivel(e.target.value)}
              className="campo py-2 font-bold text-sm bg-white"
            >
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>
          </div>

          {puedeEditar && (
            <button
              id="btn-nueva-observacion"
              type="button"
              onClick={handleAbrirCrear}
              disabled={parvulos.length === 0}
              className="boton-primario px-4 py-2.5 text-sm font-bold shadow-flotante"
            >
              <Plus className="size-4" /> Nueva Observación
            </button>
          )}
        </div>
      </header>

      {/* Ficha rápida si hay un párvulo seleccionado */}
      {parvuloSeleccionado && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-menta-200 bg-linear-to-r from-menta-50 via-white to-cielo-50 p-5 shadow-suave animate-aparecer">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-menta-200 text-menta-700">
              <Heart className="size-6 text-coral-500 fill-coral-400" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-menta-700">
                Párvulo en consulta
              </p>
              <h2 className="font-display text-xl font-bold text-tinta">
                {parvuloSeleccionado.nombres} {parvuloSeleccionado.apellidos}
              </h2>
              <p className="text-xs text-tinta-suave">
                RUT: {parvuloSeleccionado.rut} · {bitacorasFiltradas.length} observaciones registradas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {parvuloSeleccionado.drive_folder_url && (
              <a
                href={parvuloSeleccionado.drive_folder_url}
                target="_blank"
                rel="noreferrer"
                className="boton-suave px-3.5 py-2 text-xs font-bold text-cielo-700"
              >
                <FolderOpen className="size-3.5" /> Carpeta en Drive
              </a>
            )}
            <button
              type="button"
              onClick={() => setParvuloFiltro("")}
              className="boton-suave px-3.5 py-2 text-xs font-bold text-tinta-suave"
            >
              <X className="size-3.5" /> Ver todos los niños
            </button>
          </div>
        </section>
      )}

      {/* Barra de Filtros: Párvulo, Área y Búsqueda */}
      <section className="flex flex-col gap-3 rounded-2xl bg-white/90 p-4 shadow-xs sm:flex-row sm:items-center">
        {/* Filtro por Párvulo */}
        <div className="flex-1">
          <div className="relative">
            <Users className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tinta-suave" />
            <select
              value={parvuloFiltro}
              onChange={(e) => setParvuloFiltro(e.target.value)}
              className="campo py-2 pl-10 text-sm font-semibold"
            >
              <option value="">Todos los párvulos ({parvulos.length})</option>
              {parvulos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombres} {p.apellidos} ({p.rut})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro por Área de Avance */}
        <div className="w-full sm:w-60">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tinta-suave" />
            <select
              value={areaFiltro}
              onChange={(e) => setAreaFiltro(e.target.value)}
              className="campo py-2 pl-10 text-sm font-semibold"
            >
              <option value="todas">Todas las áreas</option>
              {AREAS_AVANCE.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buscador de texto */}
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tinta-suave" />
            <input
              type="text"
              placeholder="Buscar por palabra o RUT…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="campo py-2 pl-10 text-sm"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tinta-suave hover:text-tinta"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Grid de Observaciones */}
      {bitacorasFiltradas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bitacorasFiltradas.map((entrada) => (
            <TarjetaBitacora
              key={entrada.id}
              entrada={entrada}
              puedeEditar={puedeEditar}
              onEditar={handleEditar}
              onFiltrarParvulo={(id) => setParvuloFiltro(id)}
            />
          ))}
        </div>
      ) : (
        /* Estado vacío */
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cielo-200 bg-white/60 p-12 text-center animate-aparecer">
          <div className="grid size-16 place-items-center rounded-full bg-sol-100 text-sol-600 mb-4">
            <BookOpen className="size-8" />
          </div>
          <h3 className="font-display text-xl font-bold text-tinta">
            {busqueda || areaFiltro !== "todas" || parvuloFiltro
              ? "No se encontraron observaciones con los filtros aplicados"
              : "Aún no hay observaciones en la bitácora de este nivel"}
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-tinta-suave">
            {puedeEditar
              ? "Registra los avances, comportamientos y situaciones de aprendizaje de los párvulos para mantener informada a la dirección y las familias."
              : "La educadora a cargo del nivel registrará aquí las observaciones pedagógicas."}
          </p>

          {puedeEditar && parvulos.length > 0 && (
            <button
              type="button"
              onClick={handleAbrirCrear}
              className="boton-primario mt-5 px-5 py-2.5 text-sm font-bold"
            >
              <Plus className="size-4" /> Agregar Primera Observación
            </button>
          )}

          {parvulos.length === 0 && (
            <Link
              href="/dashboard/parvulos"
              className="boton-suave mt-5 px-5 py-2.5 text-sm font-bold"
            >
              Matricular párvulos primero en este nivel
            </Link>
          )}
        </div>
      )}

      {/* Modal para Crear/Editar */}
      <ModalEntradaBitacora
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        nivelId={nivelActual.id}
        parvulos={parvulos}
        parvuloPreseleccionado={parvuloSeleccionado}
        entradaEditar={entradaEditar}
      />
    </div>
  );
}
