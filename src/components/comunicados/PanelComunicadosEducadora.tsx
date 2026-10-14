"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Filter,
  Loader2,
  Megaphone,
  MessageCircle,
  Pin,
  PinOff,
  Plus,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { eliminarComunicadoAction, toggleFijarComunicadoAction } from "@/app/actions/comunicados";
import ModalCrearComunicado from "./ModalCrearComunicado";
import type { CategoriaComunicado, Comunicado, Nivel, PerfilConNivel } from "@/lib/types";

interface Props {
  comunicados: Comunicado[];
  niveles: Nivel[];
  nivelSeleccionadoId?: string;
  perfil: PerfilConNivel;
}

const ESTILOS_CATEGORIA: Record<
  CategoriaComunicado,
  { label: string; badge: string; iconEmoji: string }
> = {
  informativo: {
    label: "Informativo General",
    badge: "bg-cielo-100 text-cielo-800 border-cielo-200",
    iconEmoji: "📢",
  },
  actividad: {
    label: "Actividad / Taller",
    badge: "bg-menta-100 text-menta-800 border-menta-200",
    iconEmoji: "🎨",
  },
  urgente: {
    label: "Importante / Urgente",
    badge: "bg-coral-100 text-coral-800 border-coral-200",
    iconEmoji: "⚠️",
  },
  materiales: {
    label: "Materiales y Útiles",
    badge: "bg-sol-100 text-sol-800 border-sol-200",
    iconEmoji: "🎒",
  },
  celebracion: {
    label: "Celebración / Evento",
    badge: "bg-lavanda-100 text-lavanda-800 border-lavanda-200",
    iconEmoji: "🎉",
  },
};

