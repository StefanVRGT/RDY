-- Tracking entries: daily 0-10 scale ratings per category
CREATE TABLE IF NOT EXISTS "tracking_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "entry_date" timestamp NOT NULL,
  "category" varchar(50) NOT NULL,
  "value" integer NOT NULL,
  "schwerpunktebene_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "tracking_entries" ADD CONSTRAINT "tracking_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "tracking_entries" ADD CONSTRAINT "tracking_entries_schwerpunktebene_id_fk" FOREIGN KEY ("schwerpunktebene_id") REFERENCES "public"."schwerpunktebenen"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "tracking_entries_user_idx" ON "tracking_entries" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "tracking_entries_date_idx" ON "tracking_entries" USING btree ("user_id", "entry_date");
ALTER TABLE "tracking_entries" ADD CONSTRAINT "tracking_entries_user_date_category_unique" UNIQUE("user_id", "entry_date", "category");

-- Reflection entries: end-of-module questionnaire
CREATE TABLE IF NOT EXISTS "reflection_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "schwerpunktebene_id" uuid NOT NULL,
  "responses" jsonb NOT NULL DEFAULT '[]',
  "submitted_at" timestamp,
  "mentor_feedback" text,
  "mentor_feedback_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "reflection_entries" ADD CONSTRAINT "reflection_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "reflection_entries" ADD CONSTRAINT "reflection_entries_schwerpunktebene_id_fk" FOREIGN KEY ("schwerpunktebene_id") REFERENCES "public"."schwerpunktebenen"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "reflection_entries_user_idx" ON "reflection_entries" USING btree ("user_id");
ALTER TABLE "reflection_entries" ADD CONSTRAINT "reflection_entries_user_schwerpunkt_unique" UNIQUE("user_id", "schwerpunktebene_id");
