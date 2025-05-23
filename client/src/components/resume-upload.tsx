import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UploadProgress } from "./upload-progress";

export default function ResumeUpload() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'analyzing' | 'complete' | 'error'>('uploading');
  const [currentFileName, setCurrentFileName] = useState<string>();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("Uploading file:", file.name, file.type, file.size);
      const formData = new FormData();
      formData.append("resume", file);

      // Create XMLHttpRequest to track upload progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadProgress(Math.round(progress));
          }
        };

        xhr.onload = async () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || 'Upload failed'));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error occurred'));
        };

        xhr.open('POST', '/api/resumes', true);
        xhr.send(formData);
      });
    },
    onMutate: (file) => {
      setCurrentFileName(file.name);
      setUploadStatus('uploading');
      setUploadProgress(0);
    },
    onSuccess: (data) => {
      console.log("Upload success:", data);
      setUploadStatus('analyzing');
      setUploadProgress(100);

      // Show analyzing state for a short period before navigating
      setTimeout(() => {
        setUploadStatus('complete');
        toast({
          title: "Resume uploaded successfully",
          description: "Analyzing your resume...",
        });
        navigate(`/editor/${data.id}`);
      }, 1000);
    },
    onError: (error: Error) => {
      console.error("Upload error:", error);
      setUploadStatus('error');
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
      "text/plain"
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or TXT file",
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
            accept=".pdf,.txt"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {uploadMutation.isPending ? (
            <UploadProgress
              progress={uploadProgress}
              status={uploadStatus}
              fileName={currentFileName}
            />
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Your Resume</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your resume here or click to browse
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Supported formats: PDF or TXT (Max 5MB)
              </p>
              <div className="space-y-2">
                <Button onClick={handleButtonClick}>Select File</Button>
                <p className="text-xs text-muted-foreground">
                  You can upload multiple resumes by returning to this page
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}