
import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Download, Edit, Trash2 } from "lucide-react";

interface Resume {
  id: number;
  title: string;
  atsScore: number | null;
  createdAt: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);

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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-[#2ecc71]";
    if (score >= 70) return "bg-[#f39c12]";
    return "bg-[#e74c3c]";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-[#2ecc71]";
    if (score >= 70) return "text-[#f39c12]";
    return "text-[#e74c3c]";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  const avgScore = calculateAverageScore(resumes);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="flex">

        {/* Main Content */}
        <div className="flex-1 p-6 ml-[60px]">
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg">
            <div>
              <h1 className="text-2xl font-bold text-[#2c3e50]">Resume Dashboard</h1>
              <p className="text-[#7f8c8d]">Manage and optimize your resumes</p>
            </div>
            <Link href="/resume-builder">
              <Button className="bg-[#4f8df9]">
                <Plus className="mr-2 h-4 w-4" /> Upload Resume
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="text-[#7f8c8d] mb-4">Total Resumes</h3>
              <div className="text-3xl font-bold text-[#2c3e50]">
                {resumes?.length || 0}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-[#7f8c8d] mb-4">Average ATS Score</h3>
              <div className="text-3xl font-bold text-[#2c3e50] mb-4">
                {avgScore}
              </div>
              <Progress value={avgScore} className="h-2" />
              <div className="flex justify-between mt-2">
                <span className={getScoreTextColor(avgScore)}>
                  {avgScore >= 80 ? "Excellent" : avgScore >= 70 ? "Good" : "Needs Improvement"}
                </span>
                <span className="text-[#7f8c8d]">Target: 85+</span>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-[#7f8c8d] mb-4">Storage Used</h3>
              <div className="text-3xl font-bold text-[#2c3e50] mb-4">
                {resumes?.length || 0}/300
              </div>
              <Progress value={(resumes?.length || 0) / 3} className="h-2" />
              <div className="flex justify-between mt-2">
                <span className="text-[#3498db]">Professional Plan</span>
                <span className="text-[#7f8c8d]">
                  {Math.round(((resumes?.length || 0) / 300) * 100)}% Used
                </span>
              </div>
            </Card>
          </div>

          {/* Resumes Table */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-[#2c3e50] mb-6">Your Resumes</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f5f7fa]">
                  <tr>
                    <th className="text-left p-4 text-[#7f8c8d] font-medium">Title</th>
                    <th className="text-left p-4 text-[#7f8c8d] font-medium">ATS Score</th>
                    <th className="text-left p-4 text-[#7f8c8d] font-medium">Last Updated</th>
                    <th className="text-right p-4 text-[#7f8c8d] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resumes?.map((resume) => (
                    <tr key={resume.id} className="border-t border-[#e6e9ed]">
                      <td className="p-4 text-[#2c3e50]">{resume.title}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-white text-sm ${getScoreColor(resume.atsScore || 0)}`}>
                          {resume.atsScore}%
                        </span>
                      </td>
                      <td className="p-4 text-[#7f8c8d]">
                        {new Date(resume.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button variant="outline" size="icon">
                          <Edit className="h-4 w-4 text-[#f39c12]" />
                        </Button>
                        <Button variant="outline" size="icon">
                          <Download className="h-4 w-4 text-[#3498db]" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => deleteMutation.mutate(resume.id)}
                        >
                          <Trash2 className="h-4 w-4 text-[#e74c3c]" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
