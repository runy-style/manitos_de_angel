/**
 * Tipos del dominio, alineados con el esquema SQL de Supabase
 * descrito en "Manitos de angel.md" (Parte 1).
 */

export type Rol = "educadora" | "organizacion" | "admin";

export interface Nivel {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface Perfil {
  id: string;
  nombre_completo: string;
  email: string;
  rol: Rol;
  nivel_id: string | null;
}

export interface PerfilConNivel extends Perfil {
  nivel: Pick<Nivel, "id" | "nombre"> | null;
}

export type EstadoAsistencia = "presente" | "ausente" | "justificado";

export interface FichaApoderado {
  encontrado: boolean;
  mensaje?: string;
  parvulo?: {
    nombres: string;
    apellidos: string;
    rut: string;
    nivel: string;
    drive_folder_url: string | null;
  };
  estadisticas?: {
    total_dias_registrados: number;
    dias_presente: number;
    porcentaje_asistencia: number;
  };
  asistencia_reciente?: {
    fecha: string;
    estado: EstadoAsistencia;
    observacion_dia: string | null;
  }[];
  bitacora?: {
    id: string;
    fecha: string;
    area_avance: string;
    observacion: string;
    educadora: string | null;
  }[];
  archivos?: {
    id: string;
    titulo: string;
    categoria: string;
    url: string;
    fecha: string;
  }[];
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  educadora: "Educadora de Nivel",
  organizacion: "Organización / Dirección",
  admin: "Administración",
};

export interface Parvulo {
  id: string;
  rut: string;
  pin_apoderado: string | null;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  nombre_apoderado: string | null;
  telefono_apoderado: string | null;
  nivel_id: string;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  activo: boolean;
  created_at?: string;
}

export interface ParvuloConAsistencia extends Parvulo {
  total_dias?: number;
  dias_presente?: number;
  dias_ausente?: number;
  dias_justificado?: number;
  porcentaje_asistencia?: number;
}

export interface RegistroAsistencia {
  id?: string;
  parvulo_id: string;
  nivel_id: string;
  fecha: string;
  estado: EstadoAsistencia;
  observacion_dia?: string | null;
  registrado_por?: string | null;
  created_at?: string;
}
