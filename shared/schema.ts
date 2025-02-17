import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  fileType: text("file_type").notNull(),
  atsScore: integer("ats_score"),
  enhancedContent: text("enhanced_content"),
  analysis: jsonb("analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  company: text("company"),
  matchScore: integer("match_score"),
  analysis: jsonb("analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coverLetters = pgTable("cover_letters", {
  id: serial("id").primaryKey(),
  resumeId: integer("resume_id").notNull(),
  jobId: integer("job_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  atsScore: true,
  enhancedContent: true,
  analysis: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  matchScore: true,
  analysis: true,
  createdAt: true,
});

export const insertCoverLetterSchema = createInsertSchema(coverLetters).omit({
  id: true,
  createdAt: true,
});

export type Resume = typeof resumes.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type CoverLetter = typeof coverLetters.$inferSelect;
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertCoverLetter = z.infer<typeof insertCoverLetterSchema>;
