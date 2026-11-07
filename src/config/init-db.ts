import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolve } from "node:path";
import { db } from "./db";

export async function initDb() {
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
}
