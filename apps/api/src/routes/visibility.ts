import { and, eq, or } from "drizzle-orm";
import { createDb } from "../db/client.js";
import { partnerLinks } from "../db/schema.js";

const db = createDb(
	process.env.DATABASE_URL ??
		"postgres://bfitlog:bfitlog@localhost:5432/bfitlog",
);

export async function canReadUserData(
	currentUserId: string,
	targetUserId: string,
) {
	if (currentUserId === targetUserId) return true;
	const [link] = await db
		.select()
		.from(partnerLinks)
		.where(
			or(
				and(
					eq(partnerLinks.userAId, currentUserId),
					eq(partnerLinks.userBId, targetUserId),
				),
				and(
					eq(partnerLinks.userAId, targetUserId),
					eq(partnerLinks.userBId, currentUserId),
				),
			),
		)
		.limit(1);
	return Boolean(link);
}
