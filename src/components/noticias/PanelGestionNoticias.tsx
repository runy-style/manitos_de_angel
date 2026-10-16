"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Newspaper,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  crearPublicacionAction,
  editarPublicacionAction,
  eliminarPublicacionAction,
  alternarEstadoPublicacionAction,
} from "@/app/actions/publicaciones";
import type { PerfilConNivel, Publicacion } from "@/lib/types";

interface Props {
  publicacionesIniciales: Publicacion[];
  perfil: PerfilConNivel;
}

export default function PanelGestionNoticias({
  publicacionesIniciales,
  perfil,
}: Props) {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>(publicacionesIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todas" | "activas" | "inactivas">("todas");
  const [isPending, startTransition] = useTransition();

  // Estados de mensajes
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Estados del modal de formulario
  const [modalAbierto, setModalAbierto] = useState(false);
  const [publicacionEditar, setPublicacionEditar] = useState<Publicacion | null>(null);

  // Campos del formulario
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [activo, setActivo] = useState(true);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreviewUrl, setImagenPreviewUrl] = useState<string | null>(null);
  const [eliminarImagenExistente, setEliminarImagenExistente] = useState(false);

  // Modal de confirmación para eliminar
  const [publicacionAEliminar, setPublicacionAEliminar] = useState<Publicacion | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Filtrado de publicaciones
  const filtradas = useMemo(() => {
    return publicaciones.filter((p) => {
      if (filtroEstado === "activas" && !p.activo) return false;
      if (filtroEstado === "inactivas" && p.activo) return false;
      if (!busqueda) return true;
      const q = busqueda.toLowerCase().trim();
      return (
        p.titulo.toLowerCase().includes(q) ||
        p.contenido.toLowerCase().includes(q)
      );
    });
  }, [publicaciones, busqueda, filtroEstado]);

  function resetMensajes() {
    setMensajeExito(null);
    setMensajeError(null);
  }

  function abrirCrear() {
    resetMensajes();
    setPublicacionEditar(null);
    setTitulo("");
    setContenido("");
    setActivo(true);
    setImagenFile(null);
    setImagenPreviewUrl(null);
    setEliminarImagenExistente(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setModalAbierto(true);
  }

  function abrirEditar(p: Publicacion) {
    resetMensajes();
    setPublicacionEditar(p);
    setTitulo(p.titulo);
    setContenido(p.contenido);
    setActivo(p.activo);
    setImagenFile(null);
    setImagenPreviewUrl(p.imagen_url);
    setEliminarImagenExistente(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setModalAbierto(true);
  }

  function handleSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMensajeError("El archivo debe ser una imagen (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMensajeError("La imagen supera los 5 MB permitidos.");
      return;
    }

    setImagenFile(file);
    setImagenPreviewUrl(URL.createObjectURL(file));
    setEliminarImagenExistente(false);
    setMensajeError(null);
  }

  function handleQuitarImagen() {
    setImagenFile(null);
    setImagenPreviewUrl(null);
    setEliminarImagenExistente(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMensajes();

    if (!titulo.trim()) {
      setMensajeError("Ingresa un título para la publicación.");
      return;
    }

    if (!contenido.trim()) {
      setMensajeError("Ingresa el contenido de la publicación.");
      return;
    }

    const formData = new FormData();
    formData.append("titulo", titulo.trim());
    formData.append("contenido", contenido.trim());
    formData.append("activo", activo ? "true" : "false");

    if (imagenFile) {
      formData.append("imagen", imagenFile);
    }

    if (eliminarImagenExistente) {
      formData.append("eliminar_imagen", "true");
    }

    startTransition(async () => {
      if (publicacionEditar) {
        formData.append("id", publicacionEditar.id);
        const res = await editarPublicacionAction(undefined, formData);
        if (res.ok && res.publicacion) {
          setPublicaciones((prev) =>
            prev.map((item) => (item.id === res.publicacion!.id ? res.publicacion! : item)),
          );
          setMensajeExito(res.mensaje || "Publicación actualizada con éxito.");
          setModalAbierto(false);
        } else {
          setMensajeError(res.error || "No se pudo actualizar la publicación.");
        }
      } else {
        const res = await crearPublicacionAction(undefined, formData);
        if (res.ok && res.publicacion) {
          setPublicaciones((prev) => [res.publicacion!, ...prev]);
          setMensajeExito(res.mensaje || "Publicación creada con éxito.");
          setModalAbierto(false);
        } else {
          setMensajeError(res.error || "No se pudo crear la publicación.");
        }
      }
    });
  }

  function handleAlternarEstado(p: Publicacion) {
    const nuevoEstado = !p.activo;
    startTransition(async () => {
      const res = await alternarEstadoPublicacionAction(p.id, nuevoEstado);
      if (res.ok) {
        setPublicaciones((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, activo: nuevoEstado } : item)),
        );
        setMensajeExito(res.mensaje || "Estado actualizado.");
      } else {
        setMensajeError(res.error || "Error al cambiar estado.");
      }
    });
  }

  function confirmarEliminacion() {
    if (!publicacionAEliminar) return;
    const pubId = publicacionAEliminar.id;

    startTransition(async () => {
      const res = await eliminarPublicacionAction(pubId);
      if (res.ok) {
        setPublicaciones((prev) => prev.filter((item) => item.id !== pubId));
        setMensajeExito("Publicación e imagen eliminadas correctamente.");
        setPublicacionAEliminar(null);
      } else {
        setMensajeError(res.error || "No se pudo eliminar la publicación.");
      }
    });
  }

  function formatearFecha(fechaIso: string): string {
    try {
      const fecha = new Date(fechaIso);
      return fecha.toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return fechaIso;
    }
  }

  return (
    <div className="space-y-6">
      {/* Alertas de retroalimentación */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-2xl bg-menta-100 p-4 text-sm font-semibold text-menta-800 shadow-xs animate-aparecer">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0 text-menta-600" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-menta-700 hover:text-menta-900"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {mensajeError && (
        <div className="flex items-center justify-between rounded-2xl bg-coral-100 p-4 text-sm font-semibold text-coral-800 shadow-xs animate-aparecer">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0 text-coral-600" />
            <span>{mensajeError}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeError(null)}
            className="text-coral-700 hover:text-coral-900"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Barra de herramientas superior */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-suave/60" />
            <input
              type="text"
              placeholder="Buscar por título o contenido..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="campo pl-12 py-2.5 text-sm"
            />
          </div>

          <div className="flex rounded-2xl bg-white p-1 ring-1 ring-cielo-100 text-xs font-bold text-tinta-suave">
            <button
              type="button"
              onClick={() => setFiltroEstado("todas")}
              className={`rounded-xl px-3 py-1.5 transition ${
                filtroEstado === "todas" ? "bg-cielo-500 text-white shadow-xs" : "hover:text-tinta"
              }`}
            >
              Todas ({publicaciones.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado("activas")}
              className={`rounded-xl px-3 py-1.5 transition ${
                filtroEstado === "activas" ? "bg-cielo-500 text-white shadow-xs" : "hover:text-tinta"
              }`}
            >
              Activas ({publicaciones.filter((p) => p.activo).length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstado("inactivas")}
              className={`rounded-xl px-3 py-1.5 transition ${
                filtroEstado === "inactivas" ? "bg-cielo-500 text-white shadow-xs" : "hover:text-tinta"
              }`}
            >
              Borradores ({publicaciones.filter((p) => !p.activo).length})
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={abrirCrear}
          className="boton-primario shrink-0 text-sm py-2.5 px-4 shadow-suave flex items-center gap-2 cursor-pointer"
        >
          <Plus className="size-4" /> Nueva Publicación
        </button>
      </div>

      {/* Listado de Noticias */}
      {filtradas.length === 0 ? (
        <div className="tarjeta-vidrio p-12 text-center text-tinta-suave">
          <Newspaper className="mx-auto mb-3 size-12 text-cielo-300" />
          <h3 className="text-lg font-semibold text-tinta">No hay noticias que mostrar</h3>
          <p className="mt-1 text-sm">
            {busqueda
              ? "Prueba cambiando el término de búsqueda o el filtro de estado."
              : "Crea la primera noticia para comunicar actividades, celebraciones o anuncios en la página principal."}
          </p>
          {!busqueda && (
            <button
              type="button"
              onClick={abrirCrear}
              className="boton-primario mt-5 text-sm py-2.5 px-4 inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="size-4" /> Crear primera publicación
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((p) => (
            <article
              key={p.id}
              className={`flex flex-col justify-between overflow-hidden rounded-3xl border border-white/90 bg-white/95 shadow-suave transition hover:shadow-flotante ${
                !p.activo ? "opacity-75 ring-1 ring-gray-200" : ""
              }`}
            >
              <div>
                {/* Cabecera / Imagen */}
                {p.imagen_url ? (
                  <div className="relative aspect-video w-full overflow-hidden bg-cielo-50">
                    <Image
                      src={p.imagen_url}
                      alt={p.titulo}
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-300 hover:scale-105"
                    />
                    <div className="absolute top-3 right-3">
                      <span
                        className={`insignia text-[0.68rem] font-bold shadow-xs ${
                          p.activo ? "bg-menta-500 text-white" : "bg-gray-600 text-white"
                        }`}
                      >
                        {p.activo ? "Activa en Inicio" : "Borrador (Oculta)"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-between bg-linear-to-r from-sol-100 via-cielo-50 to-menta-100 px-5 py-4 border-b border-cielo-100/60">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-sol-800">
                      <Sparkles className="size-3.5 text-sol-600" /> Informativo (Solo texto)
                    </span>
                    <span
                      className={`insignia text-[0.68rem] font-bold ${
                        p.activo ? "bg-menta-500 text-white" : "bg-gray-600 text-white"
                      }`}
                    >
                      {p.activo ? "Activa en Inicio" : "Borrador (Oculta)"}
                    </span>
                  </div>
                )}

                {/* Contenido */}
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-tinta-suave">
                    <Calendar className="size-3.5 text-cielo-500" />
                    <span>{formatearFecha(p.created_at)}</span>
                    {p.autor?.nombre_completo && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[140px]">{p.autor.nombre_completo}</span>
                      </>
                    )}
                  </div>

                  <h3 className="font-display text-base font-bold text-tinta line-clamp-2 leading-snug">
                    {p.titulo}
                  </h3>

                  <p className="text-xs text-tinta-suave line-clamp-3 leading-relaxed whitespace-pre-line">
                    {p.contenido}
                  </p>
                </div>
              </div>

              {/* Barra inferior de acciones */}
              <div className="flex items-center justify-between border-t border-cielo-50 bg-cielo-50/30 px-5 py-3">
                <button
                  type="button"
                  onClick={() => handleAlternarEstado(p)}
                  disabled={isPending}
                  className={`flex items-center gap-1 text-xs font-bold transition cursor-pointer ${
                    p.activo
                      ? "text-tinta-suave hover:text-coral-600"
                      : "text-menta-700 hover:text-menta-900"
                  }`}
                  title={p.activo ? "Despublicar de la página de inicio" : "Publicar en la página de inicio"}
                >
                  {p.activo ? (
                    <>
                      <EyeOff className="size-3.5" /> Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" /> Publicar
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => abrirEditar(p)}
                    className="rounded-xl bg-white p-2 text-tinta-suave hover:bg-cielo-50 hover:text-cielo-600 transition ring-1 ring-cielo-100 cursor-pointer"
                    title="Editar publicación"
                  >
                    <Edit2 className="size-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublicacionAEliminar(p)}
                    className="rounded-xl bg-white p-2 text-tinta-suave hover:bg-coral-50 hover:text-coral-600 transition ring-1 ring-cielo-100 cursor-pointer"
                    title="Eliminar publicación"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL FORMULARIO: CREAR / EDITAR PUBLICACIÓN */}
      {/* ================================================================= */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/90 bg-white p-6 shadow-2xl space-y-5">
            <button
              type="button"
              onClick={() => setModalAbierto(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl bg-cielo-50 text-tinta-suave hover:bg-cielo-100 transition"
            >
              <X className="size-4" />
            </button>

            <header className="space-y-1">
              <h3 className="font-display text-xl font-bold text-tinta flex items-center gap-2">
                <Newspaper className="size-6 text-cielo-500" />
                {publicacionEditar ? "Editar Publicación" : "Nueva Publicación para la Web"}
              </h3>
              <p className="text-xs text-tinta-suave">
                Esta publicación se mostrará en las tarjetas de novedades de la página principal.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-tinta mb-1.5">
                  Título de la Publicación <span className="text-coral-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Gran Jornada de Bienvenida y Juegos Sensoriales"
                  className="campo text-sm"
                  autoFocus
                />
              </div>

              {/* Contenido */}
              <div>
                <label className="block text-xs font-bold text-tinta mb-1.5">
                  Contenido / Texto Informativo <span className="text-coral-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  placeholder="Describe la noticia, actividad o aviso para las familias del jardín..."
                  className="campo text-sm leading-relaxed"
                />
              </div>

              {/* Selector de Imagen con Previsualización en Vivo */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-tinta">
                  Fotografía de la Noticia <span className="font-normal text-tinta-suave">(opcional)</span>
                </label>

                {imagenPreviewUrl ? (
                  <div className="relative overflow-hidden rounded-2xl border border-cielo-200 bg-cielo-50/50 p-3 space-y-3">
                    <div className="relative aspect-video w-full max-h-56 overflow-hidden rounded-xl bg-white">
                      <Image
                        src={imagenPreviewUrl}
                        alt="Previsualización"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-tinta truncate max-w-xs">
                        {imagenFile ? imagenFile.name : "Imagen actual en Supabase Storage"}
                      </span>
                      <button
                        type="button"
                        onClick={handleQuitarImagen}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-coral-50 px-3 py-1.5 text-xs font-bold text-coral-600 hover:bg-coral-100 transition cursor-pointer"
                      >
                        <Trash2 className="size-3.5" /> Quitar imagen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cielo-200 bg-cielo-50/40 p-6 text-center cursor-pointer transition hover:border-cielo-400 hover:bg-cielo-50"
                  >
                    <div className="grid size-12 place-items-center rounded-2xl bg-white shadow-xs text-cielo-500 mb-2">
                      <UploadCloud className="size-6" />
                    </div>
                    <p className="text-xs font-bold text-tinta">
                      Haz clic para seleccionar una foto
                    </p>
                    <p className="text-[0.7rem] text-tinta-suave mt-0.5">
                      JPG, PNG o WebP de hasta 5 MB (se guardará en Supabase Storage)
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  id={inputId}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleSeleccionarArchivo}
                  className="hidden"
                />
              </div>

              {/* Switch de visibilidad en el inicio */}
              <div className="flex items-center justify-between rounded-2xl bg-cielo-50/60 p-3.5 ring-1 ring-cielo-100">
                <div>
                  <p className="text-xs font-bold text-tinta">Publicar de inmediato</p>
                  <p className="text-[0.7rem] text-tinta-suave">
                    Si está activado, la noticia será visible al instante para todas las familias en el home.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-menta-500 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-cielo-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-tinta-suave hover:bg-cielo-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="boton-primario px-5 py-2 text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                  {publicacionEditar ? "Guardar Cambios" : "Crear Publicación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      {/* ================================================================= */}
      {publicacionAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer">
          <div className="relative w-full max-w-md rounded-3xl border border-white/90 bg-white p-6 shadow-2xl space-y-4">
            <header className="space-y-1">
              <h3 className="font-display text-lg font-bold text-tinta flex items-center gap-2 text-coral-600">
                <Trash2 className="size-5" />
                ¿Eliminar esta publicación?
              </h3>
              <p className="text-xs text-tinta-suave">
                Estás a punto de eliminar permanentemente:
              </p>
              <p className="font-bold text-sm text-tinta pt-1">
                "{publicacionAEliminar.titulo}"
              </p>
            </header>

            <div className="rounded-2xl bg-coral-50 p-3.5 text-xs text-coral-700">
              <p>
                Esta acción borrará la publicación de la página web y purgará automáticamente la imagen
                asociada del bucket de Supabase Storage para no dejar archivos huérfanos.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-cielo-100">
              <button
                type="button"
                onClick={() => setPublicacionAEliminar(null)}
                disabled={isPending}
                className="rounded-xl px-4 py-2 text-xs font-bold text-tinta-suave hover:bg-cielo-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminacion}
                disabled={isPending}
                className="boton-coral px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