export default function PanelComunicadosEducadora({
  comunicados,
  niveles,
  nivelSeleccionadoId,
  perfil,
}: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [isPending, startTransition] = useTransition();
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Filtrado de comunicados
  const comunicadosFiltrados = useMemo(() => {
    return comunicados.filter((c) => {
      if (filtroCategoria !== "todas" && c.categoria !== filtroCategoria) {
        return false;
      }
      return true;
    });
  }, [comunicados, filtroCategoria]);

  function handleToggleFijar(id: string, fijadoActual: boolean) {
    startTransition(async () => {
      const res = await toggleFijarComunicadoAction(id, fijadoActual);
      if (res.ok) {
        setMensajeExito(
          fijadoActual ? "Comunicado desfijado." : "Comunicado fijado al inicio del mural.",
        );
      }
    });
  }

  function handleEliminar(id: string) {
    if (!confirm("¿Deseas retirar este comunicado del mural?")) return;
    startTransition(async () => {
      const res = await eliminarComunicadoAction(id);
      if (res.ok) {
        setMensajeExito("Comunicado retirado del mural.");
      }
    });
  }

  function generarEnlaceWhatsApp(comunicado: Comunicado) {
    const estilo = ESTILOS_CATEGORIA[comunicado.categoria] ?? ESTILOS_CATEGORIA.informativo;
    const destino = comunicado.nivel ? `Nivel: ${comunicado.nivel.nombre}` : "Todo el Jardín Infantil";

    let texto = `${estilo.iconEmoji} *COMUNICADO OFICIAL*\n*Jardín Infantil Manitos de Ángel*\n\n`;
    texto += `📌 *${comunicado.titulo}*\n`;
    texto += `👥 *Destinatarios:* ${destino}\n`;
    if (comunicado.fecha_evento) {
      texto += `📅 *Fecha / Plazo:* ${comunicado.fecha_evento}\n`;
    }
    texto += `\n${comunicado.contenido}\n`;
    if (comunicado.adjunto_url) {
      texto += `\n📎 *Enlace adjunto:* ${comunicado.adjunto_url}\n`;
    }
    texto += `\n_Emitido desde la plataforma web oficial de Jardín Infantil Manitos de Ángel_`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  }

  return (
    <div className="space-y-6">
      {/* Mensaje de retroalimentación temporal */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-2xl bg-menta-100 p-4 text-xs font-semibold text-menta-800 shadow-xs animate-aparecer">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-menta-600" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito(null)}
            className="text-menta-700 hover:text-menta-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Filtros y Botón Crear */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-white/80 bg-white/90 p-4 shadow-suave">
        {/* Filtros de Categoría */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-tinta-suave mr-1 flex items-center gap-1">
            <Filter className="size-3.5" /> Filtrar:
          </span>
          <button
            type="button"
            onClick={() => setFiltroCategoria("todas")}
            className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition ${
              filtroCategoria === "todas"
                ? "bg-cielo-500 text-white shadow-xs"
                : "bg-slate-100 text-tinta hover:bg-slate-200"
            }`}
          >
            Todos ({comunicados.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroCategoria("urgente")}
            className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition ${
              filtroCategoria === "urgente"
                ? "bg-coral-500 text-white shadow-xs"
                : "bg-coral-50 text-coral-700 hover:bg-coral-100"
            }`}
          >
            ⚠️ Urgentes
          </button>
          <button
            type="button"
            onClick={() => setFiltroCategoria("actividad")}
            className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition ${
              filtroCategoria === "actividad"
                ? "bg-menta-500 text-white shadow-xs"
                : "bg-menta-50 text-menta-700 hover:bg-menta-100"
            }`}
          >
            🎨 Actividades
          </button>
          <button
            type="button"
            onClick={() => setFiltroCategoria("materiales")}
            className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition ${
              filtroCategoria === "materiales"
                ? "bg-sol-500 text-white shadow-xs"
                : "bg-sol-50 text-sol-800 hover:bg-sol-100"
            }`}
          >
            🎒 Materiales
          </button>
        </div>

        {/* Botón Nuevo Comunicado */}
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="boton-sol px-4 py-2 text-xs font-bold shadow-xs inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="size-4" /> Publicar Comunicado
        </button>
      </div>

      {/* Lista de Comunicados en el Mural */}
      {comunicadosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comunicadosFiltrados.map((c) => {
            const estilo = ESTILOS_CATEGORIA[c.categoria] ?? ESTILOS_CATEGORIA.informativo;
            const fechaPublicacion = new Date(c.created_at).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            const linkWhatsApp = generarEnlaceWhatsApp(c);

            return (
              <article
                key={c.id}
                className={`relative flex flex-col justify-between rounded-3xl border bg-white/95 p-6 shadow-suave transition hover:shadow-flotante ${
                  c.fijado ? "border-amber-300 ring-2 ring-amber-100" : "border-white/90"
                }`}
              >
                {/* Encabezado de la tarjeta */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cielo-50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${estilo.badge}`}>
                        {estilo.iconEmoji} {estilo.label}
                      </span>
                      {c.fijado && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Pin className="size-3 text-sol-600" /> Fijado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Botón fijar / desfijar */}
                      <button
                        type="button"
                        onClick={() => handleToggleFijar(c.id, c.fijado)}
                        disabled={isPending}
                        title={c.fijado ? "Desfijar aviso" : "Fijar al inicio del mural"}
                        className="grid size-7 place-items-center rounded-xl text-tinta-suave hover:bg-slate-100 hover:text-sol-600 transition"
                      >
                        {c.fijado ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                      </button>

                      {/* Botón eliminar */}
                      <button
                        type="button"
                        onClick={() => handleEliminar(c.id)}
                        disabled={isPending}
                        title="Retirar comunicado"
                        className="grid size-7 place-items-center rounded-xl text-tinta-suave hover:bg-coral-50 hover:text-coral-600 transition"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Título y Destinatario */}
                  <div className="mt-3 space-y-1.5">
                    <h3 className="font-display text-base font-bold text-tinta leading-snug">
                      {c.titulo}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-tinta-suave">
                      <span className="font-semibold text-cielo-700 bg-cielo-50 px-2 py-0.5 rounded-lg">
                        {c.nivel ? c.nivel.nombre : "🌟 Todo el Jardín"}
                      </span>
                      <span>·</span>
                      <span>{fechaPublicacion}</span>
                      {c.autor && (
                        <>
                          <span>·</span>
                          <span className="font-medium">Por: {c.autor.nombre_completo}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cuadro destacado si tiene fecha de evento */}
                  {c.fecha_evento && (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-sol-50/80 border border-sol-200/70 p-2.5 text-xs font-bold text-sol-900">
                      <Calendar className="size-4 text-sol-600 shrink-0" />
                      <span>
                        Fecha del evento o plazo:{" "}
                        {new Date(`${c.fecha_evento}T12:00:00`).toLocaleDateString("es-CL", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Contenido / Mensaje */}
                  <div className="mt-3 text-sm text-tinta font-normal leading-relaxed whitespace-pre-line bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100">
                    {c.contenido}
                  </div>
                </div>

                {/* Pie de tarjeta: Adjunto y Compartir por WhatsApp */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {c.adjunto_url ? (
                    <a
                      href={c.adjunto_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-cielo-600 hover:text-cielo-700"
                    >
                      <ExternalLink className="size-3.5" /> Ver documento adjunto
                    </a>
                  ) : (
                    <span className="text-[11px] text-tinta-suave">Aviso oficial del nivel</span>
                  )}

                  <a
                    href={linkWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition hover:scale-105"
                  >
                    <MessageCircle className="size-3.5 fill-white" /> Compartir en WhatsApp
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-sol-200 bg-white/70 p-12 text-center space-y-3">
          <Megaphone className="mx-auto size-12 text-sol-400" />
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-tinta">
              El mural de comunicados está limpio
            </h3>
            <p className="text-xs text-tinta-suave max-w-md mx-auto">
              No hay comunicados publicados para los filtros seleccionados. Publica avisos de materiales, actividades pedagógicas o circulares aquí para que los apoderados los lean al instante.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="boton-sol px-5 py-2.5 text-xs font-bold shadow-xs inline-flex items-center gap-2"
          >
            <Plus className="size-4" /> Publicar Primer Comunicado
          </button>
        </div>
      )}

      {/* Modal para Crear Comunicado */}
      {modalAbierto && (
        <ModalCrearComunicado
          niveles={niveles}
          nivelSeleccionadoId={nivelSeleccionadoId}
          perfil={perfil}
          onCerrar={() => setModalAbierto(false)}
          onExito={() => {
            setModalAbierto(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
