import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Plus,
  ExternalLink,
  Trash2,
  FileEdit,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Resume {
  id: number;
  title: string;
  atsScore: number | null;
  createdAt: string;
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/resumes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({
        title: "Resume deleted",
        description: "The resume has been removed from your dashboard",
      });
    },
  });

  const calculateAverageScore = (resumes: Resume[] | undefined) => {
    if (!resumes || resumes.length === 0) return 0;
    const total = resumes.reduce((acc, r) => acc + (r.atsScore || 0), 0);
    return Math.round(total / resumes.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Resume Dashboard</h1>
            <p className="text-muted-foreground">
              Manage and optimize your resumes
            </p>
          </div>
          <Link href="/">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload New Resume
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Resumes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "-" : resumes?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average ATS Score</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-3xl font-bold">-</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-3xl font-bold">
                    {calculateAverageScore(resumes)}
                  </div>
                  <Progress
                    value={calculateAverageScore(resumes)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "-" : `${resumes?.length || 0}/3`}
              </div>
              <p className="text-sm text-muted-foreground">Free Plan</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading resumes...
              </div>
            ) : resumes?.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No resumes uploaded yet
                </p>
                <Link href="/">
                  <Button>Upload Your First Resume</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>ATS Score</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumes?.map((resume) => (
                    <TableRow key={resume.id}>
                      <TableCell className="font-medium">
                        {resume.title}
                      </TableCell>
                      <TableCell>
                        {resume.atsScore ? (
                          <Badge
                            variant={
                              resume.atsScore >= 80 ? "success" : "destructive"
                            }
                          >
                            {resume.atsScore}%
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Analyzing</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(resume.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Link href={`/editor/${resume.id}`}>
                            <Button size="sm" variant="outline">
                              <FileEdit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(resume.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}