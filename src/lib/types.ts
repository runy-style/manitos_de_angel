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
  niveles?: Pick<Nivel, "id" | "nombre">[];
  niveles_ids?: string[];
}

export interface PerfilConNivel extends Perfil {
  nivel: Pick<Nivel, "id" | "nombre"> | null;
  niveles?: Pick<Nivel, "id" | "nombre">[];
  niveles_ids?: string[];
}

export type EstadoAsistencia = "presente" | "ausente" | "justificado";

export type EstadoLicencia = "pendiente" | "justificada" | "rechazada";

export interface FichaApoderado {
  encontrado: boolean;
  requiere_pin?: boolean;
  pin_incorrecto?: boolean;
  parvulo_nombre?: string;
  rut?: string;
  mensaje?: string;
  parvulo?: {
    nombres: string;
    apellidos: string;
    rut: string;
    nivel: string;
    drive_folder_url: string | null;
    tiene_pin?: boolean;
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
  comunicados?: {
    id: string;
    titulo: string;
    contenido: string;
    categoria: CategoriaComunicado;
    fijado: boolean;
    fecha_evento?: string | null;
    adjunto_url?: string | null;
    created_at: string;
    es_general: boolean;
    nivel_nombre?: string | null;
    autor_nombre?: string | null;
  }[];
}

export type CategoriaComunicado =
  | "informativo"
  | "actividad"
  | "urgente"
  | "materiales"
  | "celebracion";

export interface Comunicado {
  id: string;
  nivel_id?: string | null;
  autor_id?: string | null;
  titulo: string;
  contenido: string;
  categoria: CategoriaComunicado;
  fijado: boolean;
  fecha_evento?: string | null;
  adjunto_url?: string | null;
  activo: boolean;
  created_at: string;
  updated_at?: string;
  nivel?: {
    id: string;
    nombre: string;
  } | null;
  autor?: {
    id: string;
    nombre_completo: string;
    rol?: string;
  } | null;
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

export interface Publicacion {
  id: string;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  autor_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  autor?: {
    id: string;
    nombre_completo: string;
    email?: string;
    rol?: string;
  } | null;
}

export type EstamentoPersonal =
  | "educadora"
  | "tecnico_parvulos"
  | "auxiliar"
  | "cocinera"
  | "directora"
  | "administrativo";

export type TipoContratoPersonal = "planta" | "contrata" | "reemplazo";

export type EstadoPermiso = "pendiente" | "aprobado" | "rechazado";

export const ETIQUETAS_ESTAMENTO: Record<EstamentoPersonal, string> = {
  educadora: "Educadora de Párvulos",
  tecnico_parvulos: "Técnico en Párvulos",
  auxiliar: "Auxiliar de Servicios",
  cocinera: "Manipuladora / Cocina",
  directora: "Dirección / Jefatura",
  administrativo: "Personal Administrativo",
};

export const ETIQUETAS_CONTRATO: Record<TipoContratoPersonal, string> = {
  planta: "Planta",
  contrata: "Contrata",
  reemplazo: "Reemplazo",
};

export interface Funcionaria {
  id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  telefono: string | null;
  estamento_rol: EstamentoPersonal;
  tipo_contrato: TipoContratoPersonal;
  activo: boolean;
  fecha_ingreso: string;
  dias_permiso_anual: number;
  perfil_id?: string | null;
  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FuncionariaConSaldo extends Funcionaria {
  nombre_completo: string;
  total_dias_asignados: number;
  periodo_ano: number;
  dias_utilizados: number;
  dias_pendientes: number;
  dias_restantes: number;
}

export interface ReemplazoPersonal {
  id: string;
  titular_id: string;
  reemplazante_nombre: string;
  reemplazante_id: string | null;
  motivo: string;
  fecha_inicio: string;
  fecha_termino: string;
  observaciones: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  titular?: {
    id: string;
    nombres: string;
    apellidos: string;
    rut: string;
    estamento_rol: EstamentoPersonal;
  } | null;
}

export interface SolicitudPermiso {
  id: string;
  funcionaria_id: string;
  fecha_solicitada: string;
  fecha_termino: string | null;
  dias_solicitados: number;
  estado: EstadoPermiso;
  periodo_ano: number;
  observaciones: string | null;
  registrado_por: string | null;
  created_at: string;
  funcionaria?: {
    id: string;
    nombres: string;
    apellidos: string;
    rut: string;
    estamento_rol: EstamentoPersonal;
  } | null;
}

