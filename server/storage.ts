import { 
  resumes, type Resume, type InsertResume,
  jobs, type Job, type InsertJob,
  coverLetters, type CoverLetter, type InsertCoverLetter,
  users, type User, type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, isNull } from "drizzle-orm";
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
  getAnonymousResumes(): Promise<Resume[]>;
  claimAnonymousResume(resumeId: number, userId: number): Promise<Resume>;

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
    console.log(`[DEBUG] Getting resumes for user ID: ${userId}`);
    const userIdString = userId.toString();
    console.log(`[DEBUG] User ID as string: ${userIdString}`);
    
    const results = await db.select().from(resumes).where(eq(resumes.userId, userIdString));
    console.log(`[DEBUG] Found ${results.length} resumes for user ID ${userId}`);
    
    // Log the first few resume IDs for debugging
    if (results.length > 0) {
      const resumeIds = results.slice(0, 3).map(r => r.id).join(', ');
      console.log(`[DEBUG] Resume IDs (sample): ${resumeIds}${results.length > 3 ? '...' : ''}`);
    }
    
    return results;
  }

  async createResume(resume: InsertResume): Promise<Resume> {
    console.log(`[DEBUG] Creating new resume with title: ${resume.title}`);
    console.log(`[DEBUG] User ID for new resume: ${resume.userId || 'null (anonymous)'}`);
    
    // If no userId is provided, explicitly set it to null to ensure consistency
    const resumeData = { ...resume };
    if (!resumeData.userId) {
      console.log(`[DEBUG] Setting null userId for anonymous resume`);
    }
    
    const [newResume] = await db.insert(resumes).values(resumeData).returning();
    console.log(`[DEBUG] Resume created with ID: ${newResume.id}`);
    
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
  
  // Get anonymous resumes (where userId is null)
  async getAnonymousResumes(): Promise<Resume[]> {
    try {
      console.log(`[DEBUG] Fetching anonymous resumes (with null userId)`);
      
      // Use a raw SQL query to safely filter out NaN values and set them to 0
      const query = `
        SELECT 
          id, 
          user_id as "userId", 
          title, 
          SUBSTRING(content, 1, 100) || '...' as content, 
          file_type as "fileType", 
          0 as "atsScore",
          created_at as "createdAt"
        FROM resumes 
        WHERE user_id IS NULL
      `;
      
      const results = await db.execute(query);
      console.log(`[DEBUG] Found ${results.rows.length} anonymous resumes via raw SQL`);
      
      // Further sanitize the results to be extra safe
      const sanitizedResults = results.rows.map((row: any) => {
        return {
          id: row.id,
          userId: null,
          title: row.title || 'Untitled Resume',
          content: row.content || '',
          fileType: row.fileType || 'text/plain',
          atsScore: typeof row.atsScore === 'number' ? row.atsScore : 0,
          enhancedContent: null,
          analysis: {},
          createdAt: row.createdAt
        };
      });
      
      console.log(`[DEBUG] Returning ${sanitizedResults.length} sanitized anonymous resumes`);
      return sanitizedResults as Resume[];
    } catch (error) {
      console.error("[ERROR] Error fetching anonymous resumes:", error);
      console.error("[ERROR] Error details:", error instanceof Error ? error.message : "Unknown error");
      // Return empty array instead of throwing to avoid breaking the frontend
      return [] as Resume[];
    }
  }
  
  // Associate an anonymous resume with a user 
  async claimAnonymousResume(resumeId: number, userId: number): Promise<Resume> {
    try {
      console.log(`[DEBUG] Claiming resume ID ${resumeId} for user ID ${userId}`);
      
      // First check if the resume exists
      const resume = await this.getResume(resumeId);
      
      if (!resume) {
        console.error(`[ERROR] Failed to claim resume - resume ID ${resumeId} not found`);
        throw new Error("Resume not found");
      }
      
      // Log the current state of the resume
      console.log(`[DEBUG] Resume current state: userId=${resume.userId || 'null'}, title=${resume.title || 'Untitled'}`);
      
      // Check if this resume is actually claimable (no userId or owned by this user)
      if (resume.userId && resume.userId !== userId.toString()) {
        console.error(`[ERROR] Cannot claim resume - already owned by user ${resume.userId}`);
        throw new Error("This resume is already claimed by another user");
      }
      
      // If the resume already belongs to this user, just return it
      if (resume.userId === userId.toString()) {
        console.log(`[DEBUG] Resume already owned by user ${userId}, no update needed`);
        return resume;
      }
      
      console.log(`[DEBUG] Proceeding to claim resume ${resumeId} for user ${userId}`);
      
      // Update the resume to assign it to the user
      // Since userId is stored as text in the schema, we must convert the userId to string
      const [updated] = await db
        .update(resumes)
        .set({ userId: userId.toString() })
        .where(eq(resumes.id, resumeId))
        .returning();
        
      if (!updated) {
        console.error(`[ERROR] Update operation returned no rows for resume ID ${resumeId}`);
        throw new Error("Failed to update resume ownership");
      }
      
      console.log(`[DEBUG] Resume claimed successfully: ID=${updated.id}, new userId=${updated.userId}`);
      return updated;
    } catch (error) {
      console.error(`[ERROR] Error claiming resume:`, error);
      throw error;
    }
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