# Guía y Prompts Maestros para Google Antigravity: Sistema "Jardín Infantil Manitos de Ángel"

Esta guía contiene todo lo que necesitas para construir la plataforma híbrida (**Next.js en Vercel + Supabase + Puente a Google Drive con Google Apps Script**) trabajando paso a paso con el agente autónomo de [Google Antigravity](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2F).

## Resumen de la Arquitectura Híbrida

| Componente | Herramienta | Función dentro del sistema |
| :--- | :--- | :--- |
| **Frontend y Backend Web** | Next.js (App Router) + Tailwind CSS en Vercel | Interfaz para educadoras, vista de lectura para la organización y portal/modal de apoderados |
| **Base de Datos y Usuarios** | Supabase (PostgreSQL + Auth) | Almacenamiento de niveles, párvulos, asistencia diaria, porcentajes, bitácoras y enlaces a archivos |
| **Almacenamiento de Archivos** | Google Apps Script + Google Drive | Creación automática de una carpeta por alumno y subida de documentos Word (`.docx`), PDF y fotografías |

## Parte 1: Preparación de la Base de Datos en Supabase

Antes de enviar el primer prompt en Antigravity (o cuando el agente te pida conectar la base de datos), entra a tu proyecto en Supabase, abre la sección **SQL Editor** y ejecuta el siguiente script SQL. Este código crea todas las tablas, los permisos por rol y la función segura para que el apoderado consulte por el RUT del párvulo:

