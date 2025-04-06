import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, PenTool } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface ResumeUploadDialogProps {
  open?: boolean;
  onClose?: () => void;
  onResumeSelected?: (resumeId: number) => Promise<void>;
  onFileUploaded?: (file: File, resumeData?: any) => void | Promise<void>;
}

export default function ResumeUploadDialog({ 
  open: externalOpen, 
  onClose, 
  onResumeSelected, 
  onFileUploaded 
}: ResumeUploadDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const [isUploading, setIsUploading] = useState(false);

  // Handle both controlled and uncontrolled dialog state
  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : open;
  
  const setIsOpen = (value: boolean) => {
    if (isControlled && onClose && !value) {
      onClose();
    } else {
      setOpen(value);
    }
  };

  // Fetch existing resumes if user is authenticated
  const { data: existingResumes } = useQuery<{ id: number; title: string }[]>({
    queryKey: ['/api/resumes'],
    enabled: !!user,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('file', file);

      // First send the file to resume parser to get structured data
      console.log("Parsing resume into structured data");
      
      const parserResponse = await fetch('/api/resume-parser', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!parserResponse.ok) {
        throw new Error('Failed to parse resume');
      }

      // Get the parsed resume data
      const parsedResumeData = await parserResponse.json();
      console.log("Parsed resume data:", parsedResumeData);

      // Now upload the file to save it using the regular resume endpoint
      formData.set('resume', file); // Change field name to match what the API expects
      
      const uploadResponse = await fetch('/api/resumes', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload resume');
      }

      // Get the response data
      const resumeResponse = await uploadResponse.json();
      
      // Combine the data - we need both the storage info from resumeResponse
      // and the parsed structure from parsedResumeData
      const combinedData = {
        ...resumeResponse,
        personalInfo: parsedResumeData.personalInfo,
        sections: parsedResumeData.sections
      };
      
      setIsOpen(false);
      toast({
        title: "Resume Uploaded",
        description: "Resume successfully parsed and uploaded",
      });

      // Process the file upload callback - use combined data
      if (onFileUploaded && typeof onFileUploaded === 'function') {
        try {
          // Pass the file AND combined data to the callback
          await onFileUploaded(file, combinedData);
        } catch (error) {
          console.error("Error in file upload callback:", error);
        }
      } else {
        // Only navigate if we're not on the builder page already
        const currentPath = window.location.pathname;
        if (currentPath !== '/builder') {
          navigate(`/builder`);
        }
      }
    } catch (error) {
      console.error("Upload/parse error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectResume = async (resumeId: number) => {
    try {
      if (onResumeSelected) {
        await onResumeSelected(resumeId);
      } else {
        // Navigate to the resume editor page
        navigate(`/editor/${resumeId}`);
      }
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to select resume",
        variant: "destructive",
      });
    }
  };

  const handleCreateNew = () => {
    navigate('/builder');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Only render the trigger if not controlled externally */}
      {!isControlled && (
        <Button variant="default" onClick={() => setIsOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Resume
        </Button>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Resume Options</DialogTitle>
          <DialogDescription>
            Upload an existing resume, select one from your dashboard, or create a new one.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="upload" className="mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="select" disabled={!user || !existingResumes || existingResumes.length === 0}>
              Select
            </TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="resume-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="resume-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <FileText className="h-12 w-12 mb-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-gray-500 mt-2">
                  PDF, DOC, DOCX, or TXT files
                </span>
                {isUploading && (
                  <div className="mt-4 w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </label>
            </div>
            {!user && (
              <p className="text-sm text-amber-600">
                Note: You'll need to create an account to save your resume analysis.
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="select">
            {user && existingResumes && existingResumes.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Select from your saved resumes:</p>
                <Select onValueChange={(value) => handleSelectResume(parseInt(value))}>
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
            ) : (
              <div className="p-4 text-center text-gray-500">
                <p>You need to be logged in and have resumes saved to select one.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="create">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={handleCreateNew}
            >
              <div className="flex flex-col items-center">
                <PenTool className="h-12 w-12 mb-4 text-blue-500" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Create a Resume from Scratch
                </h3>
                <p className="text-sm text-gray-600">
                  Use our guided resume builder to create a professional resume
                </p>
              </div>
            </div>
            {!user && (
              <p className="text-sm text-amber-600 mt-4">
                Note: You'll need to create an account to save your resume.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
