-- Add wizard-specific fields to cleaning_objects
-- object_type: type of building (Büro, Praxis, Schule, etc.)
-- contact_name: RPI contact person name
-- ruestzeit: setup time in minutes per cleaning visit
-- wegezeit: travel time in minutes per cleaning visit

ALTER TABLE cleaning_objects ADD COLUMN IF NOT EXISTS object_type text;
ALTER TABLE cleaning_objects ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE cleaning_objects ADD COLUMN IF NOT EXISTS ruestzeit numeric(10,2);
ALTER TABLE cleaning_objects ADD COLUMN IF NOT EXISTS wegezeit numeric(10,2);
