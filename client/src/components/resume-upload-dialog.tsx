import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ResumeUploadDialogProps {
  onResumeSelected: (resumeId: number) => Promise<void>;
  onFileUploaded: (file: File) => Promise<void>;
}

export default function ResumeUploadDialog({ onResumeSelected, onFileUploaded }: ResumeUploadDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Fetch existing resumes
  const { data: existingResumes } = useQuery<{ id: number; title: string }[]>({
    queryKey: ['/api/resumes'],
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await onFileUploaded(file);
      setOpen(false);
      toast({
        title: "Resume Uploaded",
        description: "Processing your resume...",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Upload className="w-4 h-4 mr-2" />
          Upload Resume
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload or Select Resume</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {existingResumes && existingResumes.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Existing Resume</label>
              <Select
                onValueChange={(value) => {
                  onResumeSelected(parseInt(value));
                  setOpen(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a resume..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {existingResumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id.toString()}>
                        {resume.title}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Upload New Resume</label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
              />
              <label
                htmlFor="resume-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <FileText className="h-8 w-8 mb-2 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  PDF, DOC, DOCX, or TXT files
                </span>
              </label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
