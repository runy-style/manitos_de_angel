"use client";

import { useState } from "react";
import {
  Calendar,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  User,
} from "lucide-react";
import { eliminarDocumentoNivel } from "@/app/actions/planificaciones";
import { MESES_DEL_ANIO, type DocumentoNivel } from "@/lib/types";

interface Props {
  doc: DocumentoNivel;
  puedeEditar: boolean;
}

function obtenerIconoYColor(nombreArchivo: string) {
  const ext = (nombreArchivo.split(".").pop() || "").toLowerCase();
  if (["doc", "docx"].includes(ext)) {
    return { icono: FileText, color: "text-blue-600 bg-blue-50 border-blue-200", etiqueta: "Word" };
  }
  if (["xls", "xlsx"].includes(ext)) {
    return { icono: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50 border-emerald-200", etiqueta: "Excel" };
  }
  if (["pdf"].includes(ext)) {
    return { icono: FileCheck2, color: "text-red-600 bg-red-50 border-red-200", etiqueta: "PDF" };
  }
  return { icono: FileText, color: "text-cielo-600 bg-cielo-50 border-cielo-200", etiqueta: ext.toUpperCase() || "Archivo" };
}

export default function TarjetaDocumento({ doc, puedeEditar }: Props) {
  const [eliminando, setEliminando] = useState(false);
  const mesNombre = MESES_DEL_ANIO.find((m) => m.numero === doc.mes)?.nombre ?? `Mes ${doc.mes}`;
  const { icono: IconoArchivo, color: estiloColor, etiqueta: formato } = obtenerIconoYColor(
    doc.nombre_archivo || doc.titulo,
  );

  async function handleEliminar() {
    if (!confirm(`¿Deseas eliminar "${doc.titulo}"?`)) return;
    setEliminando(true);
    try {
      const res = await eliminarDocumentoNivel(doc.id, doc.nivel_id);
      if (res?.error) {
        alert(res.error);
      }
    } finally {
      setEliminando(false);
    }
  }

  return (
    <article className="tarjeta-vidrio group flex flex-col justify-between overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-flotante">
      <div className="space-y-3">
        {/* Encabezado con Formato y Período */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${estiloColor}`}
          >
            <IconoArchivo className="size-3.5" />
            {formato}
          </span>

          <span className="insignia bg-white/80 text-tinta-suave text-xs">
            <Calendar className="size-3 text-cielo-500" />
            {mesNombre} {doc.anio}
          </span>
        </div>

        {/* Título y descripción */}
        <div>
          <h4 className="text-base font-bold text-tinta line-clamp-2 group-hover:text-cielo-700 transition">
            {doc.titulo}
          </h4>
          {doc.descripcion && (
            <p className="mt-1 text-xs text-tinta-suave line-clamp-3 leading-relaxed">
              {doc.descripcion}
            </p>
          )}
        </div>
      </div>

      {/* Pie de tarjeta con autor y botones */}
      <div className="mt-5 border-t border-cielo-100/60 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 text-[0.7rem] text-tinta-suave">
            <User className="size-3 shrink-0 text-cielo-500" />
            <span className="truncate">{doc.educadora?.nombre_completo ?? "Educadora"}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {puedeEditar && (
              <button
                type="button"
                onClick={handleEliminar}
                disabled={eliminando}
                className="grid size-8 place-items-center rounded-xl text-tinta-suave hover:bg-coral-50 hover:text-coral-600 transition disabled:opacity-40"
                title="Eliminar documento"
              >
                {eliminando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            )}

            <a
              href={doc.drive_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="boton-suave text-xs py-1.5 px-3 gap-1.5 font-bold"
              title="Abrir archivo en Google Drive"
            >
              Abrir en Drive <ExternalLink className="size-3 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
