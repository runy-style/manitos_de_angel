-- =====================================================================
-- SCRIPT DE LIMPIEZA COMPLETA DE PÁRVULOS Y REGISTROS ASOCIADOS
-- Jardín Infantil Manitos de Ángel
--
-- PROPÓSITO:
--   Elimina todos los datos de párvulos de prueba o históricos en
--   TODOS los niveles, dejando la base de datos limpia para ingresar
--   la nómina de párvulos reales.
--
-- TABLAS QUE SE LIMPIAN:
--   1. public.asistencia         (Asistencias diarias registradas)
--   2. public.bitacoras          (Observaciones y avances pedagógicos)
--   3. public.archivos_parvulo   (Fotos y documentos asociados a párvulos)
--   4. public.licencias_medicas  (Licencias y justificativos médicos)
--   5. public.entrevistas        (Entrevistas de apoderados agendadas/cerradas)
--   6. public.parvulos           (Nómina principal de párvulos de todos los niveles)
--
-- TABLAS QUE SE CONSERVAN INTACTAS (NO SE TOCAN):
--   - public.niveles             (Sala Cuna Menor, Sala Cuna Mayor, etc.)
--   - public.perfiles            (Cuentas de educadoras, dirección y admin)
--   - auth.users                 (Credenciales de inicio de sesión)
--   - public.documentos_nivel    (Planificaciones mensuales y pautas del jardín)
--   - public.comunicados         (Mural de avisos y circulares generales)
--
-- INSTRUCCIONES DE USO EN SUPABASE:
--   1. Ve a tu proyecto en https://supabase.com
--   2. En el menú lateral izquierdo, haz clic en "SQL Editor".
--   3. Crea una nueva consulta ("New Query"), pega este script y presiona "Run".
-- =====================================================================

BEGIN;

-- 1. Eliminar registros en tablas dependientes (por seguridad y orden de claves foráneas)
DELETE FROM public.asistencia;
DELETE FROM public.bitacoras;
DELETE FROM public.archivos_parvulo;
DELETE FROM public.licencias_medicas;
DELETE FROM public.entrevistas;

-- 2. Eliminar todos los párvulos de todos los niveles
DELETE FROM public.parvulos;

COMMIT;

-- 3. Verificación final: Debe retornar 0 en todas las tablas
SELECT 
  (SELECT count(*) FROM public.parvulos)          AS parvulos_restantes,
  (SELECT count(*) FROM public.asistencia)        AS asistencias_restantes,
  (SELECT count(*) FROM public.bitacoras)         AS bitacoras_restantes,
  (SELECT count(*) FROM public.archivos_parvulo)  AS archivos_restantes,
  (SELECT count(*) FROM public.licencias_medicas) AS licencias_restantes,
  (SELECT count(*) FROM public.entrevistas)       AS entrevistas_restantes,
  (SELECT count(*) FROM public.niveles)           AS niveles_conservados,
  (SELECT count(*) FROM public.perfiles)          AS cuentas_personal_conservadas;
