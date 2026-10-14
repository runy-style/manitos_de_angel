"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookHeart,
  Calendar,
  FileCheck2,
  FileText,
  Filter,
  FolderOpen,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import ModalSubirDocumento from "./ModalSubirDocumento";
import TarjetaDocumento from "./TarjetaDocumento";
import { MESES_DEL_ANIO, type DocumentoNivel, type Nivel, type TipoDocumentoNivel } from "@/lib/types";

interface Props {
  niveles: Nivel[];
  nivelActual: Nivel;
  documentos: DocumentoNivel[];
  puedeEditar: boolean;
  esAdmin: boolean;
}

export default function VistaPlanificaciones({
  niveles,
  nivelActual,
  documentos,
  puedeEditar,
  esAdmin,
}: Props) {
  const router = useRouter();
  const anioActual = new Date().getFullYear();

  const [pestana, setPestana] = useState<TipoDocumentoNivel>("planificacion_mensual");
  const [filtroMes, setFiltroMes] = useState<number | "todos">("todos");
  const [filtroAnio, setFiltroAnio] = useState<number>(anioActual);
  const [busqueda, setBusqueda] = useState<string>("");
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);

  function cambiarNivel(nuevoId: string) {
    router.push(`/dashboard/planificaciones?nivelId=${nuevoId}`);
  }

  // Filtrar documentos por pestaña, mes, año y texto de búsqueda
  const docsFiltrados = useMemo(() => {
    return documentos.filter((doc) => {
      if (doc.tipo_documento !== pestana) return false;
      if (filtroMes !== "todos" && doc.mes !== filtroMes) return false;
      if (filtroAnio && doc.anio !== filtroAnio) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const t = doc.titulo.toLowerCase();
        const d = (doc.descripcion || "").toLowerCase();
        const a = (doc.educadora?.nombre_completo || "").toLowerCase();
        if (!t.includes(q) && !d.includes(q) && !a.includes(q)) return false;
      }
      return true;
    });
  }, [documentos, pestana, filtroMes, filtroAnio, busqueda]);

  const conteoPlanificaciones = useMemo(
    () => documentos.filter((d) => d.tipo_documento === "planificacion_mensual").length,
    [documentos],
  );

  const conteoPautas = useMemo(
    () => documentos.filter((d) => d.tipo_documento === "pauta_evaluacion").length,
    [documentos],
  );

  return (
    <div className="space-y-6">
      {/* Encabezado con selector de Nivel */}
      <header className="flex flex-col gap-4 rounded-3xl bg-white/80 p-6 backdrop-blur-md shadow-suave sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-sol-100 text-sol-600">
              <BookHeart className="size-5" />
            </span>
            <span className="insignia bg-sol-50 text-sol-600">Gestión Curricular</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
            Planificaciones y Pautas
          </h1>
          <p className="text-sm text-tinta-suave">
            Repositorio de unidades mensuales y pautas de evaluación integradas con Google Drive.
          </p>
        </div>

        {/* Selector de nivel */}
        <div className="flex flex-col gap-1 sm:items-end">
          <label
            htmlFor="selector-nivel-planificaciones"
            className="text-xs font-bold uppercase tracking-wider text-tinta-suave"
          >
            Nivel pedagógico
          </label>
          <select
            id="selector-nivel-planificaciones"
            value={nivelActual.id}
            onChange={(e) => cambiarNivel(e.target.value)}
            className="campo font-bold text-tinta sm:w-64"
          >
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Pestañas principales (Planificaciones vs Pautas) y Botón Subir */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-2xl bg-white/70 p-1.5 shadow-suave ring-1 ring-cielo-100">
          <button
            type="button"
            onClick={() => setPestana("planificacion_mensual")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              pestana === "planificacion_mensual"
                ? "bg-cielo-500 text-white shadow-flotante"
                : "text-tinta-suave hover:bg-cielo-50 hover:text-tinta"
            }`}
          >
            <FileText className="size-4" />
            Planificaciones Mensuales
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] ${
                pestana === "planificacion_mensual" ? "bg-white/20 text-white" : "bg-cielo-100 text-cielo-700"
              }`}
            >
              {conteoPlanificaciones}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPestana("pauta_evaluacion")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              pestana === "pauta_evaluacion"
                ? "bg-menta-500 text-white shadow-flotante"
                : "text-tinta-suave hover:bg-menta-50 hover:text-tinta"
            }`}
          >
            <FileCheck2 className="size-4" />
            Pautas de Evaluación
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] ${
                pestana === "pauta_evaluacion" ? "bg-white/20 text-white" : "bg-menta-100 text-menta-700"
              }`}
            >
              {conteoPautas}
            </span>
          </button>
        </div>

        {/* Botón Subir Documento */}
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          disabled={!puedeEditar}
          title={
            puedeEditar
              ? "Subir nueva planificación o pauta a Google Drive"
              : "Solo lectura: solo la educadora a cargo o administración pueden subir documentos."
          }
          className="boton-menta shrink-0 text-sm py-2.5 px-5 shadow-flotante"
        >
          <Upload className="size-4" /> Subir Documento a Drive
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="grid gap-3 rounded-2xl bg-white/70 p-4 shadow-suave ring-1 ring-cielo-100 sm:grid-cols-4">
        {/* Búsqueda por texto */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tinta-suave" />
          <input
            type="text"
            placeholder="Buscar por título, contenido o educadora..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="campo pl-10 text-xs"
          />
        </div>

        {/* Filtro Mes */}
        <div>
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value === "todos" ? "todos" : Number(e.target.value))}
            className="campo text-xs font-semibold"
          >
            <option value="todos">Todos los meses</option>
            {MESES_DEL_ANIO.map((m) => (
              <option key={m.numero} value={m.numero}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Año */}
        <div>
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(Number(e.target.value))}
            className="campo text-xs font-semibold"
          >
            {[anioActual - 1, anioActual, anioActual + 1].map((a) => (
              <option key={a} value={a}>
                Año {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de Documentos */}
      {docsFiltrados.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docsFiltrados.map((doc) => (
            <TarjetaDocumento key={doc.id} doc={doc} puedeEditar={puedeEditar} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white/60 p-12 text-center shadow-suave">
          <span className="grid size-16 place-items-center rounded-3xl bg-sol-50 text-sol-500">
            <BookHeart className="size-8" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-tinta">
            No hay {pestana === "planificacion_mensual" ? "planificaciones" : "pautas"} registradas
          </h3>
          <p className="mt-1 max-w-md text-xs text-tinta-suave">
            {busqueda || filtroMes !== "todos"
              ? "No se encontraron documentos para los filtros seleccionados. Intenta restablecer los filtros."
              : puedeEditar
              ? "Aún no se han cargado documentos en este nivel. Haz clic en 'Subir Documento a Drive' para comenzar."
              : "Aún no se han cargado documentos en este nivel."}
          </p>

          {puedeEditar && !busqueda && filtroMes === "todos" && (
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="boton-primario mt-5 text-xs py-2 px-4 shadow-flotante"
            >
              <Plus className="size-4" /> Subir primer documento
            </button>
          )}
        </div>
      )}

      {/* Modal para subir documento */}
      <ModalSubirDocumento
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        nivelId={nivelActual.id}
        nombreNivel={nivelActual.nombre}
        tipoInicial={pestana}
      />
    </div>
  );
}
