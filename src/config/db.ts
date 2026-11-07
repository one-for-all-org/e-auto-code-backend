import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";
import * as schema from "./schema";

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export async function closeDb() {
  await pool.end();
}
