import puppeteer from 'puppeteer';
import { z } from 'zod';

const jobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  salary: z.string().optional(),
  remote: z.boolean(),
  postedDate: z.string(),
  url: z.string().url(),
  source: z.string()
});

type JobListing = z.infer<typeof jobSchema>;

class JobScraper {
  private browser: puppeteer.Browser | null = null;

  private async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  async scrapeLinkedIn(searchQuery: string): Promise<JobListing[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    const jobs: JobListing[] = [];

    try {
      // Encode search query for URL
      const encodedQuery = encodeURIComponent(searchQuery);
      await page.goto(`https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}&location=United%20States`);
      await page.waitForSelector('.jobs-search__results-list');

      const listings = await page.evaluate(() => {
        const items = document.querySelectorAll('.jobs-search__results-list > li');
        return Array.from(items, item => {
          const titleEl = item.querySelector('.job-card-list__title');
          const companyEl = item.querySelector('.job-card-container__company-name');
          const locationEl = item.querySelector('.job-card-container__metadata-item');
          const dateEl = item.querySelector('time');
          const linkEl = item.querySelector('a.job-card-list__title');

          return {
            title: titleEl?.textContent?.trim() || '',
            company: companyEl?.textContent?.trim() || '',
            location: locationEl?.textContent?.trim() || '',
            postedDate: dateEl?.dateTime || new Date().toISOString(),
            url: linkEl?.href || '',
            source: 'LinkedIn'
          };
        });
      });

      // Get detailed job info
      for (const listing of listings.slice(0, 5)) { // Limit to 5 jobs for now
        await page.goto(listing.url);
        await page.waitForSelector('.jobs-description');

        const details = await page.evaluate(() => {
          const descEl = document.querySelector('.jobs-description');
          const remoteEl = document.querySelector('.jobs-unified-top-card__workplace-type');
          const salaryEl = document.querySelector('.jobs-unified-top-card__salary-info');

          // Extract requirements from description
          const description = descEl?.textContent?.trim() || '';
          const requirementsList = description
            .split('\n')
            .filter(line => 
              line.trim().toLowerCase().startsWith('require') ||
              line.trim().toLowerCase().startsWith('qualification')
            )
            .map(line => line.trim());

          return {
            description,
            requirements: requirementsList,
            remote: remoteEl?.textContent?.toLowerCase().includes('remote') || false,
            salary: salaryEl?.textContent?.trim() || 'Not specified'
          };
        });

        jobs.push({
          ...listing,
          ...details
        });
      }
    } catch (error) {
      console.error('LinkedIn scraping error:', error);
    }

    return jobs;
  }

  async scrapeIndeed(searchQuery: string): Promise<JobListing[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    const jobs: JobListing[] = [];

    try {
      const encodedQuery = encodeURIComponent(searchQuery);
      await page.goto(`https://www.indeed.com/jobs?q=${encodedQuery}&l=United%20States`);
      await page.waitForSelector('.job_seen_beacon');

      const listings = await page.evaluate(() => {
        const items = document.querySelectorAll('.job_seen_beacon');
        return Array.from(items, item => {
          const titleEl = item.querySelector('.jobTitle');
          const companyEl = item.querySelector('.companyName');
          const locationEl = item.querySelector('.companyLocation');
          const dateEl = item.querySelector('.date');
          const linkEl = item.querySelector('a.jcs-JobTitle');

          return {
            title: titleEl?.textContent?.trim() || '',
            company: companyEl?.textContent?.trim() || '',
            location: locationEl?.textContent?.trim() || '',
            postedDate: dateEl ? new Date().toISOString() : new Date().toISOString(),
            url: linkEl?.href || '',
            source: 'Indeed'
          };
        });
      });

      // Get detailed job info
      for (const listing of listings.slice(0, 5)) {
        await page.goto(listing.url);
        await page.waitForSelector('#jobDescriptionText');

        const details = await page.evaluate(() => {
          const descEl = document.querySelector('#jobDescriptionText');
          const remoteEl = document.querySelector('.workplace-type');
          const salaryEl = document.querySelector('.salaryOnly');

          const description = descEl?.textContent?.trim() || '';
          const requirementsList = description
            .split('\n')
            .filter(line => 
              line.trim().toLowerCase().startsWith('require') ||
              line.trim().toLowerCase().startsWith('qualification')
            )
            .map(line => line.trim());

          return {
            description,
            requirements: requirementsList,
            remote: remoteEl?.textContent?.toLowerCase().includes('remote') || false,
            salary: salaryEl?.textContent?.trim() || 'Not specified'
          };
        });

        jobs.push({
          ...listing,
          ...details
        });
      }
    } catch (error) {
      console.error('Indeed scraping error:', error);
    }

    return jobs;
  }

  async searchJobs(searchQuery: string): Promise<JobListing[]> {
    try {
      const [linkedInJobs, indeedJobs] = await Promise.all([
        this.scrapeLinkedIn(searchQuery),
        this.scrapeIndeed(searchQuery)
      ]);

      const allJobs = [...linkedInJobs, ...indeedJobs];
      
      // Validate and clean the data
      const validJobs = allJobs.filter(job => {
        try {
          jobSchema.parse(job);
          return true;
        } catch (error) {
          console.error('Invalid job data:', error);
          return false;
        }
      });

      return validJobs;
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }
}

export const jobScraper = new JobScraper();
