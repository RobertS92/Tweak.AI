import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Briefcase, BarChart2, FileText, ExternalLink, Plus, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface JobListing {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  matchScore: number;
  skillMatch: {
    matched: string[];
    missing: string[];
  };
  analysis: {
    skillMatching: {
      score: number;
      matchedSkills: string[];
      missingSkills: string[];
      relatedSkills: string[];
    };
    experienceRelevance: {
      score: number;
      yearsMatch: boolean;
      roleAlignmentScore: number;
      industrySimilarity: number;
      careerProgressionMatch: boolean;
    };
    educationalBackground: {
      score: number;
      degreeMatch: boolean;
      fieldRelevance: number;
      certificationsValue: number;
    };
    technicalProficiency: {
      score: number;
      toolsMatch: string[];
      technicalSkillsGap: string[];
      proficiencyLevel: string;
    };
    softSkillsFit: {
      score: number;
      culturalAlignment: number;
      communicationScore: number;
      leadershipMatch: boolean;
    };
  };
  salary: string;
  remote: boolean;
  postedDate: string;
  url: string;
  optimizedResume?: string;
}

export default function JobSearchAgent() {
  const { toast } = useToast();
  const [jobKeywords, setJobKeywords] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  // Fetch the latest resume
  const { data: latestResume } = useQuery({
    queryKey: ['/api/resumes'],
    onSuccess: (resumes) => {
      if (resumes && resumes.length > 0) {
        extractSkillsFromResume(resumes[0].content);
      }
    }
  });

  const extractSkillsFromResume = async (content: string) => {
    try {
      const response = await apiRequest("POST", "/api/resumes/analyze", {
        content,
        sectionType: "skills"
      });
      const analysis = await response.json();
      if (analysis.skills) {
        setExtractedSkills(analysis.skills);
        setSelectedSkills(analysis.skills.slice(0, 5));
      }
    } catch (error) {
      console.error("Failed to extract skills:", error);
    }
  };

  const { data: jobListings, refetch: refetchJobs } = useQuery<JobListing[]>({
    queryKey: ['/api/jobs/search'],
    enabled: false,
  });

  const searchMutation = useMutation({
    mutationFn: async (data: { keywords: string, resumeId?: number }) => {
      return apiRequest("POST", "/api/jobs/search", {
        ...data,
        resumeId: latestResume?.[0]?.id
      }).then(r => r.json());
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
      if (!latestResume?.[0]?.id) {
        throw new Error("No resume found");
      }
      return apiRequest("POST", `/api/jobs/${data.jobId}/optimize/${latestResume[0].id}`).then(r => r.json());
    },
    onSuccess: () => {
      refetchJobs();
      toast({
        title: "Resume Optimized",
        description: "Your resume has been tailored for this position"
      });
    }
  });

  const addSkill = () => {
    if (newSkill && selectedSkills.length < 20) {
      setSelectedSkills(prev => [...new Set([...prev, newSkill])]);
      setNewSkill("");
    } else if (selectedSkills.length >= 20) {
      toast({
        title: "Maximum Skills Reached",
        description: "You can only add up to 20 skills",
        variant: "destructive"
      });
    }
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSearch = () => {
    if (!latestResume?.[0]?.id) {
      toast({
        title: "No Resume Found",
        description: "Please upload a resume first to enable job search",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    searchMutation.mutate({ 
      keywords: [...selectedSkills, jobKeywords].filter(Boolean).join(", "),
      resumeId: latestResume[0].id
    });
  };

  const renderMatchAnalysis = (job: JobListing) => {
    const categories = [
      {
        title: "Skill Match",
        score: job.analysis.skillMatching.score,
        weight: "30%",
        details: (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1">
              {job.analysis.skillMatching.matchedSkills.map((skill, i) => (
                <Badge key={i} variant="success" className="bg-green-100 text-green-800">✓ {skill}</Badge>
              ))}
            </div>
            {job.analysis.skillMatching.missingSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {job.analysis.skillMatching.missingSkills.map((skill, i) => (
                  <Badge key={i} variant="destructive" className="bg-red-100 text-red-800">! {skill}</Badge>
                ))}
              </div>
            )}
          </div>
        )
      },
      {
        title: "Experience",
        score: job.analysis.experienceRelevance.score,
        weight: "25%",
        details: (
          <div className="text-sm">
            <p>Role Alignment: {(job.analysis.experienceRelevance.roleAlignmentScore * 100).toFixed(0)}%</p>
            <p>Industry Match: {(job.analysis.experienceRelevance.industrySimilarity * 100).toFixed(0)}%</p>
          </div>
        )
      },
      {
        title: "Education",
        score: job.analysis.educationalBackground.score,
        weight: "15%",
        details: (
          <div className="text-sm">
            <p>Field Relevance: {(job.analysis.educationalBackground.fieldRelevance * 100).toFixed(0)}%</p>
            <p>Certifications Value: {(job.analysis.educationalBackground.certificationsValue * 100).toFixed(0)}%</p>
          </div>
        )
      },
      {
        title: "Technical",
        score: job.analysis.technicalProficiency.score,
        weight: "20%",
        details: (
          <div className="space-y-1">
            <p className="text-sm">Level: {job.analysis.technicalProficiency.proficiencyLevel}</p>
            <div className="flex flex-wrap gap-1">
              {job.analysis.technicalProficiency.toolsMatch.map((tool, i) => (
                <Badge key={i} variant="secondary">{tool}</Badge>
              ))}
            </div>
          </div>
        )
      },
      {
        title: "Soft Skills",
        score: job.analysis.softSkillsFit.score,
        weight: "10%",
        details: (
          <div className="text-sm">
            <p>Cultural Fit: {(job.analysis.softSkillsFit.culturalAlignment * 100).toFixed(0)}%</p>
            <p>Communication: {(job.analysis.softSkillsFit.communicationScore * 100).toFixed(0)}%</p>
          </div>
        )
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {categories.map((category, index) => (
          <div key={index} className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">{category.title}</h4>
              <span className="text-sm text-muted-foreground">Weight: {category.weight}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${category.score}%` }}
                />
              </div>
              <span className="text-sm font-medium">{category.score}%</span>
            </div>
            {category.details}
          </div>
        ))}
      </div>
    );
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
        <div className="p-4 border-b">
          {extractedSkills.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Available skills from your resume:</p>
              <div className="flex flex-wrap gap-2">
                {extractedSkills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-blue-100"
                    onClick={() => !selectedSkills.includes(skill) && selectedSkills.length < 20 && setSelectedSkills(prev => [...prev, skill])}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Selected skills ({selectedSkills.length}/20):</p>
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="default"
                  className="pr-2"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="ml-2 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a new skill..."
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              className="flex-1"
            />
            <Button
              onClick={addSkill}
              disabled={!newSkill || selectedSkills.length >= 20}
              size="icon"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Input
              value={jobKeywords}
              onChange={(e) => setJobKeywords(e.target.value)}
              placeholder="Additional keywords (optional)..."
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || selectedSkills.length === 0}
              className="min-w-[100px]"
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {jobListings?.map((job) => (
              <Card key={job.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <p className="text-sm text-gray-500">
                      {job.company} • {job.location} • {job.remote ? "Remote" : "On-site"}
                    </p>
                    <p className="text-sm text-gray-500">{job.salary}</p>
                  </div>
                  <Badge 
                    variant={job.matchScore >= 80 ? "default" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    <BarChart2 className="w-3 h-3" />
                    {job.matchScore}% Match
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  {job.description}
                </p>

                {activeJobId === job.id && job.analysis && renderMatchAnalysis(job)}

                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={() => optimizeMutation.mutate({ 
                        jobId: job.id, 
                        resumeId: latestResume?.[0]?.id || 0 
                      })}
                      disabled={!latestResume?.[0]?.id}
                    >
                      <FileText className="w-4 h-4" />
                      Optimize Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={() => setActiveJobId(activeJobId === job.id ? null : job.id)}
                    >
                      <BarChart2 className="w-4 h-4" />
                      {activeJobId === job.id ? "Hide Analysis" : "Show Analysis"}
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