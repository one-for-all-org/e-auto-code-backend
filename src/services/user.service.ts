import { db } from "../config/db";
import { users } from "../config/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../utils/AppError";
import bcrypt from "bcryptjs";

export type UserRole = "USER" | "ADMIN";
export type RoadRole = "DRIVER" | "PASSENGER" | "PEDESTRIAN" | "CITIZEN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roadRole: RoadRole;
  isOk: boolean;
  isBlocked: boolean;
  createdAt: number;
};

export type UserWithHash = User & { passwordHash: string };
type UserRow = typeof users.$inferSelect;

export async function findByEmail(email: string): Promise<UserWithHash | undefined> {
  const [row] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  return row ? toUserWithHash(row) : undefined;
}

export async function findById(id: string): Promise<User> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) {
    throw new AppError("Utilisateur introuvable", 404);
  }
  return toUser(row);
}

export async function create(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  roadRole?: RoadRole;
  isOk?: boolean;
}): Promise<User> {
  const email = data.email.trim().toLowerCase();
  if (await findByEmail(email)) {
    throw new AppError("Email déjà utilisé", 409);
  }
  let user: UserRow;
  try {
    [user] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        name: data.name.trim(),
        email,
        passwordHash: data.passwordHash,
        role: data.role ?? "USER",
        roadRole: data.roadRole ?? "CITIZEN",
        isOk: data.isOk ?? true,
        isBlocked: false,
        createdAt: Date.now(),
      })
      .returning();
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new AppError("Email déjà utilisé", 409);
    }
    throw error;
  }
  return toUser(user);
}

export async function update(
  id: string,
  data: { name?: string; password?: string; role?: UserRole; roadRole?: RoadRole; isOk?: boolean; isBlocked?: boolean }
): Promise<User> {
  const updates: Partial<typeof users.$inferInsert> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.password !== undefined) updates.passwordHash = bcrypt.hashSync(data.password, 12);
  if (data.role !== undefined) updates.role = data.role;
  if (data.roadRole !== undefined) updates.roadRole = data.roadRole;
  if (data.isOk !== undefined) updates.isOk = data.isOk;
  if (data.isBlocked !== undefined) updates.isBlocked = data.isBlocked;

  if (Object.keys(updates).length === 0) {
    throw new AppError("Aucune modification", 400);
  }

  const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
  if (!updated) {
    throw new AppError("Utilisateur introuvable", 404);
  }
  return toUser(updated);
}

export async function remove(id: string): Promise<void> {
  const [removed] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  if (!removed) {
    throw new AppError("Utilisateur introuvable", 404);
  }
}

export async function list(): Promise<User[]> {
  const rows = await db.select().from(users);
  return rows.map(toUser);
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    roadRole: row.roadRole,
    isOk: row.isOk,
    isBlocked: row.isBlocked,
    createdAt: row.createdAt,
  };
}

function toUserWithHash(row: UserRow): UserWithHash {
  return { ...toUser(row), passwordHash: row.passwordHash };
}
