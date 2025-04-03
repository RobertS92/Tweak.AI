import { 
  resumes, type Resume, type InsertResume,
  jobs, type Job, type InsertJob,
  coverLetters, type CoverLetter, type InsertCoverLetter,
  users, type User, type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Resume operations
  getResume(id: number): Promise<Resume | undefined>;
  getUserResumes(userId: number): Promise<Resume[]>;
  createResume(resume: InsertResume): Promise<Resume>;
  updateResume(id: number, resume: Partial<Resume>): Promise<Resume>;
  deleteResume(id: number): Promise<void>;

  // Job operations
  getJob(id: number): Promise<Job | undefined>;
  getUserJobs(userId: number): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<Job>): Promise<Job>;

  // Cover letter operations
  getCoverLetter(id: number): Promise<CoverLetter | undefined>;
  getUserCoverLetters(userId: number): Promise<CoverLetter[]>;
  createCoverLetter(coverLetter: InsertCoverLetter): Promise<CoverLetter>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Resume operations
  async getResume(id: number): Promise<Resume | undefined> {
    const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));
    return resume;
  }

  async getUserResumes(userId: number): Promise<Resume[]> {
    // Convert userId to string to match schema
    return db.select().from(resumes).where(eq(resumes.userId, userId.toString()));
  }

  async createResume(resume: InsertResume): Promise<Resume> {
    const [newResume] = await db.insert(resumes).values(resume).returning();
    return newResume;
  }

  async updateResume(id: number, resume: Partial<Resume>): Promise<Resume> {
    const [updated] = await db
      .update(resumes)
      .set(resume)
      .where(eq(resumes.id, id))
      .returning();

    if (!updated) {
      throw new Error("Resume not found");
    }

    return updated;
  }

  async deleteResume(id: number): Promise<void> {
    await db.delete(resumes).where(eq(resumes.id, id));
  }

  // Job operations
  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }
  
  async getUserJobs(userId: number): Promise<Job[]> {
    // Convert userId to string to match schema
    return db.select().from(jobs).where(eq(jobs.userId, userId.toString()));
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, job: Partial<Job>): Promise<Job> {
    const [updated] = await db
      .update(jobs)
      .set(job)
      .where(eq(jobs.id, id))
      .returning();

    if (!updated) {
      throw new Error("Job not found");
    }

    return updated;
  }

  // Cover letter operations
  async getCoverLetter(id: number): Promise<CoverLetter | undefined> {
    const [coverLetter] = await db
      .select()
      .from(coverLetters)
      .where(eq(coverLetters.id, id));
    return coverLetter;
  }
  
  async getUserCoverLetters(userId: number): Promise<CoverLetter[]> {
    // Convert userId to string to match schema
    return db.select().from(coverLetters).where(eq(coverLetters.userId, userId.toString()));
  }

  async createCoverLetter(coverLetter: InsertCoverLetter): Promise<CoverLetter> {
    const [newCoverLetter] = await db
      .insert(coverLetters)
      .values(coverLetter)
      .returning();
    return newCoverLetter;
  }
}

export const storage = new DatabaseStorage();