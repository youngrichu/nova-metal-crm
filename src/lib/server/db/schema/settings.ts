import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";

export const systemSettings = pgTable("system_settings", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id)
});
