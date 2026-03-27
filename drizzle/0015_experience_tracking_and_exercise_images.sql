-- Add image URL to exercises table
ALTER TABLE "exercises" ADD COLUMN "image_url" text;

-- Create time_block enum
DO $$ BEGIN
  CREATE TYPE "public"."time_block" AS ENUM('6AM', '9AM', '12PM', '3PM', '6PM', '9PM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create experience_entries table for one-tap Schwerpunktebene tracking
CREATE TABLE IF NOT EXISTS "experience_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "schwerpunktebene_id" uuid NOT NULL,
  "time_block" "time_block" NOT NULL,
  "entry_date" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "experience_entries" ADD CONSTRAINT "experience_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "experience_entries" ADD CONSTRAINT "experience_entries_schwerpunktebene_id_schwerpunktebenen_id_fk" FOREIGN KEY ("schwerpunktebene_id") REFERENCES "public"."schwerpunktebenen"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "experience_entries_user_idx" ON "experience_entries" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "experience_entries_date_idx" ON "experience_entries" USING btree ("user_id","entry_date");

-- Unique constraint: one entry per user per schwerpunktebene per time block per date
ALTER TABLE "experience_entries" ADD CONSTRAINT "experience_entries_user_schwerpunkt_time_date_unique" UNIQUE("user_id","schwerpunktebene_id","time_block","entry_date");