```sql
-- 1. Extensión para generar identificadores únicos (UUID)
create extension if not exists "pgcrypto";

-- 2. Tabla de Niveles del Jardín (ej. Sala Cuna Menor, Sala Cuna Mayor, Medio Menor, Medio Mayor)
create table public.niveles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  created_at timestamptz default now()
);

-- 3. Perfiles de Usuarios del Jardín (Educadoras y Organización/Dirección)
-- Nota: 'educadora' puede editar su nivel asignado; 'organizacion' puede visualizar todo sin editar.
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  email text not null,
  rol text not null check (rol in ('educadora', 'organizacion', 'admin')),
  nivel_id uuid references public.niveles(id) on delete set null,
  created_at timestamptz default now()
);

-- 4. Tabla de Párvulos (Alumnos)
create table public.parvulos (
  id uuid primary key default gen_random_uuid(),
  rut text not null unique, -- Formato normalizado sin puntos y con guion, ej: 24123456-7
  pin_apoderado text default null, -- Opcional: PIN adicional si se desea reforzar el acceso
  nombres text not null,
  apellidos text not null,
  fecha_nacimiento date,
  nombre_apoderado text,
  telefono_apoderado text,
  nivel_id uuid not null references public.niveles(id) on delete restrict,
  drive_folder_id text,
  drive_folder_url text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- 5. Tabla de Control de Asistencia Diaria
create table public.asistencia (
  id uuid primary key default gen_random_uuid(),
  parvulo_id uuid not null references public.parvulos(id) on delete cascade,
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  fecha date not null default current_date,
  estado text not null check (estado in ('presente', 'ausente', 'justificado')),
  observacion_dia text,
  registrado_por uuid references public.perfiles(id),
  created_at timestamptz default now(),
  unique(parvulo_id, fecha)
);

-- 6. Tabla de Bitácora Individual del Párvulo
create table public.bitacoras (
  id uuid primary key default gen_random_uuid(),
  parvulo_id uuid not null references public.parvulos(id) on delete cascade,
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  educadora_id uuid references public.perfiles(id),
  fecha date not null default current_date,
  area_avance text not null default 'Avance Pedagógico',
  observacion text not null,
  visible_apoderado boolean default true,
  created_at timestamptz default now()
);

-- 7. Tabla de Planificaciones Mensuales y Pautas de Evaluación por Nivel
create table public.documentos_nivel (
  id uuid primary key default gen_random_uuid(),
  nivel_id uuid not null references public.niveles(id) on delete cascade,
  educadora_id uuid references public.perfiles(id),
  tipo_documento text not null check (tipo_documento in ('planificacion_mensual', 'pauta_evaluacion')),
  mes integer not null check (mes between 1 and 12),
  anio integer not null default extract(year from current_date),
  titulo text not null,
  descripcion text,
  drive_file_id text,
  drive_file_url text not null,
  nombre_archivo text,
  created_at timestamptz default now()
);

-- 8. Tabla de Archivos del Párvulo (Word, Fotografías, Evaluaciones Individuales en Drive)
create table public.archivos_parvulo (
  id uuid primary key default gen_random_uuid(),
  parvulo_id uuid not null references public.parvulos(id) on delete cascade,
  educadora_id uuid references public.perfiles(id),
  categoria text not null check (categoria in ('fotografia', 'documento_word', 'pauta_individual', 'otro')),
  titulo text not null,
  drive_file_id text,
  drive_file_url text not null,
  visible_apoderado boolean default true,
  created_at timestamptz default now()
);

-- 9. Función RPC Segura para Consulta del Apoderado mediante RUT del Párvulo
-- Permite que el modal/portal del apoderado obtenga solo los datos del niño cuyo RUT coincida exactamente.
create or replace function public.consultar_ficha_apoderado(p_rut text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_rut_limpio text;
  v_parvulo record;
  v_total_dias integer;
  v_dias_presente integer;
  v_porcentaje numeric(5,2);
  v_asistencias jsonb;
  v_bitacoras jsonb;
  v_archivos jsonb;
begin
  -- Normalizar RUT (quitar puntos y espacios, pasar a mayúsculas)
  v_rut_limpio := upper(replace(replace(trim(p_rut), '.', ''), ' ', ''));

  select p.*, n.nombre as nivel_nombre
  into v_parvulo
  from public.parvulos p
  join public.niveles n on n.id = p.nivel_id
  where upper(replace(replace(trim(p.rut), '.', ''), ' ', '')) = v_rut_limpio
    and p.activo = true
  limit 1;

  if not found then
    return jsonb_build_object('encontrado', false, 'mensaje', 'No se encontró un párvulo activo con el RUT indicado.');
  end if;

  -- Calcular estadísticas de asistencia
  select count(*), count(*) filter (where estado = 'presente')
  into v_total_dias, v_dias_presente
  from public.asistencia
  where parvulo_id = v_parvulo.id;

  if v_total_dias > 0 then
    v_porcentaje := round((v_dias_presente::numeric / v_total_dias::numeric) * 100, 1);
  else
    v_porcentaje := 0;
  end if;

  -- Últimos 30 registros de asistencia
  select coalesce(jsonb_agg( jsonb_build_object(
    'fecha', a.fecha,
    'estado', a.estado,
    'observacion_dia', a.observacion_dia
  ) order by a.fecha desc), '[]'::jsonb)
  into v_asistencias
  from (
    select fecha, estado, observacion_dia
    from public.asistencia
    where parvulo_id = v_parvulo.id
    order by fecha desc
    limit 30
  ) a;

  -- Observaciones de bitácora visibles para el apoderado
  select coalesce(jsonb_agg( jsonb_build_object(
    'id', b.id,
    'fecha', b.fecha,
    'area_avance', b.area_avance,
    'observacion', b.observacion,
    'educadora', pf.nombre_completo
  ) order by b.fecha desc), '[]'::jsonb)
  into v_bitacoras
  from public.bitacoras b
  left join public.perfiles pf on pf.id = b.educadora_id
  where b.parvulo_id = v_parvulo.id
    and b.visible_apoderado = true;

  -- Archivos y fotos compartidos con el apoderado
  select coalesce(jsonb_agg( jsonb_build_object(
    'id', ar.id,
    'titulo', ar.titulo,
    'categoria', ar.categoria,
    'url', ar.drive_file_url,
    'fecha', ar.created_at
  ) order by ar.created_at desc), '[]'::jsonb)
  into v_archivos
  from public.archivos_parvulo ar
  where ar.parvulo_id = v_parvulo.id
    and ar.visible_apoderado = true;

  return jsonb_build_object(
    'encontrado', true,
    'parvulo', jsonb_build_object(
      'nombres', v_parvulo.nombres,
      'apellidos', v_parvulo.apellidos,
      'rut', v_parvulo.rut,
      'nivel', v_parvulo.nivel_nombre,
      'drive_folder_url', v_parvulo.drive_folder_url
    ),
    'estadisticas', jsonb_build_object(
      'total_dias_registrados', v_total_dias,
      'dias_presente', v_dias_presente,
      'porcentaje_asistencia', v_porcentaje
    ),
    'asistencia_reciente', v_asistencias,
    'bitacora', v_bitacoras,
    'archivos', v_archivos
  );
end;
$$;

-- 10. Insertar niveles iniciales de ejemplo para el Jardín Infantil Manitos de Ángel
insert into public.niveles (nombre, descripcion) values
  ('Sala Cuna Menor', 'Párvulos de 85 días a 1 año'),
  ('Sala Cuna Mayor', 'Párvulos de 1 a 2 años'),
  ('Nivel Medio Menor', 'Párvulos de 2 a 3 años'),
  ('Nivel Medio Mayor', 'Párvulos de 3 a 4 años')
on conflict (nombre) do nothing;
```

