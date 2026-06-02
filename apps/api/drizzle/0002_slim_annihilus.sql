CREATE TYPE "public"."exercise_log_status" AS ENUM('planned', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."workout_log_status" AS ENUM('draft', 'completed', 'discarded');--> statement-breakpoint
CREATE TABLE "exercise_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workout_log_id" uuid NOT NULL,
	"planned_exercise_id" text,
	"planned_exercise_name" text NOT NULL,
	"planned_exercise_target" text NOT NULL,
	"original_exercise_id" text,
	"performed_exercise_id" text,
	"status" "exercise_log_status" DEFAULT 'planned' NOT NULL,
	"good_form" boolean,
	"note" text,
	"skip_reason" text,
	"substitution_note" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"exercise_log_id" uuid NOT NULL,
	"set_index" integer NOT NULL,
	"weight_kg" text,
	"reps" integer,
	"duration_seconds" integer,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_checklist_logs" (
	"workout_log_id" uuid NOT NULL,
	"checklist_item_id" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workout_checklist_logs_workout_log_id_checklist_item_id_pk" PRIMARY KEY("workout_log_id","checklist_item_id")
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_training_plan_id" text,
	"training_day_id" text NOT NULL,
	"status" "workout_log_status" DEFAULT 'draft' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_workout_log_id_workout_logs_id_fk" FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_planned_exercise_id_planned_exercises_id_fk" FOREIGN KEY ("planned_exercise_id") REFERENCES "public"."planned_exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_original_exercise_id_exercises_id_fk" FOREIGN KEY ("original_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_performed_exercise_id_exercises_id_fk" FOREIGN KEY ("performed_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_logs" ADD CONSTRAINT "set_logs_exercise_log_id_exercise_logs_id_fk" FOREIGN KEY ("exercise_log_id") REFERENCES "public"."exercise_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_checklist_logs" ADD CONSTRAINT "workout_checklist_logs_workout_log_id_workout_logs_id_fk" FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_checklist_logs" ADD CONSTRAINT "workout_checklist_logs_checklist_item_id_training_day_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."training_day_checklist_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_training_plan_id_user_training_plans_id_fk" FOREIGN KEY ("user_training_plan_id") REFERENCES "public"."user_training_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_training_day_id_training_days_id_fk" FOREIGN KEY ("training_day_id") REFERENCES "public"."training_days"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_logs_workout_idx" ON "exercise_logs" USING btree ("workout_log_id");--> statement-breakpoint
CREATE INDEX "set_logs_exercise_idx" ON "set_logs" USING btree ("exercise_log_id");--> statement-breakpoint
CREATE INDEX "workout_logs_user_started_idx" ON "workout_logs" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "workout_logs_user_status_idx" ON "workout_logs" USING btree ("user_id","status");