-- =====================================================================
-- SCRIPT DE CARGA EN BLOQUE DE PÁRVULOS (NIVEL MEDIOS)
-- Jardín Infantil y Sala Cuna Manitos de Ángel
--
-- PROPÓSITO:
--   Ingresa en bloque a la nómina oficial los 12 párvulos proporcionados
--   en la lista, asignándolos automáticamente al nivel de Medios.
--
-- PÁRVULOS A INGRESAR:
--   1. 28.159.063-4 - Matilde Antonela Báez Bustamante
--   2. 28.198.063-7 - Mateo Ignacio Briceño Acevedo
--   3. 28.175.505-6 - Monserrat Isabel Clavería Oliva
--   4. 27.884.266-5 - Amparo Victoria Gallardo Pizarro
--   5. 27.784.229-7 - Rocío Mel Navia Delgado
--   6. 28.314.237-K - Jesús Ignacio Ogaz Vivanco
--   7. 27.784.047-2 - Sofía Emilia Pizarro Estay
--   8. 28.300.452-K - Maura Aurora Pizarro Tapia
--   9. 27.950.570-0 - Renata Agustina Ponce Bustamante
--  10. 27.874.625-9 - Bruno Ignacio Reyes Osses
--  11. 28.351.534-6 - Paolo Ignacio Valdivia Bustamante
--  12. 28.130.987-0 - Catalina Belén Vilches Sanhueza
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
  v_contador_actualizados int := 0;
BEGIN
  -- 1. Buscar el nivel objetivo de Medios
  -- Busca por 'Nivel Medio Menor', 'Nivel Medios', 'Medio Menor', 'Medios', etc.
  SELECT id, nombre INTO v_nivel_id, v_nombre_nivel
  FROM public.niveles
  WHERE nombre ILIKE '%medio%'
  ORDER BY 
    CASE 
      WHEN nombre ILIKE '%menor%' THEN 1 
      WHEN nombre ILIKE '%medios%' THEN 2 
      ELSE 3 
    END ASC,
    created_at ASC
  LIMIT 1;

  -- Si no existe ningún nivel con la palabra 'medio', buscar el primer nivel disponible
  IF v_nivel_id IS NULL THEN
    SELECT id, nombre INTO v_nivel_id, v_nombre_nivel
    FROM public.niveles
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_nivel_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún nivel en la tabla public.niveles. Debes crear al menos un nivel primero.';
  END IF;

  RAISE NOTICE '==> Asignando párvulos al nivel: "%" (ID: %)', v_nombre_nivel, v_nivel_id;

  -- 2. Tabla temporal con la nómina de los 12 párvulos
  CREATE TEMP TABLE temp_parvulos_nuevos (
    rut text,
    nombres text,
    apellidos text
  ) ON COMMIT DROP;

  INSERT INTO temp_parvulos_nuevos (rut, nombres, apellidos) VALUES
    ('28159063-4', 'Matilde Antonela', 'Báez Bustamante'),
    ('28198063-7', 'Mateo Ignacio',    'Briceño Acevedo'),
    ('28175505-6', 'Monserrat Isabel',  'Clavería Oliva'),
    ('27884266-5', 'Amparo Victoria',   'Gallardo Pizarro'),
    ('27784229-7', 'Rocío Mel',         'Navia Delgado'),
    ('28314237-K', 'Jesús Ignacio',     'Ogaz Vivanco'),
    ('27784047-2', 'Sofía Emilia',      'Pizarro Estay'),
    ('28300452-K', 'Maura Aurora',      'Pizarro Tapia'),
    ('27950570-0', 'Renata Agustina',   'Ponce Bustamante'),
    ('27874625-9', 'Bruno Ignacio',     'Reyes Osses'),
    ('28351534-6', 'Paolo Ignacio',     'Valdivia Bustamante'),
    ('28130987-0', 'Catalina Belén',    'Vilches Sanhueza');

  -- 3. Insertar o actualizar cada párvulo en public.parvulos
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
  FROM temp_parvulos_nuevos t
  ON CONFLICT (rut) DO UPDATE SET
    nombres = EXCLUDED.nombres,
    apellidos = EXCLUDED.apellidos,
    nivel_id = EXCLUDED.nivel_id,
    activo = true;

  GET DIAGNOSTICS v_contador_insertados = ROW_COUNT;

  RAISE NOTICE '==> ¡ÉXITO! Se procesaron % párvulos para el nivel "%".', v_contador_insertados, v_nombre_nivel;
END;
$$;

-- 4. Mostrar la nómina recién ingresada para verificación inmediata
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
  '28159063-4', '28198063-7', '28175505-6', '27884266-5',
  '27784229-7', '28314237-K', '27784047-2', '28300452-K',
  '27950570-0', '27874625-9', '28351534-6', '28130987-0'
)
ORDER BY p.apellidos ASC, p.nombres ASC;