## Parte 2: Puente en Google Apps Script para crear carpetas por alumno en Drive

Para que tu aplicación web suba archivos Word y fotografías directamente al Google Drive del jardín creando una carpeta individual por cada párvulo sin configurar Google Cloud OAuth:

1. Entra al Google Drive del jardín infantil y haz clic en **Nuevo > Más > Google Apps Script**.
2. Borra el contenido que aparece por defecto y pega el siguiente código:

```javascript
const ROOT_FOLDER_NAME = "JARDIN INFANTIL MANITOS DE ANGEL - SISTEMA";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const rootFolder = getOrCreateFolder_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);

    // Caso 1: Crear carpeta individual del párvulo y/o subir archivo (Word, Foto o Licencia Médica)
    if (data.accion === "subir_archivo_parvulo") {
      const alumnosRoot = getOrCreateFolder_(rootFolder, "01_CARPETAS_PARVULOS");
      const nivelFolder = getOrCreateFolder_(alumnosRoot, data.nombreNivel || "General");
      const nombreCarpetaAlumno = `${data.rutParvulo} - ${data.nombreParvulo}`;
      const alumnoFolder = getOrCreateFolder_(nivelFolder, nombreCarpetaAlumno);

      // Si solo se solicitó asegurar/crear la carpeta del alumno
      if (!data.base64Data) {
        return jsonResponse_({
          ok: true,
          folderId: alumnoFolder.getId(),
          folderUrl: alumnoFolder.getUrl()
        });
      }

      // Si se especifica subcarpeta (ej: "Licencias"), guardarlo dentro de ella
      const destinoFolder = data.subCarpeta
        ? getOrCreateFolder_(alumnoFolder, data.subCarpeta)
        : alumnoFolder;

      // Decodificar archivo en Base64 y guardarlo en la carpeta de destino
      const bytes = Utilities.base64Decode(data.base64Data);
      const blob = Utilities.newBlob(bytes, data.mimeType, data.nombreArchivo);
      const file = destinoFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return jsonResponse_({
        ok: true,
        folderId: alumnoFolder.getId(),
        folderUrl: alumnoFolder.getUrl(),
        subFolderId: destinoFolder.getId(),
        subFolderUrl: destinoFolder.getUrl(),
        fileId: file.getId(),
        fileUrl: file.getUrl()
      });
    }

    // Caso 2: Subir Planificación Mensual o Pauta de Evaluación del Nivel
    if (data.accion === "subir_documento_nivel") {
      const nivelesRoot = getOrCreateFolder_(rootFolder, "02_PLANIFICACIONES_Y_PAUTAS");
      const nivelFolder = getOrCreateFolder_(nivelesRoot, data.nombreNivel || "General");
      const subCarpetaTipo = data.tipoDocumento === "pauta_evaluacion" ? "Pautas de Evaluacion" : "Planificaciones Mensuales";
      const targetFolder = getOrCreateFolder_(nivelFolder, subCarpetaTipo);

      const bytes = Utilities.base64Decode(data.base64Data);
      const blob = Utilities.newBlob(bytes, data.mimeType, data.nombreArchivo);
      const file = targetFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return jsonResponse_({
        ok: true,
        fileId: file.getId(),
        fileUrl: file.getUrl()
      });
    }

    return jsonResponse_({ ok: false, error: "Acción no reconocida" });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err.toString() });
  }
}

function getOrCreateFolder_(parentFolder, folderName) {
  const iter = parentFolder.getFoldersByName(folderName);
  if (iter.hasNext()) {
    return iter.next();
  }
  const newFolder = parentFolder.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Haz clic en **Implementar > Nueva implementación**, selecciona el tipo **Aplicación web**, en *Ejecutar como* elige **Yo** y en *Quién tiene acceso* selecciona **Cualquier persona**.
4. Copia la **URL de la aplicación web** que te entregará Google (la guardarás como `GOOGLE_SCRIPT_WEBHOOK_URL` en tu proyecto).

## Parte 3: Prompts por Etapas para pegar en Google Antigravity

Copia y pega estos prompts **uno por uno** en el chat del agente de Google Antigravity. Espera a que termine y verifique cada etapa antes de pasar a la siguiente.

### Etapa 1: Estructura Base, Diseño Infantil Profesional y Control de Roles

```text
Quiero crear una aplicación web completa en Next.js (App Router, TypeScript, Tailwind CSS y Lucide Icons) conectada a Supabase para el jardín infantil "JARDIN INFANTIL MANITOS DE ANGEL".

