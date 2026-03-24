-- CleanCalc Pro – Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Prerequisites: Supabase project with Auth enabled and email confirmation turned on

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Meine Reinigungsfirma',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Inhaber',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 22.50,
  vat_rate numeric(5,2) NOT NULL DEFAULT 0,
  default_frequency text NOT NULL DEFAULT '5x_week',
  pdf_header text NOT NULL DEFAULT '',
  pdf_footer text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaning_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  customer text,
  location text,
  notes text,
  hourly_rate numeric(10,2),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES cleaning_objects(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type_id text NOT NULL,
  type_name text NOT NULL,
  group_id text NOT NULL,
  group_name text NOT NULL,
  area numeric(10,2) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT '5x_week',
  type_performance numeric(10,2) NOT NULL DEFAULT 250,
  custom_performance numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  rooms jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  group_id text NOT NULL,
  group_name text NOT NULL,
  performance_value numeric(10,2) NOT NULL DEFAULT 250,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_objects_company ON cleaning_objects(company_id);
CREATE INDEX IF NOT EXISTS idx_rooms_object ON rooms(object_id);
CREATE INDEX IF NOT EXISTS idx_rooms_company ON rooms(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_company ON templates(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_room_types_company ON custom_room_types(company_id);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_room_types ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;

-- profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- companies
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (id = get_my_company_id());

CREATE POLICY "Users can update own company"
  ON companies FOR UPDATE
  USING (id = get_my_company_id());

-- company_settings
CREATE POLICY "Users can view own settings"
  ON company_settings FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can update own settings"
  ON company_settings FOR UPDATE
  USING (company_id = get_my_company_id());

-- subscriptions
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (company_id = get_my_company_id());

-- cleaning_objects
CREATE POLICY "Users can view own objects"
  ON cleaning_objects FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own objects"
  ON cleaning_objects FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update own objects"
  ON cleaning_objects FOR UPDATE
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can delete own objects"
  ON cleaning_objects FOR DELETE
  USING (company_id = get_my_company_id());

-- rooms
CREATE POLICY "Users can view own rooms"
  ON rooms FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own rooms"
  ON rooms FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update own rooms"
  ON rooms FOR UPDATE
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can delete own rooms"
  ON rooms FOR DELETE
  USING (company_id = get_my_company_id());

-- templates
CREATE POLICY "Users can view own templates"
  ON templates FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own templates"
  ON templates FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  USING (company_id = get_my_company_id());

-- custom_room_types
CREATE POLICY "Users can view own custom room types"
  ON custom_room_types FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own custom room types"
  ON custom_room_types FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update own custom room types"
  ON custom_room_types FOR UPDATE
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can delete own custom room types"
  ON custom_room_types FOR DELETE
  USING (company_id = get_my_company_id());

-- ============================================================
-- 4. AUTO-PROVISIONING TRIGGER
-- On new user signup, create company + profile + settings + subscription
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  INSERT INTO companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Meine Reinigungsfirma'))
  RETURNING id INTO new_company_id;

  INSERT INTO profiles (id, company_id, full_name, role)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Inhaber')
  );

  INSERT INTO company_settings (company_id) VALUES (new_company_id);
  INSERT INTO subscriptions (company_id) VALUES (new_company_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_companies BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_company_settings BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_subscriptions BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_cleaning_objects BEFORE UPDATE ON cleaning_objects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_rooms BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_templates BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_custom_room_types BEFORE UPDATE ON custom_room_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
