"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  KeyRound,
  Layers,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  adminActualizarNivelAction,
  adminActualizarUsuarioAction,
  adminCambiarPasswordAction,
  adminCrearNivelAction,
  adminCrearUsuarioAction,
  adminEliminarNivelAction,
  adminEliminarUsuarioAction,
  adminLimpiarTodosLosParvulosAction,
} from "@/app/actions/admin";
import type { Nivel, Perfil, Rol } from "@/lib/types";

interface PerfilConNivelData extends Perfil {
  nivel?: { id: string; nombre: string } | null;
}

interface NivelConConteo extends Nivel {
  total_parvulos?: number;
}

interface Props {
  usuarios: PerfilConNivelData[];
  niveles: NivelConConteo[];
  usuarioActualId: string;
}

export default function PanelAdministrador({
  usuarios,
  niveles,
  usuarioActualId,
}: Props) {
  const [pestana, setPestana] = useState<"usuarios" | "niveles" | "limpieza">("usuarios");
  const [confirmacionTexto, setConfirmacionTexto] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Estados de modales
  const [modalCrearUsuario, setModalCrearUsuario] = useState(false);
  const [modalPasswordUser, setModalPasswordUser] = useState<PerfilConNivelData | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [modalEditarUser, setModalEditarUser] = useState<PerfilConNivelData | null>(null);

  const [modalCrearNivel, setModalCrearNivel] = useState(false);
  const [modalEditarNivel, setModalEditarNivel] = useState<NivelConConteo | null>(null);

  function resetMensajes() {
    setMensajeExito(null);
    setMensajeError(null);
  }

  // 1. Crear Usuario
  function handleCrearUsuario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMensajes();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await adminCrearUsuarioAction(formData);
      if (res.ok) {
        setMensajeExito(res.mensaje || "Usuario creado exitosamente.");
        setModalCrearUsuario(false);
        form.reset();
      } else {
        setMensajeError(res.error || "No se pudo crear el usuario.");
      }
    });
  }

  // 2. Cambiar Contraseña
  function handleCambiarPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modalPasswordUser) return;
    resetMensajes();

    startTransition(async () => {
      const res = await adminCambiarPasswordAction(modalPasswordUser.id, nuevaPassword);
      if (res.ok) {
        setMensajeExito(
          `Contraseña de ${modalPasswordUser.nombre_completo} actualizada con éxito.`,
        );
        setModalPasswordUser(null);
        setNuevaPassword("");
      } else {
        setMensajeError(res.error || "Error al actualizar la contraseña.");
      }
    });
  }

  // 3. Editar Usuario
  function handleEditarUsuario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modalEditarUser) return;
    resetMensajes();
    const formData = new FormData(e.currentTarget);
    const nombre = String(formData.get("nombre") ?? "");
    const rol = String(formData.get("rol") ?? "educadora") as Rol;
    const nivelId = String(formData.get("nivel_id") ?? "") || null;

    startTransition(async () => {
      const res = await adminActualizarUsuarioAction(modalEditarUser.id, nombre, rol, nivelId);
      if (res.ok) {
        setMensajeExito("Perfil del usuario actualizado correctamente.");
        setModalEditarUser(null);
      } else {
        setMensajeError(res.error || "No se pudo actualizar el perfil.");
      }
    });
  }

  // 4. Eliminar Usuario
  function handleEliminarUsuario(user: PerfilConNivelData) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la cuenta de ${user.nombre_completo}? Esta acción no se puede deshacer.`)) {
      return;
    }
    resetMensajes();

    startTransition(async () => {
      const res = await adminEliminarUsuarioAction(user.id);
      if (res.ok) {
        setMensajeExito(`Cuenta de ${user.nombre_completo} eliminada.`);
      } else {
        setMensajeError(res.error || "No se pudo eliminar el usuario.");
      }
    });
  }

  // 5. Crear Nivel
  function handleCrearNivel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetMensajes();
    const formData = new FormData(e.currentTarget);
    const nombre = String(formData.get("nombre") ?? "");
    const descripcion = String(formData.get("descripcion") ?? "");

    startTransition(async () => {
      const res = await adminCrearNivelAction(nombre, descripcion);
      if (res.ok) {
        setMensajeExito(res.mensaje || "Nivel creado.");
        setModalCrearNivel(false);
      } else {
        setMensajeError(res.error || "Error al crear el nivel.");
      }
    });
  }

  // 6. Editar Nivel
  function handleEditarNivel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modalEditarNivel) return;
    resetMensajes();
    const formData = new FormData(e.currentTarget);
    const nombre = String(formData.get("nombre") ?? "");
    const descripcion = String(formData.get("descripcion") ?? "");

    startTransition(async () => {
      const res = await adminActualizarNivelAction(modalEditarNivel.id, nombre, descripcion);
      if (res.ok) {
        setMensajeExito("Nivel actualizado correctamente.");
        setModalEditarNivel(null);
      } else {
        setMensajeError(res.error || "Error al actualizar el nivel.");
      }
    });
  }

  // 7. Eliminar Nivel
  function handleEliminarNivel(n: NivelConConteo) {
    if (!confirm(`¿Eliminar el nivel "${n.nombre}"?`)) return;
    resetMensajes();

    startTransition(async () => {
      const res = await adminEliminarNivelAction(n.id);
      if (res.ok) {
        setMensajeExito("Nivel eliminado.");
      } else {
        setMensajeError(res.error || "Error al eliminar el nivel.");
      }
    });
  }

  // 8. Limpiar todos los párvulos
  function handleLimpiarTodosLosParvulos() {
    if (confirmacionTexto.trim().toUpperCase() !== "ELIMINAR") {
      setMensajeError('Debes escribir la palabra "ELIMINAR" para confirmar el vaciado de datos.');
      return;
    }

    if (
      !confirm(
        "ÚLTIMA CONFIRMACIÓN:\n¿Estás seguro de que deseas eliminar permanentemente todos los párvulos, asistencias y registros asociados de todos los niveles?",
      )
    ) {
      return;
    }

    resetMensajes();
    startTransition(async () => {
      const res = await adminLimpiarTodosLosParvulosAction();
      if (res.ok) {
        setMensajeExito(res.mensaje || "Nómina de párvulos vaciada exitosamente.");
        setConfirmacionTexto("");
      } else {
        setMensajeError(res.error || "Error al vaciar la nómina de párvulos.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Mensajes de aviso */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-2xl bg-menta-100 p-4 text-sm font-semibold text-menta-800 shadow-xs animate-aparecer">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0 text-menta-600" />
            <span>{mensajeExito}</span>
          </div>
          <button type="button" onClick={() => setMensajeExito(null)} className="text-menta-700">
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
          <button type="button" onClick={() => setMensajeError(null)} className="text-coral-700">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Pestañas de Navegación del Administrador */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-suave">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPestana("usuarios")}
            className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
              pestana === "usuarios"
                ? "bg-sol-500 text-white shadow-suave"
                : "text-tinta hover:bg-cielo-50"
            }`}
          >
            <Users className="size-4" />
            Usuarios y Contraseñas ({usuarios.length})
          </button>

          <button
            type="button"
            onClick={() => setPestana("niveles")}
            className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
              pestana === "niveles"
                ? "bg-sol-500 text-white shadow-suave"
                : "text-tinta hover:bg-cielo-50"
            }`}
          >
            <Layers className="size-4" />
            Afinar Niveles ({niveles.length})
          </button>

          <button
            type="button"
            onClick={() => setPestana("limpieza")}
            className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
              pestana === "limpieza"
                ? "bg-coral-500 text-white shadow-suave"
                : "text-tinta hover:bg-cielo-50"
            }`}
          >
            <ShieldAlert className="size-4" />
            Limpiar Nómina
          </button>
        </div>

        {pestana === "usuarios" ? (
          <button
            type="button"
            onClick={() => setModalCrearUsuario(true)}
            className="boton-primario px-4 py-2 text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="size-4" /> Crear Nuevo Usuario
          </button>
        ) : pestana === "niveles" ? (
          <button
            type="button"
            onClick={() => setModalCrearNivel(true)}
            className="boton-sol px-4 py-2 text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="size-4" /> Agregar Nivel
          </button>
        ) : null}
      </div>

      {/* ================================================================= */}
      {/* VISTA 1: USUARIOS Y CONTRASEÑAS */}
      {/* ================================================================= */}
      {pestana === "usuarios" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {usuarios.map((u) => {
              const esYo = u.id === usuarioActualId;
              const badgeRol =
                u.rol === "admin"
                  ? "bg-sol-100 text-sol-800 border-sol-300"
                  : u.rol === "educadora"
                  ? "bg-cielo-100 text-cielo-800 border-cielo-300"
                  : "bg-menta-100 text-menta-800 border-menta-300";

              return (
                <article
                  key={u.id}
                  className="flex flex-col justify-between rounded-3xl border border-white/90 bg-white/95 p-5 shadow-suave space-y-4 transition hover:shadow-flotante"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 border-b border-cielo-50 pb-2.5">
                      <div>
                        <h3 className="font-display text-base font-bold text-tinta flex items-center gap-1.5">
                          {u.nombre_completo}
                          {esYo && (
                            <span className="text-[0.65rem] font-bold text-sol-600 bg-sol-50 px-1.5 py-0.5 rounded-lg border border-sol-200">
                              (Tú)
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-tinta-suave break-all">{u.email}</p>
                      </div>
                      <span className={`insignia border text-[0.68rem] font-bold ${badgeRol}`}>
                        {u.rol === "admin"
                          ? "Administrador"
                          : u.rol === "educadora"
                          ? "Educadora"
                          : "Dirección"}
                      </span>
                    </div>

                    <div className="rounded-2xl bg-cielo-50/50 p-3 text-xs space-y-1">
                      <p className="font-semibold text-tinta">
                        Nivel a cargo:{" "}
                        <span className="text-cielo-700 font-bold">
                          {u.rol === "educadora"
                            ? u.nivel?.nombre ?? "Sin nivel asignado"
                            : "Todos los niveles (Visión global)"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Botones de acción del usuario */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-cielo-50">
                    <button
                      type="button"
                      onClick={() => {
                        setModalPasswordUser(u);
                        setNuevaPassword("");
                      }}
                      className="rounded-xl bg-sol-50 px-2.5 py-1.5 text-xs font-bold text-sol-800 hover:bg-sol-100 transition flex items-center gap-1 border border-sol-200"
                    >
                      <KeyRound className="size-3.5 text-sol-600" />
                      Cambiar Clave
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModalEditarUser(u)}
                        className="rounded-xl bg-cielo-50 p-1.5 text-cielo-700 hover:bg-cielo-100 transition"
                        title="Editar nombre, rol o nivel"
                      >
                        <Edit2 className="size-4" />
                      </button>

                      {!esYo && (
                        <button
                          type="button"
                          onClick={() => handleEliminarUsuario(u)}
                          className="rounded-xl bg-coral-50 p-1.5 text-coral-600 hover:bg-coral-100 transition"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VISTA 2: NIVELES DEL JARDÍN */}
      {/* ================================================================= */}
      {pestana === "niveles" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {niveles.map((n) => (
              <article
                key={n.id}
                className="flex flex-col justify-between rounded-3xl border border-white/90 bg-white/95 p-5 shadow-suave space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2 border-b border-cielo-50 pb-2">
                    <h3 className="font-display text-base font-bold text-tinta">{n.nombre}</h3>
                    <span className="insignia bg-cielo-100 text-cielo-800 text-[0.68rem] font-bold">
                      {n.total_parvulos ?? 0} párvulos
                    </span>
                  </div>
                  <p className="text-xs text-tinta-suave leading-relaxed">
                    {n.descripcion || "Sin descripción ingresada."}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-cielo-50">
                  <button
                    type="button"
                    onClick={() => setModalEditarNivel(n)}
                    className="rounded-xl bg-cielo-50 px-3 py-1.5 text-xs font-bold text-cielo-700 hover:bg-cielo-100 transition flex items-center gap-1"
                  >
                    <Edit2 className="size-3.5" /> Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEliminarNivel(n)}
                    disabled={(n.total_parvulos ?? 0) > 0}
                    title={(n.total_parvulos ?? 0) > 0 ? "No puedes eliminar un nivel con párvulos" : "Eliminar nivel"}
                    className="rounded-xl bg-coral-50 p-1.5 text-coral-600 hover:bg-coral-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VISTA 3: LIMPIEZA DE NÓMINA (REINICIO PARA PÁRVULOS REALES) */}
      {/* ================================================================= */}
      {pestana === "limpieza" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-coral-200 bg-white/95 p-6 shadow-suave space-y-5">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-coral-100 text-coral-600">
                <ShieldAlert className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-tinta">
                  Vaciar Nómina de Párvulos y Registros Asociados
                </h3>
                <p className="text-sm text-tinta-suave">
                  Esta acción elimina de manera definitiva todos los párvulos de prueba o de años anteriores en <b>todos los niveles</b>, dejándolos listos para matricular a los párvulos reales.
                </p>
              </div>
            </div>

            {/* Resumen de impacto */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-coral-50/70 p-4 border border-coral-100 text-xs space-y-2">
                <p className="font-bold text-coral-800 uppercase tracking-wide">
                  Datos que se ELIMINARÁN:
                </p>
                <ul className="list-disc list-inside space-y-1 text-coral-700">
                  <li>
                    Todos los párvulos de todos los niveles (
                    {niveles.reduce((acc, n) => acc + (n.total_parvulos ?? 0), 0)} párvulos activos)
                  </li>
                  <li>Todas las asistencias registradas</li>
                  <li>Todas las bitácoras pedagógicas</li>
                  <li>Todas las fotografías y archivos de párvulos</li>
                  <li>Todas las licencias médicas y justificativos</li>
                  <li>Todas las entrevistas de apoderados</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-menta-50/70 p-4 border border-menta-200 text-xs space-y-2">
                <p className="font-bold text-menta-800 uppercase tracking-wide">
                  Datos que se CONSERVAN (No se tocan):
                </p>
                <ul className="list-disc list-inside space-y-1 text-menta-700">
                  <li>Los {niveles.length} Niveles del jardín (Sala Cuna, Medios, etc.)</li>
                  <li>Las {usuarios.length} Cuentas de educadoras, dirección y contraseñas</li>
                  <li>Las planificaciones curriculares de nivel</li>
                  <li>Los comunicados del mural general</li>
                </ul>
              </div>
            </div>

            {/* Formulario de confirmación */}
            <div className="rounded-2xl bg-gray-50 p-5 border border-gray-200 space-y-3">
              <p className="text-xs font-bold text-tinta">
                Para confirmar la eliminación total, escribe la palabra{" "}
                <span className="font-mono text-coral-600 bg-coral-50 px-1.5 py-0.5 rounded border border-coral-200 font-bold">
                  ELIMINAR
                </span>{" "}
                a continuación:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={confirmacionTexto}
                  onChange={(e) => setConfirmacionTexto(e.target.value)}
                  placeholder="Escribe ELIMINAR aquí..."
                  className="campo text-sm font-mono max-w-xs"
                />
                <button
                  type="button"
                  onClick={handleLimpiarTodosLosParvulos}
                  disabled={isPending || confirmacionTexto.trim().toUpperCase() !== "ELIMINAR"}
                  className="boton-coral px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Vaciar Nómina de Párvulos Definitivamente
                </button>
              </div>
            </div>

            {/* Alternativa SQL Supabase */}
            <div className="rounded-2xl bg-cielo-50/60 p-4 border border-cielo-100 text-xs space-y-1.5 text-tinta-suave">
              <p className="font-bold text-tinta">¿Prefieres ejecutarlo directamente en Supabase?</p>
              <p>
                También tienes disponible el script listo para ejecutar en el archivo{" "}
                <code className="font-mono text-cielo-700 font-bold">
                  supabase/limpiar_todos_los_parvulos.sql
                </code>{" "}
                dentro de tu repositorio. Puedes copiar su contenido y pegarlo en el <b>SQL Editor</b>{" "}
                de tu panel de Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: CREAR NUEVA CUENTA */}
      {/* ================================================================= */}
      {modalCrearUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer">
          <div className="relative w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setModalCrearUsuario(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl bg-cielo-50 text-tinta-suave hover:bg-cielo-100"
            >
              <X className="size-4" />
            </button>

            <header className="space-y-1">
              <h3 className="font-display text-lg font-bold text-tinta flex items-center gap-2">
                <UserPlus className="size-5 text-cielo-600" />
                Crear Nueva Cuenta de Personal
              </h3>
              <p className="text-xs text-tinta-suave">
                La educadora podrá iniciar sesión de inmediato con estos datos.
              </p>
            </header>

            <form onSubmit={handleCrearUsuario} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-tinta mb-1">Nombre Completo</label>
                <input
                  name="nombre"
                  type="text"
                  required
                  placeholder="Ej. Tía Camila Valenzuela"
                  className="campo text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">Correo Electrónico (Usuario)</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="ejemplo@manitos.cl"
                  className="campo text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">Contraseña Inicial</label>
                <input
                  name="password"
                  type="text"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="campo text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-tinta mb-1">Rol / Permiso</label>
                  <select name="rol" defaultValue="educadora" className="campo text-sm">
                    <option value="educadora">Educadora de Nivel</option>
                    <option value="organizacion">Organización / Lectura</option>
                    <option value="admin">Administrador Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta mb-1">Nivel Asignado</label>
                  <select name="nivel_id" className="campo text-sm">
                    <option value="">(Ninguno / Global)</option>
                    {niveles.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cielo-50">
                <button
                  type="button"
                  onClick={() => setModalCrearUsuario(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-tinta-suave hover:bg-cielo-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="boton-primario px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: CAMBIAR CONTRASEÑA DE CUALQUIER USUARIO */}
      {/* ================================================================= */}
      {modalPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/80 bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setModalPasswordUser(null)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl bg-cielo-50 text-tinta-suave hover:bg-cielo-100"
            >
              <X className="size-4" />
            </button>

            <header className="space-y-1">
              <h3 className="font-display text-lg font-bold text-tinta flex items-center gap-2">
                <KeyRound className="size-5 text-sol-500" />
                Cambiar Contraseña
              </h3>
              <p className="text-xs text-tinta-suave">
                Usuario: <b className="text-tinta">{modalPasswordUser.nombre_completo}</b> ({modalPasswordUser.email})
              </p>
            </header>

            <form onSubmit={handleCambiarPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-tinta mb-1">
                  Nueva Contraseña para la Educadora
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Ingresa la nueva clave..."
                  className="campo text-sm font-mono"
                  autoFocus
                />
                <p className="text-[0.7rem] text-tinta-suave mt-1">
                  Se actualizará de inmediato. La educadora podrá ingresar con esta nueva clave al instante.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cielo-50">
                <button
                  type="button"
                  onClick={() => setModalPasswordUser(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-tinta-suave hover:bg-cielo-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || nuevaPassword.length < 6}
                  className="boton-sol px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
                  Guardar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: EDITAR PERFIL DE USUARIO */}
      {/* ================================================================= */}
      {modalEditarUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer">
          <div className="relative w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setModalEditarUser(null)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl bg-cielo-50 text-tinta-suave hover:bg-cielo-100"
            >
              <X className="size-4" />
            </button>

            <header className="space-y-1">
              <h3 className="font-display text-lg font-bold text-tinta flex items-center gap-2">
                <Edit2 className="size-5 text-cielo-600" />
                Editar Perfil de Usuario
              </h3>
              <p className="text-xs text-tinta-suave">
                Modifica el nombre, rol o nivel asignado a {modalEditarUser.email}.
              </p>
            </header>

            <form onSubmit={handleEditarUsuario} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-tinta mb-1">Nombre Completo</label>
                <input
                  name="nombre"
                  type="text"
                  required
                  defaultValue={modalEditarUser.nombre_completo}
                  className="campo text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-tinta mb-1">Rol / Permiso</label>
                  <select name="rol" defaultValue={modalEditarUser.rol} className="campo text-sm">
                    <option value="educadora">Educadora de Nivel</option>
                    <option value="organizacion">Organización / Lectura</option>
                    <option value="admin">Administrador Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-tinta mb-1">Nivel Asignado</label>
                  <select
                    name="nivel_id"
                    defaultValue={modalEditarUser.nivel_id ?? ""}
                    className="campo text-sm"
                  >
                    <option value="">(Sin nivel / Global)</option>
                    {niveles.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cielo-50">
                <button
                  type="button"
                  onClick={() => setModalEditarUser(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-tinta-suave hover:bg-cielo-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="boton-primario px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 4: CREAR / EDITAR NIVEL */}
      {/* ================================================================= */}
      {(modalCrearNivel || modalEditarNivel) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tinta/40 backdrop-blur-sm animate-aparecer">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/80 bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => {
                setModalCrearNivel(false);
                setModalEditarNivel(null);
              }}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl bg-cielo-50 text-tinta-suave hover:bg-cielo-100"
            >
              <X className="size-4" />
            </button>

            <header className="space-y-1">
              <h3 className="font-display text-lg font-bold text-tinta flex items-center gap-2">
                <Layers className="size-5 text-sol-500" />
                {modalEditarNivel ? "Editar Nivel" : "Crear Nuevo Nivel"}
              </h3>
              <p className="text-xs text-tinta-suave">
                Ajusta los nombres según la organización oficial del jardín.
              </p>
            </header>

            <form
              onSubmit={modalEditarNivel ? handleEditarNivel : handleCrearNivel}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-tinta mb-1">Nombre del Nivel</label>
                <input
                  name="nombre"
                  type="text"
                  required
                  defaultValue={modalEditarNivel?.nombre ?? ""}
                  placeholder="Ej. Sala Cuna Menor"
                  className="campo text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-tinta mb-1">
                  Descripción o Edades <span className="font-normal text-tinta-suave">(opcional)</span>
                </label>
                <input
                  name="descripcion"
                  type="text"
                  defaultValue={modalEditarNivel?.descripcion ?? ""}
                  placeholder="Ej. Párvulos de 1 a 2 años"
                  className="campo text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cielo-50">
                <button
                  type="button"
                  onClick={() => {
                    setModalCrearNivel(false);
                    setModalEditarNivel(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-tinta-suave hover:bg-cielo-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="boton-sol px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  {modalEditarNivel ? "Guardar Nivel" : "Crear Nivel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
