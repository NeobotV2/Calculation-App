-- CleanCalc Pro: Leads / E-Mail-Erfassung (Funnel)
-- Run this in your Supabase SQL editor after 001_initial_schema.sql.
-- Speichert E-Mail-Leads von der öffentlichen Landingpage (#/willkommen).

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  role TEXT,
  source TEXT NOT NULL DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Öffentliche Besucher (anon) dürfen Leads anlegen, aber nicht lesen.
-- Das Auslesen erfolgt ausschließlich über die Service-Role (Backend/Export).
DROP POLICY IF EXISTS "Anyone can submit a lead" ON leads;
CREATE POLICY "Anyone can submit a lead"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
