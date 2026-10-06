-- Verrechnungssatz: Standard für neue Firmen und geräteübergreifende Bestätigung.
-- 1) Neue Firmen starten mit dem Vorschlag des Verrechnungssatz-Rechners (Standardwerte,
--    auf den Cent aufgerundet = suggestedDefaultRate() im Client) statt 22,50 €/h, der
--    unter den Standard-Vollkosten (29,91 €/h) liegt. Bestehende Firmen bleiben unverändert.
-- 2) confirmed_hourly_rate: Satz, den der Nutzer auf der Seite „Verrechnungssatz“ als
--    geprüft bestätigt hat (NULL = nicht bestätigt). Gilt nur, solange hourly_rate gleich ist.
-- Idempotent; ohne diese Migration läuft der Client weiter (Bestätigung dann nur lokal).

ALTER TABLE company_settings ALTER COLUMN hourly_rate SET DEFAULT 32.91;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS confirmed_hourly_rate numeric(10,2);

NOTIFY pgrst, 'reload schema';