CONTEXTO Y ROLES DEL SISTEMA:
1. Educadora de Nivel (`rol = 'educadora'`): Ingresa con su correo y contraseña (Supabase Auth). Tiene asignado un `nivel_id` en la tabla `perfiles`. Es la ÚNICA que puede crear, editar o subir información dentro de su propio nivel (asistencia, bitácoras, planificaciones, pautas y archivos de sus párvulos). También puede visualizar los demás niveles en modo solo lectura si la organización lo permite.
2. Organización / Dirección (`rol = 'organizacion'`): Ingresa con usuario y contraseña. Puede visualizar todos los niveles, estadísticas de asistencia, bitácoras, planificaciones y carpetas de alumnos de todo el jardín, pero en MODO SOLO LECTURA (no puede editar los registros de las educadoras).
3. Apoderado (sin usuario ni contraseña tradicional): En la página de inicio debe existir un botón destacado y un modal/sección llamado "Portal de Apoderados", donde el apoderado ingresa únicamente el RUT del párvulo (clave única) y visualiza el porcentaje de asistencia de su hijo/a, el historial de asistencia y las observaciones de avance que la educadora dejó en su bitácora.

ESQUEMA DE BASE DE DATOS EN SUPABASE (YA CREADO):
- `niveles` (id, nombre, descripcion)
- `perfiles` (id, nombre_completo, email, rol ['educadora' | 'organizacion' | 'admin'], nivel_id)
- `parvulos` (id, rut, nombres, apellidos, fecha_nacimiento, nombre_apoderado, telefono_apoderado, nivel_id, drive_folder_id, drive_folder_url, activo)
- `asistencia` (id, parvulo_id, nivel_id, fecha, estado ['presente' | 'ausente' | 'justificado'], observacion_dia, registrado_por)
- `bitacoras` (id, parvulo_id, nivel_id, educadora_id, fecha, area_avance, observacion, visible_apoderado)
- `documentos_nivel` (id, nivel_id, educadora_id, tipo_documento ['planificacion_mensual' | 'pauta_evaluacion'], mes, anio, titulo, descripcion, drive_file_id, drive_file_url, nombre_archivo)
- `archivos_parvulo` (id, parvulo_id, educadora_id, categoria ['fotografia' | 'documento_word' | 'pauta_individual' | 'otro'], titulo, drive_file_id, drive_file_url, visible_apoderado)
- Función RPC `consultar_ficha_apoderado(p_rut text)` que devuelve un JSON con los datos del párvulo, estadísticas, asistencia reciente, bitácora y archivos.

