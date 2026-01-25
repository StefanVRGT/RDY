CREATE TABLE "mentor_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"day_of_week" integer,
	"recurring_start_time" varchar(5),
	"recurring_end_time" varchar(5),
	"valid_from" timestamp,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mentor_availability" ADD CONSTRAINT "mentor_availability_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_availability" ADD CONSTRAINT "mentor_availability_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mentor_availability_mentor_idx" ON "mentor_availability" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "mentor_availability_tenant_idx" ON "mentor_availability" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mentor_availability_time_idx" ON "mentor_availability" USING btree ("start_time","end_time");--> statement-breakpoint
CREATE INDEX "mentor_availability_recurring_idx" ON "mentor_availability" USING btree ("is_recurring","day_of_week");