import bcrypt from "bcryptjs";
import { closeDb, db } from "../config/db";
import { env } from "../config/env";
import { users } from "../config/schema";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("Définissez ADMIN_EMAIL et ADMIN_PASSWORD avant de lancer le seeder.");
  }

  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    await db
      .update(users)
      .set({ role: "ADMIN", isOk: true, isBlocked: false })
      .where(eq(users.id, existing.id));
    console.log(`Le compte ${email} possède maintenant le rôle ADMIN.`);
    return;
  }

  await db.insert(users).values({
    id: crypto.randomUUID(),
    name: env.ADMIN_NAME,
    email,
    passwordHash: bcrypt.hashSync(env.ADMIN_PASSWORD, 12),
    role: "ADMIN",
    isOk: true,
    isBlocked: false,
    createdAt: Date.now(),
  });
  console.log(`Compte administrateur créé pour ${email}.`);
}

void seedAdmin()
  .catch((error) => {
    console.error("Échec du seeder administrateur:", error);
    process.exitCode = 1;
  })
  .finally(closeDb);
