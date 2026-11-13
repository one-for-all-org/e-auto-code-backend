import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamp = (name: string) => bigint(name, { mode: "number" }).notNull();

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["USER", "ADMIN"] }).notNull().default("USER"),
    roadRole: text("road_role", { enum: ["DRIVER", "PASSENGER", "PEDESTRIAN", "CITIZEN"] })
      .notNull()
      .default("CITIZEN"),
    isOk: boolean("is_ok").notNull().default(false),
    isBlocked: boolean("is_blocked").notNull().default(false),
    createdAt: timestamp("created_at"),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Nouvelle conversation"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [index("idx_conversations_user_updated").on(table.userId, table.updatedAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    attachmentName: text("attachment_name"),
    createdAt: timestamp("created_at"),
  },
  (table) => [index("idx_messages_conv_created").on(table.conversationId, table.createdAt)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at"),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at"),
  },
  (table) => [index("idx_otp_email").on(table.email)],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at"),
  },
  (table) => [uniqueIndex("refresh_tokens_token_unique").on(table.token)],
);

export const roadLessons = pgTable(
  "road_lessons",
  {
    id: text("id").primaryKey(),
    originalName: text("original_name").notNull(),
    storageName: text("storage_name").notNull(),
    resourceUrl: text("resource_url"),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    extractedText: text("extracted_text").notNull(),
    uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("road_lessons_storage_name_unique").on(table.storageName),
    index("idx_road_lessons_created").on(table.createdAt),
  ],
);

export const roadSources = pgTable(
  "road_sources",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    extractedText: text("extracted_text").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    addedBy: text("added_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("road_sources_url_unique").on(table.url),
    index("idx_road_sources_active").on(table.isActive),
  ],
);
