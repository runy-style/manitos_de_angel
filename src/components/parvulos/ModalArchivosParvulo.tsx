"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  crearCarpetaDriveParvulo,
  eliminarArchivoParvulo,
  subirArchivoParvulo,
  type EstadoAccionArchivo,
} from "@/app/actions/archivos";
import { createClient } from "@/lib/supabase/client";
import type { ArchivoParvulo, Parvulo } from "@/lib/types";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  parvulo: Parvulo;
  puedeEditar: boolean;
  nombreNivel: string;
}

const ICONO_CATEGORIA: Record<string, typeof ImageIcon> = {
  fotografia: ImageIcon,
  documento_word: FileText,
  pauta_individual: FileText,
  otro: FolderOpen,
};

export default function ModalArchivosParvulo({
  abierto,
  onCerrar,
  parvulo,
  puedeEditar,
  nombreNivel,
}: Props) {
  const [archivos, setArchivos] = useState<ArchivoParvulo[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [urlCarpeta, setUrlCarpeta] = useState<string | null>(parvulo.drive_folder_url);

  const [estadoSubida, accionSubida, pendienteSubida] = useActionState<
    EstadoAccionArchivo,
    FormData
  >(subirArchivoParvulo, undefined);

  // Cargar lista de archivos del párvulo desde Supabase
  useEffect(() => {
    if (!abierto) return;
    setUrlCarpeta(parvulo.drive_folder_url);

    async function cargarArchivos() {
      setCargandoLista(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("archivos_parvulo")
          .select("id, parvulo_id, educadora_id, categoria, titulo, drive_file_id, drive_file_url, visible_apoderado, created_at")
          .eq("parvulo_id", parvulo.id)
          .order("created_at", { ascending: false });

        setArchivos((data ?? []) as ArchivoParvulo[]);
      } catch {
        // En caso de fallo silencioso
      } finally {
        setCargandoLista(false);
      }
    }

    cargarArchivos();
  }, [abierto, parvulo.id, parvulo.drive_folder_url, estadoSubida]);

  // Manejar creación manual de carpeta en Drive
  async function handleCrearCarpeta() {
    setCreandoCarpeta(true);
    try {
      const res = await crearCarpetaDriveParvulo(parvulo.id);
      if (res?.ok && res.folderUrl) {
        setUrlCarpeta(res.folderUrl);
      } else if (res?.error) {
        alert(res.error);
      }
    } finally {
      setCreandoCarpeta(false);
    }
  }

  // Eliminar archivo
  async function handleEliminarArchivo(id: string) {
    if (!confirm("¿Seguro que deseas eliminar este archivo?")) return;
    const res = await eliminarArchivoParvulo(id, parvulo.nivel_id);
    if (res?.ok) {
      setArchivos((prev) => prev.filter((a) => a.id !== id));
    } else if (res?.error) {
      alert(res.error);
    }
  }

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-archivos-parvulo"
    >
      <div
        className="fixed inset-0 bg-tinta/40 backdrop-blur-sm"
        onClick={onCerrar}
        aria-hidden="true"
      />

      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-crema shadow-2xl animate-modal">
        {/* Cabecera */}
        <div className="relative overflow-hidden bg-linear-to-r from-cielo-200 via-sol-100 to-menta-100 px-6 py-6 sm:px-8">
          <button
            type="button"
            onClick={onCerrar}
            className="absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full bg-white/70 text-tinta transition hover:bg-white"
            aria-label="Cerrar modal"
          >
            <X className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="insignia bg-white/80 text-cielo-700">
              <FolderOpen className="size-3.5" /> Google Drive & Archivos
            </span>
            <span className="insignia bg-white/50 text-tinta-suave">{nombreNivel}</span>
          </div>
          <h2 id="titulo-archivos-parvulo" className="mt-1 text-2xl font-bold text-tinta">
            {parvulo.nombres} {parvulo.apellidos}
          </h2>
          <p className="text-xs font-semibold text-tinta-suave">RUT: {parvulo.rut}</p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          {/* Tarjeta de estado de Carpeta en Google Drive */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-suave sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cielo-50 text-cielo-600">
                <FolderOpen className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-tinta">Carpeta del Alumno en Google Drive</p>
                <p className="text-xs text-tinta-suave">
                  {urlCarpeta
                    ? "Sincronizada con Google Drive"
                    : "Aún no se ha generado la carpeta para este párvulo"}
                </p>
              </div>
            </div>

            {urlCarpeta ? (
              <a
                href={urlCarpeta}
                target="_blank"
                rel="noopener noreferrer"
                className="boton-suave shrink-0 text-xs py-2 px-3 gap-1.5"
              >
                <ExternalLink className="size-3.5 text-cielo-600" /> Abrir en Google Drive
              </a>
            ) : puedeEditar ? (
              <button
                type="button"
                onClick={handleCrearCarpeta}
                disabled={creandoCarpeta}
                className="boton-primario shrink-0 text-xs py-2 px-3 gap-1.5"
              >
                {creandoCarpeta ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Conectando…
                  </>
                ) : (
                  <>
                    <FolderOpen className="size-3.5" /> Crear Carpeta en Drive
                  </>
                )}
              </button>
            ) : null}
          </div>

          {/* Formulario de subida de archivos (solo si puedeEditar) */}
          {puedeEditar && (
            <div className="rounded-2xl border border-cielo-100 bg-white/70 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-tinta">
                <Upload className="size-4 text-menta-600" /> Subir Fotografía o Archivo (Word/PDF)
              </h3>

              {estadoSubida?.error && (
                <div className="mt-3 rounded-xl bg-coral-50 p-3 text-xs text-coral-700">
                  {estadoSubida.error}
                </div>
              )}

              {estadoSubida?.ok && (
                <div className="mt-3 rounded-xl bg-menta-50 p-3 text-xs font-semibold text-menta-700">
                  {estadoSubida.mensaje ?? "Archivo guardado exitosamente."}
                </div>
              )}

              <form action={accionSubida} className="mt-4 space-y-4">
                <input type="hidden" name="parvulo_id" value={parvulo.id} />
                <input type="hidden" name="nivel_id" value={parvulo.nivel_id} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="titulo-archivo" className="etiqueta">
                      Título o Descripción breve *
                    </label>
                    <input
                      id="titulo-archivo"
                      name="titulo"
                      type="text"
                      placeholder="Ej: Foto Actividad Primavera"
                      required
                      className="campo"
                    />
                  </div>

                  <div>
                    <label htmlFor="categoria-archivo" className="etiqueta">
                      Categoría *
                    </label>
                    <select id="categoria-archivo" name="categoria" className="campo">
                      <option value="fotografia">Fotografía</option>
                      <option value="documento_word">Documento Word (.docx / .doc)</option>
                      <option value="pauta_individual">Pauta de Evaluación Individual</option>
                      <option value="otro">Otro Archivo / PDF</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="input-archivo" className="etiqueta">
                      Seleccionar Archivo (Fotos, Word, PDF)
                    </label>
                    <input
                      id="input-archivo"
                      name="archivo"
                      type="file"
                      accept="image/*, .doc, .docx, .pdf, .xlsx, .xls"
                      className="campo text-xs file:mr-2 file:rounded-xl file:border-0 file:bg-cielo-100 file:px-3 file:py-1 file:text-xs file:font-bold file:text-cielo-700 hover:file:bg-cielo-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="enlace-directo" className="etiqueta">
                      O Enlace directo de Google Drive
                    </label>
                    <input
                      id="enlace-directo"
                      name="enlace_directo"
                      type="url"
                      placeholder="https://drive.google.com/..."
                      className="campo text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-tinta">
                    <input
                      type="checkbox"
                      name="visible_apoderado"
                      defaultChecked
                      className="size-4 rounded accent-menta-500"
                    />
                    Visible en el Portal de Apoderados
                  </label>

                  <button
                    type="submit"
                    disabled={pendienteSubida}
                    className="boton-menta text-xs py-2 px-4 shadow-flotante"
                  >
                    {pendienteSubida ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Subiendo a Drive…
                      </>
                    ) : (
                      <>
                        <Upload className="size-3.5" /> Subir y Guardar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de archivos ya existentes */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-tinta">
              Archivos registrados ({archivos.length})
            </h3>

            {cargandoLista ? (
              <div className="flex items-center justify-center p-6 text-xs text-tinta-suave">
                <Loader2 className="size-4 animate-spin text-cielo-500 mr-2" /> Cargando archivos…
              </div>
            ) : archivos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-cielo-200 bg-white/40 p-6 text-center text-xs text-tinta-suave">
                Aún no hay fotografías o documentos registrados para este párvulo.
              </div>
            ) : (
              <div className="divide-y divide-cielo-100 rounded-2xl bg-white shadow-suave">
                {archivos.map((arch) => {
                  const Icono = ICONO_CATEGORIA[arch.categoria] ?? FileText;
                  return (
                    <div
                      key={arch.id}
                      className="flex items-center justify-between gap-3 p-3.5 transition hover:bg-cielo-50/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cielo-50 text-cielo-600">
                          <Icono className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-tinta">
                            {arch.titulo}
                          </p>
                          <div className="flex items-center gap-2 text-[0.7rem] text-tinta-suave">
                            <span className="capitalize">{arch.categoria.replace("_", " ")}</span>
                            <span>•</span>
                            <span
                              className={`rounded-full px-1.5 py-0.2 ${
                                arch.visible_apoderado
                                  ? "bg-menta-100 text-menta-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {arch.visible_apoderado ? "Visible a familia" : "Solo equipo"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={arch.drive_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid size-8 place-items-center rounded-lg text-cielo-600 hover:bg-cielo-100 transition"
                          title="Abrir en Google Drive"
                        >
                          <ExternalLink className="size-4" />
                        </a>

                        {puedeEditar && (
                          <button
                            type="button"
                            onClick={() => handleEliminarArchivo(arch.id)}
                            className="grid size-8 place-items-center rounded-lg text-tinta-suave hover:bg-coral-50 hover:text-coral-600 transition"
                            title="Eliminar archivo"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
