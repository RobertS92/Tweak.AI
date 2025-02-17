import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface JobMatcherProps {
  resumeId: number;
}

interface JobMatch {
  matchScore: number;
  missingKeywords: string[];
  suggestedEdits: string[];
}

export default function JobMatcher({ resumeId }: JobMatcherProps) {
  const { toast } = useToast();
  const [jobDescription, setJobDescription] = useState("");

  const matchMutation = useMutation({
    mutationFn: async () => {
      const job = await apiRequest("POST", "/api/jobs", {
        title: "Job Match",
        description: jobDescription
      }).then(r => r.json());

      return apiRequest("POST", `/api/jobs/${job.id}/match/${resumeId}`).then(r => r.json());
    },
    onSuccess: (data: JobMatch) => {
      toast({
        title: "Match Analysis Complete",
        description: `Match score: ${data.matchScore}%`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const coverLetterMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/cover-letters", {
        resumeId,
        jobDescription
      }).then(r => r.json());
    },
    onSuccess: () => {
      toast({
        title: "Cover Letter Generated",
        description: "Your cover letter is ready to download",
      });
    },
  });

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Job Description Matcher</h3>

        <Textarea
          placeholder="Paste job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="h-32"
        />

        <div className="flex space-x-4">
          <Button 
            onClick={() => matchMutation.mutate()}
            disabled={!jobDescription || matchMutation.isPending}
          >
            Analyze Match
          </Button>

          <Button
            variant="outline"
            onClick={() => coverLetterMutation.mutate()}
            disabled={!jobDescription || coverLetterMutation.isPending}
          >
            Generate Cover Letter
          </Button>
        </div>

        {matchMutation.data && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Progress value={matchMutation.data.matchScore} className="flex-1" />
              <Badge variant={matchMutation.data.matchScore >= 80 ? "success" : "destructive"}>
                {matchMutation.data.matchScore}% Match
              </Badge>
            </div>

            {matchMutation.data.missingKeywords?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {matchMutation.data.missingKeywords.map((keyword: string, i: number) => (
                    <Badge key={i} variant="outline">{keyword}</Badge>
                  ))}
                </div>
              </div>
            )}

            {matchMutation.data.suggestedEdits?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Suggested Improvements</h4>
                <ul className="list-disc list-inside space-y-1">
                  {matchMutation.data.suggestedEdits.map((edit: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground">{edit}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}