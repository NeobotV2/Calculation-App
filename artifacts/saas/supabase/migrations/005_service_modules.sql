-- Leistungsmodule je Objekt: Winterdienst, Hausmeisterservice (HMS) und Ist-Daten der Modul-Nachkalkulation.
-- NULL = nicht angeboten bzw. keine Ist-Daten. Struktur: src/lib/service-modules/types.ts (schemaVersion 1).
-- Pausieren über {"enabled": false}, nicht über NULL. RLS (company_id = get_my_company_id()) gilt auch für neue Spalten.
-- Idempotent: mehrfach ausführbar (IF NOT EXISTS / duplicate_object-Guards).
-- Deployment-Reihenfolge: diese Migration VOR dem Client ausrollen.

ALTER TABLE cleaning_objects ADD COLUMN IF NOT EXISTS winterdienst jsonb;
ALTER TABLE cleaning_objects ADD COLUMN IF NOT EXISTS hms jsonb;
ALTER TABLE cleaning_objects ADD COLUMN IF NOT EXISTS service_actuals jsonb;

DO $$ BEGIN
  ALTER TABLE cleaning_objects ADD CONSTRAINT cleaning_objects_winterdienst_is_object
    CHECK (winterdienst IS NULL OR jsonb_typeof(winterdienst) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cleaning_objects ADD CONSTRAINT cleaning_objects_hms_is_object
    CHECK (hms IS NULL OR jsonb_typeof(hms) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cleaning_objects ADD CONSTRAINT cleaning_objects_service_actuals_is_object
    CHECK (service_actuals IS NULL OR jsonb_typeof(service_actuals) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
