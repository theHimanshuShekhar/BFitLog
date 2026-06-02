import pg from "pg";

const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://bfitlog:bfitlog@localhost:5432/bfitlog";

export async function truncateAppTables() {
	const client = new pg.Client({ connectionString: databaseUrl });
	await client.connect();
	try {
		await client.query(
			'TRUNCATE TABLE "workout_checklist_logs", "set_logs", "exercise_logs", "workout_logs", "planned_exercise_substitutes", "planned_exercises", "training_day_checklist_items", "training_days", "user_training_plans", "training_plan_templates", "exercise_media", "exercises", "partner_links", "body_weight_logs", "body_weight_goals", "workout_frequency_goals", "reminder_settings", "notification_devices", "account", "session", "verification", "user" CASCADE',
		);
	} finally {
		await client.end();
	}
}
