-- Create enums for transcription status and language
DO $$ BEGIN
    CREATE TYPE "transcription_status" AS ENUM('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "transcription_language" AS ENUM('de', 'en');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add transcription value to ai_task_type enum if it doesn't exist
DO $$ BEGIN
    ALTER TYPE "ai_task_type" ADD VALUE IF NOT EXISTS 'transcription';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to diary_entries table
ALTER TABLE "diary_entries" ADD COLUMN IF NOT EXISTS "voice_transcription" text;
ALTER TABLE "diary_entries" ADD COLUMN IF NOT EXISTS "transcription_status" "transcription_status";
ALTER TABLE "diary_entries" ADD COLUMN IF NOT EXISTS "transcription_language" "transcription_language";
ALTER TABLE "diary_entries" ADD COLUMN IF NOT EXISTS "transcription_error" text;
