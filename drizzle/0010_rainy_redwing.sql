CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_id" uuid NOT NULL,
	"measurement_type" "measurement_type" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "measurements_user_idx" ON "measurements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "measurements_week_idx" ON "measurements" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "measurements_user_week_idx" ON "measurements" USING btree ("user_id","week_id");--> statement-breakpoint
CREATE INDEX "measurements_created_at_idx" ON "measurements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "measurements_type_idx" ON "measurements" USING btree ("measurement_type");