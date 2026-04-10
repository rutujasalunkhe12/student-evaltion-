import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const batchesTable = sqliteTable("batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  projectTitle: text("project_title").notNull(),
  projectDescription: text("project_description").notNull(),
  academicYear: text("academic_year").notNull().default("2024-25"),
  guideId: integer("guide_id").notNull(),
  isCsvAdded: integer("is_csv_added", { mode: "boolean" }).notNull().default(false),
});

export const insertBatchSchema = createInsertSchema(batchesTable).omit({ id: true });
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = typeof batchesTable.$inferSelect;
