import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, File, ArrowRightLeft, Download, CheckCircle2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const jobMatchingSchema = z.object({
  resumeId: z.string().min(1, { message: "Please select a resume" }),
  jobDescription: z.string().min(10, { message: "Job description must be at least 10 characters" }),
});

type JobMatchingFormValues = z.infer<typeof jobMatchingSchema>;

export default function JobMatching() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("input");
  const [optimizationResult, setOptimizationResult] = useState<{
    optimizedContent: string;
    changes: string[];
    keywordMatches: string[];
    matchScore: number;
    missingKeywords: string[];
  } | null>(null);

  // Fetch user's resumes
  const { data: resumes, isLoading: isLoadingResumes } = useQuery({
    queryKey: ["/api/resumes"],
    enabled: !!user,
  });

  const form = useForm<JobMatchingFormValues>({
    resolver: zodResolver(jobMatchingSchema),
    defaultValues: {
      resumeId: "",
      jobDescription: "",
    },
  });

  // Mutation for tweaking resume
  const tweakResumeMutation = useMutation({
    mutationFn: async (values: JobMatchingFormValues) => {
      const response = await apiRequest(
        "POST",
        `/api/resumes/${values.resumeId}/tweak`,
        { jobDescription: values.jobDescription }
      );
      return response.json();
    },
    onSuccess: (data) => {
      setOptimizationResult(data);
      setActiveTab("result");
      toast({
        title: "Resume Tweaked Successfully",
        description: "Your resume has been optimized for the target job",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Tweak Resume",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: JobMatchingFormValues) => {
    tweakResumeMutation.mutate(values);
  };

  const downloadOptimizedResume = () => {
    if (!optimizationResult) return;

    // Create a blob and download it
    const blob = new Blob([optimizationResult.optimizedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optimized_resume.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume Job Matching</h1>
          <p className="text-muted-foreground">
            Tweak your resume to match your target job description
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="result" disabled={!optimizationResult}>
            Result
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Matching</CardTitle>
              <CardDescription>
                Enter a job description to optimize your resume for the target position
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="resumeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Resume</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isLoadingResumes || tweakResumeMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a resume" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(resumes || []).map((resume: any) => (
                              <SelectItem key={resume.id} value={resume.id.toString()}>
                                {resume.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose a resume you want to optimize
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jobDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Paste the full job description here..."
                            className="min-h-[200px]"
                            disabled={tweakResumeMutation.isPending}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Copy and paste the complete job description from the job posting
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={tweakResumeMutation.isPending}
                    className="w-full"
                  >
                    {tweakResumeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Optimizing Resume...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Tweak Resume for Job Match
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="result" className="space-y-4">
          {optimizationResult && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Optimization Results</span>
                    <Badge variant={optimizationResult.matchScore >= 80 ? "default" : "outline"}>
                      {optimizationResult.matchScore}% Match
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Your resume has been optimized for the target job position
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Job Match Score</h3>
                    <Progress value={optimizationResult.matchScore} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {optimizationResult.keywordMatches.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Matching Keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {optimizationResult.keywordMatches.map((keyword, index) => (
                          <Badge key={index} variant="secondary">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {optimizationResult.missingKeywords && optimizationResult.missingKeywords.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Missing Keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {optimizationResult.missingKeywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-muted-foreground">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium mb-2">Changes Made</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {optimizationResult.changes.map((change, index) => (
                        <li key={index}>{change}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab("input")}>
                    Make More Changes
                  </Button>
                  <Button onClick={downloadOptimizedResume}>
                    <Download className="mr-2 h-4 w-4" /> Download Optimized Resume
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimized Resume Content</CardTitle>
                  <CardDescription>
                    Preview your tailored resume content below
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap border rounded-md p-4 bg-muted/50 max-h-[400px] overflow-y-auto text-sm">
                    {optimizationResult.optimizedContent}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}