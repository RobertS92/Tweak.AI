import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Briefcase, BarChart2, FileText, ExternalLink } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface JobListing {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  matchScore: number;
  url: string;
  optimizedResume?: string;
}

export default function JobSearchAgent() {
  const { toast } = useToast();
  const [jobKeywords, setJobKeywords] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const { data: jobListings, refetch: refetchJobs } = useQuery<JobListing[]>({
    queryKey: ['/api/jobs/search'],
    enabled: false,
  });

  const searchMutation = useMutation({
    mutationFn: async (data: { keywords: string, resumeId?: number }) => {
      return apiRequest("POST", "/api/jobs/search", data).then(r => r.json());
    },
    onSuccess: () => {
      refetchJobs();
      toast({
        title: "Job Search Complete",
        description: "Found relevant positions based on your profile"
      });
      setIsSearching(false);
    }
  });

  const optimizeMutation = useMutation({
    mutationFn: async (data: { jobId: number, resumeId: number }) => {
      return apiRequest("POST", `/api/jobs/${data.jobId}/optimize/${data.resumeId}`).then(r => r.json());
    },
    onSuccess: () => {
      refetchJobs();
      toast({
        title: "Resume Optimized",
        description: "Your resume has been tailored for this position"
      });
    }
  });

  const handleSearch = () => {
    setIsSearching(true);
    searchMutation.mutate({ keywords: jobKeywords });
  };

  return (
    <Card className="h-full">
      <CardHeader className="py-3 px-6 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-500" />
          Job Search Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-col h-[calc(100%-57px)]">
        <div className="p-4 border-b flex gap-3">
          <Input
            value={jobKeywords}
            onChange={(e) => setJobKeywords(e.target.value)}
            placeholder="Enter job titles, skills, or keywords..."
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !jobKeywords.trim()}
            className="min-w-[100px]"
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {jobListings?.map((job) => (
              <Card key={job.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <p className="text-sm text-gray-500">{job.company} • {job.location}</p>
                  </div>
                  <Badge 
                    variant={job.matchScore >= 80 ? "default" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    <BarChart2 className="w-3 h-3" />
                    {job.matchScore}% Match
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {job.description}
                </p>
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={() => optimizeMutation.mutate({ jobId: job.id, resumeId: 1 })}
                    >
                      <FileText className="w-4 h-4" />
                      Optimize Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        <ExternalLink className="w-4 h-4" />
                        Apply
                      </a>
                    </Button>
                  </div>
                  
                  {job.optimizedResume && (
                    <Badge variant="outline" className="text-green-600">
                      Resume Optimized
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
            
            {jobListings?.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No job listings found. Try adjusting your search keywords.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
