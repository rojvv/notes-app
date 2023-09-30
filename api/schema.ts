import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().unique().notNull().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  text: text("text").notNull(),
});