TAREA PARA ESTA ETAPA 1:
1. Inicializa el proyecto Next.js con Tailwind CSS y configura el cliente de Supabase (`@supabase/ssr` / `@supabase/supabase-js`) leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Crea una interfaz cálida, moderna y acogedora acorde a "Jardín Infantil Manitos de Ángel" (colores pastel suaves como azul cielo, verde menta y amarillo cálido, tipografía legible y excelente adaptación a celulares).
3. Crea la página principal (`/`) con dos accesos claros:
   - "Acceso Educadoras y Organización" (Login con correo y contraseña).
   - "Consulta para Apoderados" (Modal o tarjeta interactiva donde se ingresa el RUT chileno del párvulo con validación y formateo automático de RUT `XX.XXX.XXX-X`).
4. Crea el Layout del Panel Interno (`/dashboard`) que detecte el perfil del usuario autenticado, muestre su nombre, su rol y su nivel asignado, y bloquee los botones de edición si el usuario no es la educadora a cargo de ese nivel.
```

### Etapa 2: Nómina de Párvulos, Control de Asistencia Diaria y Estadísticas en Porcentaje

```text
Ahora vamos a construir la Etapa 2 en el panel interno (`/dashboard`): Gestión de Párvulos y Módulo de Asistencia con Estadísticas en Porcentajes.

REQUERIMIENTOS:
1. Módulo de Párvulos por Nivel (`/dashboard/parvulos`):
   - Permite seleccionar el nivel (por defecto carga el nivel asignado a la educadora).
   - Muestra la lista de párvulos del nivel con su RUT, nombre completo, apoderado, porcentaje de asistencia acumulada y enlace directo a su carpeta de Google Drive.
   - Si el usuario logueado es la educadora a cargo de ese nivel, habilita el botón "Agregar Párvulo" y "Editar Párvulo" con validación de RUT chileno. Si es de otro nivel o del rol `organizacion`, muestra la tabla solo en modo lectura.
2. Módulo de Control de Asistencia Diaria (`/dashboard/asistencia`):
   - Selector de fecha (por defecto hoy) y selector de nivel.
   - Lista rápida de todos los párvulos activos del nivel con botones ágiles para marcar `Presente`, `Ausente` o `Justificado` en un toque desde el celular o computador, más un campo opcional de observación del día y botón "Guardar Asistencia del Nivel" (usando `upsert` en la tabla `asistencia` con la clave única `parvulo_id, fecha`).
   - Solo la educadora a cargo del nivel puede guardar o modificar la asistencia de ese nivel; el resto de la organización solo puede visualizarla.
3. Estadísticas y Porcentajes de Asistencia (`/dashboard/estadisticas` o integrado en pestañas de Asistencia):
   - Muestra tarjetas de resumen del nivel: % de asistencia del día, % de asistencia mensual del nivel y % acumulado anual.
   - Muestra una tabla y gráfico de barras/progreso con el porcentaje de asistencia individual de cada párvulo (`(días presente / total días registrados) * 100`), destacando con alerta visual a los párvulos con asistencia menor al 75%.
   - Permite filtrar por mes y año.
```

### Etapa 3: Bitácora Individual de Avances y Portal/Modal del Apoderado por RUT

```text
Ahora vamos a construir la Etapa 3: Módulo de Bitácora por Párvulo y el Modal/Portal de Consulta para el Apoderado.

REQUERIMIENTOS:
1. Módulo de Bitácora del Párvulo (`/dashboard/bitacora` y ficha individual del niño):
   - Al seleccionar un párvulo de su nivel, la educadora a cargo puede ver el historial cronológico de observaciones y agregar una nueva entrada en la tabla `bitacoras`.
   - Campos al crear una entrada: Fecha, Área de avance (ej. "Autonomía y Convivencia", "Comunicación y Lenguaje", "Motricidad", "Alimentación y Rutina", "Observación General"), detalle de la observación sobre sus avances, y un interruptor `Visible para el apoderado` (activado por defecto).
   - Solo la educadora encargada del nivel puede crear, editar o eliminar observaciones de bitácora de sus párvulos. Los demás miembros de la organización pueden leer las bitácoras sin editarlas.
