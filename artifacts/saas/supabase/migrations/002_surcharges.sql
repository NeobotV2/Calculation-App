-- CleanCalc Pro – Migration: Add surcharge columns to rooms and template_rooms
-- Run this SQL in your Supabase SQL Editor after 001_initial_schema.sql

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS soiling_level text,
  ADD COLUMN IF NOT EXISTS furnishing_level text,
  ADD COLUMN IF NOT EXISTS floor_type text;

ALTER TABLE template_rooms
  ADD COLUMN IF NOT EXISTS soiling_level text,
  ADD COLUMN IF NOT EXISTS furnishing_level text,
  ADD COLUMN IF NOT EXISTS floor_type text;
