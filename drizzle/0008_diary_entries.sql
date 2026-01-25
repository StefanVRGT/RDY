-- Migration: Add diary entries table for mentee journaling
-- This migration adds support for text and voice diary entries

-- Create enum for diary entry types
DO $$ BEGIN
  CREATE TYPE "diary_entry_type" AS ENUM ('text', 'voice', 'mixed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create diary_entries table
CREATE TABLE IF NOT EXISTS "diary_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "entry_type" "diary_entry_type" NOT NULL DEFAULT 'text',
  "content" text,
  "voice_recording_url" text,
  "voice_recording_duration" integer,
  "entry_date" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "diary_entries_user_idx" ON "diary_entries" ("user_id");
CREATE INDEX IF NOT EXISTS "diary_entries_date_idx" ON "diary_entries" ("entry_date");
CREATE INDEX IF NOT EXISTS "diary_entries_user_date_idx" ON "diary_entries" ("user_id", "entry_date");
