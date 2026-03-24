-- CleanCalc Pro: Initial Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Meine Reinigungsfirma',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Inhaber',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Company settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 22.50,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  default_frequency TEXT NOT NULL DEFAULT '5x_week',
  pdf_header TEXT NOT NULL DEFAULT '',
  pdf_footer TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions table (prepared for Stripe, not connected yet)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cleaning objects (projects)
CREATE TABLE IF NOT EXISTS cleaning_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  customer TEXT,
  location TEXT,
  notes TEXT,
  hourly_rate NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_id UUID NOT NULL REFERENCES cleaning_objects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type_id TEXT NOT NULL,
  type_name TEXT NOT NULL,
  group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  area NUMERIC(10,2) NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT '5x_week',
  type_performance NUMERIC(10,2) NOT NULL DEFAULT 0,
  custom_performance NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Custom room types
CREATE TABLE IF NOT EXISTS custom_room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  performance_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_objects_company ON cleaning_objects(company_id);
CREATE INDEX IF NOT EXISTS idx_rooms_object ON rooms(object_id);
CREATE INDEX IF NOT EXISTS idx_rooms_company ON rooms(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_company ON templates(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_room_types_company ON custom_room_types(company_id);

-- Row Level Security

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_room_types ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies: companies
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (id = get_user_company_id());

CREATE POLICY "Users can update own company"
  ON companies FOR UPDATE
  USING (id = get_user_company_id());

-- RLS Policies: profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies: company_settings
CREATE POLICY "Users can view own settings"
  ON company_settings FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can update own settings"
  ON company_settings FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own settings"
  ON company_settings FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

-- RLS Policies: subscriptions
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (company_id = get_user_company_id());

-- RLS Policies: cleaning_objects
CREATE POLICY "Users can view own objects"
  ON cleaning_objects FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own objects"
  ON cleaning_objects FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own objects"
  ON cleaning_objects FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own objects"
  ON cleaning_objects FOR DELETE
  USING (company_id = get_user_company_id());

-- RLS Policies: rooms
CREATE POLICY "Users can view own rooms"
  ON rooms FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own rooms"
  ON rooms FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own rooms"
  ON rooms FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own rooms"
  ON rooms FOR DELETE
  USING (company_id = get_user_company_id());

-- RLS Policies: templates
CREATE POLICY "Users can view own templates"
  ON templates FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own templates"
  ON templates FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE
  USING (company_id = get_user_company_id());

-- RLS Policies: custom_room_types
CREATE POLICY "Users can view own room types"
  ON custom_room_types FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own room types"
  ON custom_room_types FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own room types"
  ON custom_room_types FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete own room types"
  ON custom_room_types FOR DELETE
  USING (company_id = get_user_company_id());

-- Trigger: Auto-create company, profile, settings, and subscription on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  INSERT INTO companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Meine Reinigungsfirma'))
  RETURNING id INTO new_company_id;

  INSERT INTO profiles (id, company_id, full_name, role)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'Inhaber'
  );

  INSERT INTO company_settings (company_id)
  VALUES (new_company_id);

  INSERT INTO subscriptions (company_id, plan, status)
  VALUES (new_company_id, 'basic', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Updated_at auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER update_cleaning_objects_updated_at
  BEFORE UPDATE ON cleaning_objects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
