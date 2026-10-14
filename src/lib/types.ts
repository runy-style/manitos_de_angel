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

export type EstadoLicencia = "pendiente" | "justificada" | "rechazada";

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
  licencias?: {
    id: string;
    fecha_emision: string;
    fecha_inicio: string;
    fecha_termino: string;
    dias_reposo: number;
    diagnostico_motivo: string | null;
    url: string;
    nombre_archivo: string;
    estado: EstadoLicencia;
    observacion_educadora: string | null;
    created_at?: string;
  }[];
  entrevistas?: {
    id: string;
    fecha: string;
    hora: string;
    modalidad: ModalidadEntrevista;
    motivo: string;
    estado: EstadoEntrevista;
    solicitado_por: SolicitanteEntrevista;
    drive_file_url?: string | null;
    puntos_tratados?: string | null;
    acuerdos_compromisos?: string | null;
    educadora?: string | null;
  }[];
}

export type EstadoEntrevista = "pendiente" | "confirmada" | "realizada" | "cancelada";
export type ModalidadEntrevista = "presencial" | "online" | "telefonica";
export type SolicitanteEntrevista = "educadora" | "apoderado";

export interface Entrevista {
  id: string;
  parvulo_id: string;
  nivel_id: string;
  educadora_id?: string | null;
  fecha: string;
  hora: string;
  solicitado_por: SolicitanteEntrevista;
  modalidad: ModalidadEntrevista;
  motivo: string;
  estado: EstadoEntrevista;
  asistentes?: string | null;
  puntos_tratados?: string | null;
  acuerdos_compromisos?: string | null;
  observaciones?: string | null;
  drive_file_id?: string | null;
  drive_file_url?: string | null;
  nombre_archivo_pdf?: string | null;
  acta_firmada_o_cerrada?: boolean;
  visible_apoderado?: boolean;
  created_at?: string;
  updated_at?: string;
  parvulo?: {
    id: string;
    nombres: string;
    apellidos: string;
    rut: string;
    nombre_apoderado?: string | null;
    telefono_apoderado?: string | null;
  } | null;
  nivel?: {
    id: string;
    nombre: string;
  } | null;
  educadora?: {
    id: string;
    nombre_completo: string;
  } | null;
}

export interface LicenciaMedica {
  id: string;
  parvulo_id: string;
  nivel_id: string;
  fecha_emision: string;
  fecha_inicio: string;
  fecha_termino: string;
  dias_reposo: number;
  diagnostico_motivo: string | null;
  drive_file_id: string | null;
  drive_file_url: string;
  nombre_archivo: string;
  estado: EstadoLicencia;
  observacion_educadora: string | null;
  revisado_por?: string | null;
  revisado_el?: string | null;
  created_at?: string;
  parvulo?: {
    id: string;
    nombres: string;
    apellidos: string;
    rut: string;
  } | null;
  nivel?: {
    id: string;
    nombre: string;
  } | null;
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

export const AREAS_AVANCE = [
  "Autonomía y Convivencia",
  "Comunicación y Lenguaje",
  "Motricidad y Corporalidad",
  "Alimentación y Rutina",
  "Pensamiento Matemático",
  "Exploración del Entorno",
  "Observación General",
] as const;

export type AreaAvance = (typeof AREAS_AVANCE)[number];

export interface EntradaBitacora {
  id: string;
  parvulo_id: string;
  nivel_id: string;
  educadora_id: string | null;
  fecha: string;
  area_avance: AreaAvance | string;
  observacion: string;
  visible_apoderado: boolean;
  created_at?: string;
  educadora?: {
    id: string;
    nombre_completo: string;
  } | null;
  parvulo?: {
    id: string;
    nombres: string;
    apellidos: string;
    rut: string;
  } | null;
}
export const MESES_DEL_ANIO = [
  { numero: 1, nombre: "Enero" },
  { numero: 2, nombre: "Febrero" },
  { numero: 3, nombre: "Marzo" },
  { numero: 4, nombre: "Abril" },
  { numero: 5, nombre: "Mayo" },
  { numero: 6, nombre: "Junio" },
  { numero: 7, nombre: "Julio" },
  { numero: 8, nombre: "Agosto" },
  { numero: 9, nombre: "Septiembre" },
  { numero: 10, nombre: "Octubre" },
  { numero: 11, nombre: "Noviembre" },
  { numero: 12, nombre: "Diciembre" },
] as const;

export type TipoDocumentoNivel = "planificacion_mensual" | "pauta_evaluacion";

export interface DocumentoNivel {
  id: string;
  nivel_id: string;
  educadora_id: string | null;
  tipo_documento: TipoDocumentoNivel;
  mes: number;
  anio: number;
  titulo: string;
  descripcion?: string | null;
  drive_file_id?: string | null;
  drive_file_url: string;
  nombre_archivo: string;
  created_at?: string;
  educadora?: {
    id: string;
    nombre_completo: string;
  } | null;
  nivel?: {
    id: string;
    nombre: string;
  } | null;
}

export type CategoriaArchivoParvulo =
  | "fotografia"
  | "documento_word"
  | "pauta_individual"
  | "otro";

export interface ArchivoParvulo {
  id: string;
  parvulo_id: string;
  educadora_id: string | null;
  categoria: CategoriaArchivoParvulo;
  titulo: string;
  drive_file_id?: string | null;
  drive_file_url: string;
  visible_apoderado: boolean;
  created_at?: string;
  educadora?: {
    id: string;
    nombre_completo: string;
  } | null;
}
