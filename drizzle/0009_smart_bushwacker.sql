CREATE TYPE "public"."ai_prompt_category" AS ENUM('translation', 'context_generation', 'summarization', 'chat', 'analysis', 'transcription', 'custom');--> statement-breakpoint
CREATE TABLE "ai_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prompt_key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" "ai_prompt_category" NOT NULL,
	"prompt_template" text NOT NULL,
	"system_message" text,
	"default_prompt_template" text NOT NULL,
	"default_system_message" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_prompts_tenant_key_unique" UNIQUE("tenant_id","prompt_key")
);
--> statement-breakpoint
ALTER TABLE "ai_prompts" ADD CONSTRAINT "ai_prompts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_prompts_tenant_idx" ON "ai_prompts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_prompts_category_idx" ON "ai_prompts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ai_prompts_key_idx" ON "ai_prompts" USING btree ("prompt_key");