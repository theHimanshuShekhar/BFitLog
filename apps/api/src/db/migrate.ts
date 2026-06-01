import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client.js";

const db = createDb();
await migrate(db, { migrationsFolder: "./drizzle" });
