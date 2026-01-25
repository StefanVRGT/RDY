-- Migration: Add AI settings and usage logging tables
-- This migration adds support for AI provider configuration and usage tracking

-- Create enum for AI providers
CREATE TYPE "ai_provider" AS ENUM ('anthropic', 'gemini');

-- Create enum for AI task types
CREATE TYPE "ai_task_type" AS ENUM ('chat', 'summarization', 'translation', 'content_generation', 'analysis');

-- Create ai_settings table
CREATE TABLE IF NOT EXISTS "ai_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "default_provider" "ai_provider" DEFAULT 'anthropic' NOT NULL,
  "anthropic_api_key_encrypted" text,
  "gemini_api_key_encrypted" text,
  "model_config" jsonb DEFAULT '{}' NOT NULL,
  "ai_enabled" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ai_settings_tenant_id_unique" UNIQUE("tenant_id")
);

-- Create ai_usage_logs table
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
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

-- Create indexes for ai_settings
CREATE INDEX IF NOT EXISTS "ai_settings_tenant_idx" ON "ai_settings" ("tenant_id");

-- Create indexes for ai_usage_logs
CREATE INDEX IF NOT EXISTS "ai_usage_logs_tenant_idx" ON "ai_usage_logs" ("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_user_idx" ON "ai_usage_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_provider_idx" ON "ai_usage_logs" ("provider");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_task_type_idx" ON "ai_usage_logs" ("task_type");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_created_at_idx" ON "ai_usage_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_logs_tenant_created_idx" ON "ai_usage_logs" ("tenant_id", "created_at");
