-- =====================================================================
-- SCRIPT DE CARGA EN BLOQUE DE PÁRVULOS (NIVEL TRANSICIÓN)
-- Jardín Infantil y Sala Cuna Manitos de Ángel
--
-- PROPÓSITO:
--   Ingresa en bloque a la nómina oficial los 20 párvulos proporcionados
--   en la lista, asignándolos automáticamente al nivel Transición.
--   Si el nivel aún no existe en public.niveles, el script lo crea automáticamente.
--
-- PÁRVULOS A INGRESAR (20 ALUMNOS):
--   1.  100.693.333-1 - Amina Samantha Blanco Amaya (IPE)
--   2.  27.387.440-2 - Juan Pedro Bustamante Godoy
--   3.  27.486.442-7 - Florencia Andrea Cobs Castillo
--   4.  27.340.753-7 - Leonor Alejandra Fernández Pizarro
--   5.  27.740.394-3 - David Nehemías García Gallardo
--   6.  27.736.470-0 - Nathan Javier Leiva Cruz
--   7.  27.273.249-3 - Renato Agustín Leiva Pérez
--   8.  27.463.998-9 - Amalia Beatriz López Fernández
--   9.  27.694.175-5 - Máximo Andrés Maturana Paz
--  10.  27.620.932-9 - Aranza Belén Molina Araya
--  11.  27.748.993-7 - Bruno Andrés Mondaca Durán
--  12.  27.262.261-2 - Tomás Alejandro Ojeda Leiva
--  13.  27.737.170-7 - Rocío Trinidad Olivares Quiroz
--  14.  27.682.314-0 - Demian Pérez Acevedo
--  15.  27.672.267-0 - Thiago Ramón Pizarro Tapia
--  16.  27.703.564-2 - Mariano Bastián Pizarro Aros
--  17.  27.299.610-5 - Vicente Alonso Prado Acevedo
--  18.  27.553.414-5 - Santiago Alonso Solís Sepúlveda
--  19.  27.268.510-K - Ismael Emiliano Tapia Villalobos
--  20.  27.668.840-5 - Carlos Javier Verdejo Vega
--
-- INSTRUCCIONES DE USO:
--   1. Abre tu proyecto en Supabase (https://supabase.com/dashboard).
--   2. Ve a "SQL Editor" en el menú lateral izquierdo.
--   3. Pega este script completo y haz clic en "Run".
-- =====================================================================

DO $$
DECLARE
  v_nivel_id uuid;
  v_nombre_nivel text;
  v_contador_insertados int := 0;
BEGIN
  -- 1. Buscar nivel de Transición existente (por ej. 'Nivel Transición', 'Transición', etc.)
  SELECT id, nombre INTO v_nivel_id, v_nombre_nivel
  FROM public.niveles
  WHERE nombre ILIKE '%transici%'
  ORDER BY created_at ASC
  LIMIT 1;

  -- 2. Si no existe aún en public.niveles, crearlo automáticamente
  IF v_nivel_id IS NULL THEN
    INSERT INTO public.niveles (nombre, descripcion)
    VALUES ('Nivel Transición', 'Párvulos de 4 a 5 años (Pre-Kínder y Kínder)')
    RETURNING id, nombre INTO v_nivel_id, v_nombre_nivel;
    
    RAISE NOTICE '==> Se ha creado el nuevo nivel: "%" (ID: %)', v_nombre_nivel, v_nivel_id;
  ELSE
    RAISE NOTICE '==> Asignando párvulos al nivel existente: "%" (ID: %)', v_nombre_nivel, v_nivel_id;
  END IF;

  -- 3. Tabla temporal con la nómina de los 20 párvulos
  CREATE TEMP TABLE temp_parvulos_transicion (
    rut text,
    nombres text,
    apellidos text
  ) ON COMMIT DROP;

  INSERT INTO temp_parvulos_transicion (rut, nombres, apellidos) VALUES
    ('100693333-1', 'Amina Samantha',   'Blanco Amaya'),
    ('27387440-2',  'Juan Pedro',       'Bustamante Godoy'),
    ('27486442-7',  'Florencia Andrea',  'Cobs Castillo'),
    ('27340753-7',  'Leonor Alejandra', 'Fernández Pizarro'),
    ('27740394-3',  'David Nehemías',   'García Gallardo'),
    ('27736470-0',  'Nathan Javier',    'Leiva Cruz'),
    ('27273249-3',  'Renato Agustín',   'Leiva Pérez'),
    ('27463998-9',  'Amalia Beatriz',   'López Fernández'),
    ('27694175-5',  'Máximo Andrés',    'Maturana Paz'),
    ('27620932-9',  'Aranza Belén',     'Molina Araya'),
    ('27748993-7',  'Bruno Andrés',     'Mondaca Durán'),
    ('27262261-2',  'Tomás Alejandro',  'Ojeda Leiva'),
    ('27737170-7',  'Rocío Trinidad',   'Olivares Quiroz'),
    ('27682314-0',  'Demian',           'Pérez Acevedo'),
    ('27672267-0',  'Thiago Ramón',     'Pizarro Tapia'),
    ('27703564-2',  'Mariano Bastián',  'Pizarro Aros'),
    ('27299610-5',  'Vicente Alonso',   'Prado Acevedo'),
    ('27553414-5',  'Santiago Alonso',  'Solís Sepúlveda'),
    ('27268510-K',  'Ismael Emiliano',  'Tapia Villalobos'),
    ('27668840-5',  'Carlos Javier',    'Verdejo Vega');

  -- 4. Insertar o actualizar en public.parvulos
  INSERT INTO public.parvulos (
    rut,
    nombres,
    apellidos,
    nivel_id,
    activo
  )
  SELECT
    t.rut,
    t.nombres,
    t.apellidos,
    v_nivel_id,
    true
  FROM temp_parvulos_transicion t
  ON CONFLICT (rut) DO UPDATE SET
    nombres = EXCLUDED.nombres,
    apellidos = EXCLUDED.apellidos,
    nivel_id = EXCLUDED.nivel_id,
    activo = true;

  GET DIAGNOSTICS v_contador_insertados = ROW_COUNT;

  RAISE NOTICE '==> ¡ÉXITO! Se procesaron % párvulos para el nivel "%".', v_contador_insertados, v_nombre_nivel;
END;
$$;

-- 5. Mostrar la nómina recién ingresada para verificación inmediata
SELECT 
  p.rut,
  p.apellidos,
  p.nombres,
  n.nombre AS nivel_asignado,
  p.activo,
  p.created_at
FROM public.parvulos p
JOIN public.niveles n ON n.id = p.nivel_id
WHERE p.rut IN (
  '100693333-1', '27387440-2', '27486442-7', '27340753-7',
  '27740394-3', '27736470-0', '27273249-3', '27463998-9',
  '27694175-5', '27620932-9', '27748993-7', '27262261-2',
  '27737170-7', '27682314-0', '27672267-0', '27703564-2',
  '27299610-5', '27553414-5', '27268510-K', '27668840-5'
)
ORDER BY p.apellidos ASC, p.nombres ASC;
