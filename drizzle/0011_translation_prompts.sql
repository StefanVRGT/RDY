-- Translation prompts table for customizable AI translation
-- Stores custom prompts per tenant per language pair

-- Create enum for translation languages
DO $$ BEGIN
  CREATE TYPE "translation_language" AS ENUM ('de', 'en');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create translation_prompts table
CREATE TABLE IF NOT EXISTS "translation_prompts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "source_lang" "translation_language" NOT NULL,
  "target_lang" "translation_language" NOT NULL,
  "name" varchar(255) NOT NULL,
  "prompt_template" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "translation_prompts_tenant_lang_unique" UNIQUE ("tenant_id", "source_lang", "target_lang")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "translation_prompts_tenant_idx" ON "translation_prompts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "translation_prompts_lang_pair_idx" ON "translation_prompts" ("source_lang", "target_lang");