2. Portal / Modal del Apoderado (conectado a la función RPC `consultar_ficha_apoderado`):
   - Desde la pantalla de inicio (o mediante un enlace directo compartible como `/apoderado`), el apoderado ingresa el RUT de su hijo o hija.
   - Al consultar, invoca `supabase.rpc('consultar_ficha_apoderado', { p_rut })`.
   - Muestra una ficha limpia, amigable para el celular e imprimible con:
     a) Nombre del párvulo, nivel actual y una tarjeta circular o barra de progreso con su **Porcentaje de Asistencia (%)**, total de días asistidos y el detalle de los últimos días registrados.
     b) Línea de tiempo con las **Observaciones de la Educadora (Bitácora de Avances)** ordenadas de la más reciente a la más antigua.
     c) Sección de **Fotos y Documentos Compartidos** del niño con enlaces directos para verlos o descargarlos desde Google Drive.
```

### Etapa 4: Planificaciones Mensuales, Pautas de Evaluación y Carpetas en Google Drive

```text
Ahora vamos a construir la Etapa 4: Subida de Planificaciones Mensuales, Pautas de Evaluación y Archivos de cada Párvulo (Word y Fotografías) conectados a Google Drive mediante nuestro Webhook de Google Apps Script.

ARQUITECTURA DE SUBIDA A GOOGLE DRIVE:
Tenemos una variable de entorno `GOOGLE_SCRIPT_WEBHOOK_URL` que apunta a un Web App de Google Apps Script.
Crea un Route Handler en Next.js (`/api/drive/upload`) que reciba el archivo desde el formulario, lo convierta a Base64 y haga un `POST` a `process.env.GOOGLE_SCRIPT_WEBHOOK_URL`.

REQUERIMIENTOS:
1. Subida de Archivos y Fotografías por Párvulo (Carpeta automática en Drive):
   - En la ficha de cada párvulo, la educadora a cargo del nivel tiene una sección " Subir Archivo / Fotografía a Google Drive".
   - Permite subir archivos Word (`.doc`, `.docx`), PDF o imágenes (`.jpg`, `.png`, `.webp`), eligiendo la categoría (`fotografia`, `documento_word`, `pauta_individual`) y un título descriptivo.
   - Al subirlo, el endpoint `/api/drive/upload` envía al script de Google:
     `{ accion: "subir_archivo_parvulo", rutParvulo, nombreParvulo, nombreNivel, nombreArchivo, mimeType, base64Data }`.
   - El script de Google crea automáticamente (si no existe) la carpeta del alumno en Google Drive, guarda el archivo y devuelve `{ ok: true, folderId, folderUrl, fileId, fileUrl }`.
   - Con esa respuesta, actualiza `drive_folder_id` y `drive_folder_url` en la tabla `parvulos` (si aún no los tenía) e inserta el registro en la tabla `archivos_parvulo`.
   - Además, cuando se crea un párvulo nuevo en el sistema, llama automáticamente a `/api/drive/upload` sin archivo para que se cree de inmediato su carpeta individual en Google Drive.
2. Módulo de Planificaciones Mensuales y Pautas de Evaluación (`/dashboard/planificaciones`):
   - Permite filtrar por Nivel, Año y Mes.
   - Muestra dos pestañas o secciones claras: **Planificaciones Mensuales** y **Pautas de Evaluación**.
   - Solo la educadora a cargo del nivel puede cargar nuevos archivos (Word, PDF, Excel) en su nivel; el endpoint envía `{ accion: "subir_documento_nivel", nombreNivel, tipoDocumento, nombreArchivo, mimeType, base64Data }` a Google Drive y guarda el enlace resultante en la tabla `documentos_nivel`.
   - Toda la organización del jardín puede visualizar y abrir las planificaciones y pautas de todos los niveles desde esta sección.
```

## Parte 4: Variables de entorno que debes configurar en Antigravity y Vercel

En la raíz del proyecto que cree Antigravity, crea un archivo llamado `.env.local` y pega tus tres llaves reales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-llave-anon-publica-de-supabase
GOOGLE_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/TU_ID_DE_IMPLEMENTACION/exec
```
