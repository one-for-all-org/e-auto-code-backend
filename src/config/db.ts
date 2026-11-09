import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env";
import * as schema from "./schema";

const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on("connect", () => {
  console.info("[DB] Connexion à la base de données établie.");
});

pool.on("error", (error) => {
  console.error("[DB] Erreur de connexion à la base de données:", error.message);
});

export const db = drizzle(pool, { schema });

export async function closeDb() {
  await pool.end();
}
