import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evaluationsTable = sqliteTable("evaluations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  batchId: integer("batch_id").notNull(),
  studentId: integer("student_id").notNull(),
  evaluatorId: integer("evaluator_id").notNull(),
  evaluatorType: text("evaluator_type").notNull(),
  marks: real("marks").notNull(),
});

export const insertEvaluationSchema = createInsertSchema(evaluationsTable).omit({ id: true });
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluationsTable.$inferSelect;
