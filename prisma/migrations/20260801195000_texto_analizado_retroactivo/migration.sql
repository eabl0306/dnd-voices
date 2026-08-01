-- Escenas ya analizadas antes de que existiera parsedText: su rawText es, por
-- definición, el texto que se analizó (editarlo las devuelve a DRAFT). Sin este
-- relleno, la primera ampliación de una escena antigua rehace el guion entero
-- en vez de analizar sólo la parte nueva.
UPDATE "Scene"
SET "parsedText" = "rawText"
WHERE "parsedText" = ''
  AND "status" IN ('PARSED', 'RENDERING', 'RENDERED')
  AND EXISTS (SELECT 1 FROM "Line" WHERE "Line"."sceneId" = "Scene".id);
