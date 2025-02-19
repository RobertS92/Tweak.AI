import JobSearchAgent from "@/components/job-search-agent";

export default function JobSearch() {
  return (
    <div className="container py-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI Job Search Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Find relevant job opportunities and optimize your resume for each position.
        </p>
      </div>

      <div className="h-[calc(100vh-12rem)]">
        <JobSearchAgent />
      </div>
    </div>
  );
}
