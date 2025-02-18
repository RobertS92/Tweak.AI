import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ResumeUpload() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("Uploading file:", file.name, file.type, file.size);
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch('/api/resumes', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("Upload success:", data);
      toast({
        title: "Resume uploaded successfully",
        description: "Analyzing your resume...",
      });
      // Redirect to editor page to see analysis
      navigate(`/editor/${data.id}`);
    },
    onError: (error: Error) => {
      console.error("Upload error:", error);
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

  const handleButtonClick = () => {
    const input = document.getElementById('resume-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  return (
    <Card className={`border-2 ${dragActive ? "border-primary" : "border-dashed"} relative`}>
      <CardContent className="p-8">
        <div
          className="text-center"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
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
              <Button onClick={handleButtonClick}>Select File</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}