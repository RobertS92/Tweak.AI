import { 
  Resume, InsertResume,
  Job, InsertJob,
  CoverLetter, InsertCoverLetter
} from "@shared/schema";

export interface IStorage {
  // Resume operations
  getResume(id: number): Promise<Resume | undefined>;
  getUserResumes(userId: string): Promise<Resume[]>;
  createResume(resume: InsertResume): Promise<Resume>;
  updateResume(id: number, resume: Partial<Resume>): Promise<Resume>;
  deleteResume(id: number): Promise<void>;

  // Job operations
  getJob(id: number): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<Job>): Promise<Job>;

  // Cover letter operations
  getCoverLetter(id: number): Promise<CoverLetter | undefined>;
  createCoverLetter(coverLetter: InsertCoverLetter): Promise<CoverLetter>;
}

export class MemStorage implements IStorage {
  private resumes: Map<number, Resume>;
  private jobs: Map<number, Job>;
  private coverLetters: Map<number, CoverLetter>;
  private currentResumeId: number;
  private currentJobId: number;
  private currentCoverLetterId: number;

  constructor() {
    this.resumes = new Map();
    this.jobs = new Map();
    this.coverLetters = new Map();
    this.currentResumeId = 1;
    this.currentJobId = 1;
    this.currentCoverLetterId = 1;
  }

  async getResume(id: number): Promise<Resume | undefined> {
    return this.resumes.get(id);
  }

  async getUserResumes(userId: string): Promise<Resume[]> {
    return Array.from(this.resumes.values()).filter(
      (resume) => resume.userId === userId
    );
  }

  async createResume(resume: InsertResume): Promise<Resume> {
    const id = this.currentResumeId++;
    const newResume: Resume = {
      ...resume,
      id,
      atsScore: null,
      enhancedContent: null,
      analysis: null,
      createdAt: new Date(),
    };
    this.resumes.set(id, newResume);
    return newResume;
  }

  async updateResume(id: number, resume: Partial<Resume>): Promise<Resume> {
    const existing = await this.getResume(id);
    if (!existing) {
      throw new Error("Resume not found");
    }
    const updated = { ...existing, ...resume };
    this.resumes.set(id, updated);
    return updated;
  }

  async deleteResume(id: number): Promise<void> {
    this.resumes.delete(id);
  }

  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async createJob(job: InsertJob): Promise<Job> {
    const id = this.currentJobId++;
    const newJob: Job = {
      ...job,
      id,
      matchScore: null,
      analysis: null,
      createdAt: new Date(),
      company: job.company || null, // Ensure company is never undefined
    };
    this.jobs.set(id, newJob);
    return newJob;
  }

  async updateJob(id: number, job: Partial<Job>): Promise<Job> {
    const existing = await this.getJob(id);
    if (!existing) {
      throw new Error("Job not found");
    }
    const updated = { ...existing, ...job };
    this.jobs.set(id, updated);
    return updated;
  }

  async getCoverLetter(id: number): Promise<CoverLetter | undefined> {
    return this.coverLetters.get(id);
  }

  async createCoverLetter(coverLetter: InsertCoverLetter): Promise<CoverLetter> {
    const id = this.currentCoverLetterId++;
    const newCoverLetter: CoverLetter = {
      ...coverLetter,
      id,
      createdAt: new Date(),
    };
    this.coverLetters.set(id, newCoverLetter);
    return newCoverLetter;
  }
}

export const storage = new MemStorage();