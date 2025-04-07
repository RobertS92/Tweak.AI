import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useClaimResumes } from "@/hooks/use-claim-resumes";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Download, Edit, Trash2, 
  AlertCircle, Loader2, UserPlus,
  Crown, 
} from "lucide-react";

interface Resume {
  id: number;
  title: string;
  atsScore: number | null;
  createdAt: string;
  updatedAt?: string;
}

// Anonymous resume interface similar to the one in use-claim-resumes.tsx
interface AnonymousResume {
  id: number;
  title: string;
  atsScore: number | null;
  content: string;
  fileType: string;
  enhancedContent?: string;
  analysis?: any;
  createdAt: string;
}

// Plan information
interface UserPlan {
  name: string;
  maxResumes: number;
  isPro: boolean;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  
  // Determine user's plan - Check if the user has a premium subscription
  const [userPlan, setUserPlan] = useState<UserPlan>({
    name: "Base Plan",
    maxResumes: 20,
    isPro: false
  });

  // Update the plan whenever user data changes
  useEffect(() => {
    // Check for premium status from user data 
    // This uses a type-safe approach that doesn't require the isPremium property to exist yet
    // We'll need to update the users schema when implementing subscription functionality
    const userData = user as any;
    const userHasPremiumPlan = !!(userData && userData.isPremium === true);
    
    if (userHasPremiumPlan) {
      setUserPlan({
        name: "Professional Plan",
        maxResumes: 300,
        isPro: true
      });
    } else {
      setUserPlan({
        name: "Base Plan",
        maxResumes: 20,
        isPro: false
      });
    }
  }, [user]);

  // Fetch user's resume data
  const { data: resumes = [] as Resume[], isLoading } = useQuery<Resume[]>({
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

  // Get anonymous resumes that can be claimed
  const {
    anonymousResumes = [] as AnonymousResume[],
    isLoading: isLoadingAnonymous,
    isProcessing,
    claimResume,
    claimAllAnonymousResumes
  } = useClaimResumes();
  
  // Check for anonymous resumes and claim them if user prefers
  useEffect(() => {
    if (anonymousResumes && anonymousResumes.length > 0) {
      toast({
        title: `${anonymousResumes.length} anonymous ${anonymousResumes.length === 1 ? 'resume' : 'resumes'} found`,
        description: "You have resume(s) that were created anonymously. Would you like to add them to your account?",
        action: (
          <Button 
            onClick={claimAllAnonymousResumes}
            variant="outline"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? "Claiming..." : "Claim All"}
          </Button>
        )
      });
    }
  }, [anonymousResumes, toast]);

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
  const storagePercentage = Math.round(((resumes?.length || 0) / userPlan.maxResumes) * 100);
  const isStorageNearCapacity = storagePercentage >= 80;
  const isStorageFull = storagePercentage >= 100;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="flex">
        
      {/* Storage Warning Banner */}
      {isStorageNearCapacity && (
        <div className={`fixed top-2 right-2 left-2 z-50 p-4 rounded-lg shadow-lg ${
          isStorageFull ? "bg-red-100 border border-red-400" : "bg-yellow-100 border border-yellow-400"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className={`h-5 w-5 mr-2 ${isStorageFull ? "text-red-500" : "text-yellow-500"}`} />
              <p className={`font-medium ${isStorageFull ? "text-red-800" : "text-yellow-800"}`}>
                {isStorageFull 
                  ? "Your storage is full! Delete some resumes or upgrade to the Professional Plan." 
                  : "Your storage is almost full. Consider upgrading to the Professional Plan for more space."}
              </p>
            </div>
            <Button 
              variant="outline" 
              className={`ml-4 ${isStorageFull ? "border-red-400 text-red-700" : "border-yellow-400 text-yellow-700"}`}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      )}

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg">
            <div>
              <h1 className="text-2xl font-bold text-[#2c3e50]">Resume Dashboard</h1>
              <p className="text-[#7f8c8d]">Manage and optimize your resumes</p>
            </div>
            <Link href="/editor">
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
                {resumes?.length || 0}/{userPlan.maxResumes}
              </div>
              <Progress 
                value={(resumes?.length || 0) / userPlan.maxResumes * 100} 
                className="h-2" 
              />
              <div className="flex justify-between mt-2">
                <span className="text-[#3498db] flex items-center">
                  {userPlan.isPro ? (
                    <>
                      <Crown className="h-4 w-4 mr-1 text-yellow-500" />
                      Professional Plan
                    </>
                  ) : (
                    "Base Plan"
                  )}
                </span>
                <span className="text-[#7f8c8d]">
                  {Math.round(((resumes?.length || 0) / userPlan.maxResumes) * 100)}% Used
                </span>
              </div>
            </Card>
          </div>

          {/* Anonymous Resumes Section */}
          {anonymousResumes && anonymousResumes.length > 0 && (
            <Card className="p-6 mb-6 border-blue-200 border-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-[#3498db] mr-2" />
                  <h2 className="text-xl font-bold text-[#2c3e50]">Anonymous Resumes</h2>
                </div>
                <Button
                  onClick={claimAllAnonymousResumes}
                  disabled={isProcessing}
                  className="bg-[#3498db]"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {isProcessing ? "Claiming..." : "Claim All Resumes"}
                </Button>
              </div>
              
              <p className="text-[#7f8c8d] mb-4">
                These resumes were created while you were not logged in. Claim them to add them to your account.
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#f5f7fa]">
                    <tr>
                      <th className="text-left p-4 text-[#7f8c8d] font-medium">Title</th>
                      <th className="text-left p-4 text-[#7f8c8d] font-medium">ATS Score</th>
                      <th className="text-left p-4 text-[#7f8c8d] font-medium">Created</th>
                      <th className="text-right p-4 text-[#7f8c8d] font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anonymousResumes.map((resume) => (
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
                        <td className="p-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => claimResume(resume.id)}
                            disabled={isProcessing}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Claim
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          
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
                  {resumes.length === 0 ? (
                    <tr className="border-t border-[#e6e9ed]">
                      <td colSpan={4} className="p-4 text-center text-[#7f8c8d]">
                        No resumes found. Upload a resume to get started.
                      </td>
                    </tr>
                  ) : (
                    resumes.map((resume) => (
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
                          <Link href={`/editor/${resume.id}`}>
                            <Button variant="outline" size="icon">
                              <Edit className="h-4 w-4 text-[#f39c12]" />
                            </Button>
                          </Link>
                          <Link href={`/editor/${resume.id}?download=true`}>
                            <Button variant="outline" size="icon">
                              <Download className="h-4 w-4 text-[#3498db]" />
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => deleteMutation.mutate(resume.id)}
                          >
                            <Trash2 className="h-4 w-4 text-[#e74c3c]" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}