import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";

export const leadNotesTable = pgTable("lead_notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leadsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LeadNote = typeof leadNotesTable.$inferSelect;
