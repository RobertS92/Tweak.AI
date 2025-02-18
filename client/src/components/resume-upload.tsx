import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ResumeUpload() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);
      const response = await apiRequest("POST", "/api/resumes", formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Resume uploaded successfully",
        description: "Redirecting to dashboard...",
      });
      navigate(`/dashboard`);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFile = (file: File | undefined) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, Word, or TXT file",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  return (
    <Card className={`border-2 ${dragActive ? "border-primary" : "border-dashed"} relative`}>
      <CardContent className="p-8">
        <div
          className="text-center"
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            id="resume-upload"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {uploadMutation.isPending ? (
            <div className="space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Uploading resume...</p>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Your Resume</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your resume here or click to browse
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Supported formats: PDF, Word, or TXT (Max 5MB)
              </p>
              <label htmlFor="resume-upload">
                <Button>Select File</Button>
              </label>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}