CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."measurement_type" AS ENUM('scale_1_10', 'yes_no', 'frequency', 'percentage', 'custom');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('superadmin', 'admin', 'mentor', 'mentee');--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'mentee' NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"invited_by" uuid NOT NULL,
	"accepted_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "schwerpunktebenen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"month_number" varchar(1) NOT NULL,
	"title_de" varchar(255) NOT NULL,
	"title_en" varchar(255),
	"description_de" text,
	"description_en" text,
	"herkunft_de" text,
	"herkunft_en" text,
	"ziel_de" text,
	"ziel_en" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"logo_url" text,
	"primary_color" varchar(7),
	"secondary_color" varchar(7),
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"role" "user_role" DEFAULT 'mentee' NOT NULL,
	"mentor_id" uuid,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"address" varchar(500),
	"plz" varchar(20),
	"city" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schwerpunktebene_id" uuid NOT NULL,
	"week_number" varchar(2) NOT NULL,
	"order_index" varchar(10) DEFAULT '0' NOT NULL,
	"title_de" varchar(255) NOT NULL,
	"title_en" varchar(255),
	"description_de" text,
	"description_en" text,
	"herkunft_de" text,
	"herkunft_en" text,
	"ziel_de" text,
	"ziel_en" text,
	"measurement_type" "measurement_type" DEFAULT 'scale_1_10',
	"measurement_question_de" text,
	"measurement_question_en" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schwerpunktebenen" ADD CONSTRAINT "schwerpunktebenen_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_schwerpunktebene_id_schwerpunktebenen_id_fk" FOREIGN KEY ("schwerpunktebene_id") REFERENCES "public"."schwerpunktebenen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitations_tenant_idx" ON "invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_status_idx" ON "invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schwerpunktebenen_tenant_idx" ON "schwerpunktebenen" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "schwerpunktebenen_month_idx" ON "schwerpunktebenen" USING btree ("month_number");--> statement-breakpoint
CREATE INDEX "weeks_schwerpunktebene_idx" ON "weeks" USING btree ("schwerpunktebene_id");--> statement-breakpoint
CREATE INDEX "weeks_order_idx" ON "weeks" USING btree ("schwerpunktebene_id","order_index");