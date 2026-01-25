CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'gemini');--> statement-breakpoint
CREATE TYPE "public"."ai_task_type" AS ENUM('chat', 'summarization', 'translation', 'content_generation', 'analysis', 'transcription');--> statement-breakpoint
CREATE TYPE "public"."context_type" AS ENUM('herkunft', 'ziel');--> statement-breakpoint
CREATE TYPE "public"."transcription_language" AS ENUM('de', 'en');--> statement-breakpoint
CREATE TYPE "public"."transcription_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."translation_language" AS ENUM('de', 'en');--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"default_provider" "ai_provider" DEFAULT 'anthropic' NOT NULL,
	"anthropic_api_key_encrypted" text,
	"gemini_api_key_encrypted" text,
	"model_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"provider" "ai_provider" NOT NULL,
	"model" varchar(100) NOT NULL,
	"task_type" "ai_task_type" NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_cents" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_generation_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"context_type" "context_type" NOT NULL,
	"language" "translation_language" NOT NULL,
	"name" varchar(255) NOT NULL,
	"prompt_template" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "context_generation_prompts_tenant_type_lang_unique" UNIQUE("tenant_id","context_type","language")
);
--> statement-breakpoint
CREATE TABLE "translation_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_lang" "translation_language" NOT NULL,
	"target_lang" "translation_language" NOT NULL,
	"name" varchar(255) NOT NULL,
	"prompt_template" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "translation_prompts_tenant_lang_unique" UNIQUE("tenant_id","source_lang","target_lang")
);
--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "voice_transcription" text;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "transcription_status" "transcription_status";--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "transcription_language" "transcription_language";--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "transcription_error" text;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_generation_prompts" ADD CONSTRAINT "context_generation_prompts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_prompts" ADD CONSTRAINT "translation_prompts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_settings_tenant_idx" ON "ai_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_tenant_idx" ON "ai_usage_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_user_idx" ON "ai_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_provider_idx" ON "ai_usage_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_task_type_idx" ON "ai_usage_logs" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_created_at_idx" ON "ai_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_logs_tenant_created_idx" ON "ai_usage_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "context_generation_prompts_tenant_idx" ON "context_generation_prompts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "context_generation_prompts_type_lang_idx" ON "context_generation_prompts" USING btree ("context_type","language");--> statement-breakpoint
CREATE INDEX "translation_prompts_tenant_idx" ON "translation_prompts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "translation_prompts_lang_pair_idx" ON "translation_prompts" USING btree ("source_lang","target_lang");