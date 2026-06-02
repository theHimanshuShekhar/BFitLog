CREATE TABLE "workout_frequency_goals" (
	"user_id" text PRIMARY KEY NOT NULL,
	"target_workouts_per_week" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_frequency_goals" ADD CONSTRAINT "workout_frequency_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;