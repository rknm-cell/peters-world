import { sql } from "drizzle-orm";
import { boolean, index, integer, json, pgTableCreator, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `tiny-world_${name}`);

export const worlds = createTable(
  "world",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    data: json("data").notNull(), // Serialized object positions/rotations
    screenshot: text("screenshot"), // URL to screenshot
    userId: text("user_id"),
    created: timestamp("created", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updated: timestamp("updated", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
      .$onUpdate(() => new Date()),
    views: integer("views").default(0).notNull(),
    featured: boolean("featured").default(false).notNull(),
  },
  (t) => [
    index("world_user_id_idx").on(t.userId),
    index("world_created_idx").on(t.created),
    index("world_featured_idx").on(t.featured),
  ],
);

export const shares = createTable(
  "share",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    worldId: text("world_id").notNull(),
    shortCode: text("short_code").unique().notNull(), // 6-char share code
    created: timestamp("created", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("share_world_id_idx").on(t.worldId),
    index("share_short_code_idx").on(t.shortCode),
  ],
);

export const users = createTable(
  "user",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    email: text("email").unique().notNull(),
    name: text("name"),
    created: timestamp("created", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => [
    index("user_email_idx").on(t.email),
  ],
);
