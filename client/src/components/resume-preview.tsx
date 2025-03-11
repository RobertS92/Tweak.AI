import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResumePreviewProps {
  content: string;
  analysis?: {
    enhancedContent?: string;
  };
}

export default function ResumePreview({
  content,
  analysis,
}: ResumePreviewProps) {
  const [showContent, setShowContent] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { toast } = useToast();

  // Prepare the resume content for proper PDF generation
  // Only remove potentially harmful elements while preserving structure and styling
  const prepareResumeContent = (htmlContent: string) => {
    if (!htmlContent) return "";

    // Only remove scripts and interactive elements, keep structural elements
    const cleanedContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove scripts
      .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, "") // Remove buttons
      .trim();

    // Ensure content is wrapped in the proper resume container
    // Check if the content already has the resume structure
    if (cleanedContent.includes('<div class="resume">')) {
      return cleanedContent;
    }

    // Wrap the content in the proper resume structure if it doesn't have it
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Professional Resume</title>
  <style>
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    body {
      background-color: white;
      color: #333;
      line-height: 1.6;
    }

    /* Container for resume */
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
    }

    /* Resume styles */
    .resume {
      padding: 10px;
    }

    /* Header section */
    .header {
      border-bottom: 2px solid #3E7CB1;
      padding-bottom: 15px;
      margin-bottom: 20px;
      text-align: center;
    }

    .header h1 {
      font-size: 32px;
      margin-bottom: 8px;
      color: #2C3E50;
      font-weight: 600;
    }

    .contact-info {
      font-size: 16px;
      margin-bottom: 5px;
      color: #555;
    }

    .links {
      font-size: 16px;
      color: #3E7CB1;
    }

    .links a {
      color: #3E7CB1;
      text-decoration: none;
    }

    /* Section styling */
    .section {
      margin-bottom: 22px;
    }

    .section h2 {
      font-size: 20px;
      color: #2C3E50;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ddd;
      font-weight: 600;
    }

    /* Job styling */
    .job, .education-item {
      margin-bottom: 18px;
    }

    .job h3, .education-item h3 {
      font-size: 18px;
      color: #2C3E50;
      margin-bottom: 4px;
      font-weight: 600;
    }

    .job-title {
      font-size: 16px;
      color: #333;
      font-style: italic;
      margin-bottom: 8px;
    }

    /* List styling */
    ul {
      padding-left: 20px;
      margin-bottom: 10px;
    }

    ul li {
      margin-bottom: 6px;
      font-size: 15px;
    }

    .skills-list li {
      margin-bottom: 8px;
    }

    .skills-list li strong {
      color: #2C3E50;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="resume">
      ${cleanedContent}
    </div>
  </div>
</body>
</html>
    `;
  };

  const downloadEnhancedResume = async () => {
    if (!analysis?.enhancedContent) {
      toast({
        title: "Error",
        description: "No enhanced content available to download",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);
      // Use the modified function to preserve structure
      const formattedContent = prepareResumeContent(analysis.enhancedContent);

      const response = await fetch("/api/resumes/download-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: formattedContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `enhanced_resume_${new Date().toISOString().split("T")[0]}.pdf`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Your enhanced resume has been downloaded",
      });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast({
        title: "Download failed",
        description:
          error instanceof Error
            ? error.message
            : "There was an error downloading your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // This function is used for the preview display which may need different handling
  const cleanPreviewContent = (htmlContent: string) => {
    if (!htmlContent) return "";

    // Only remove potentially harmful elements for the preview
    return htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, "")
      .trim();
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">
          Enhanced Resume
        </CardTitle>
        <p className="text-sm text-gray-600">
          AI-optimized version with all improvements and formatting fixes
          applied
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => setShowContent(true)}
            className="flex-1 py-3 flex items-center justify-center gap-2"
          >
            <FileText className="w-5 h-5" />
            View Enhanced Resume
          </Button>
          <Button
            onClick={downloadEnhancedResume}
            disabled={isDownloading || !analysis?.enhancedContent}
            className="py-3 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
        </div>
      </CardContent>

      <Dialog open={showContent} onOpenChange={setShowContent}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Enhanced Resume Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-8 bg-white">
            {analysis?.enhancedContent ? (
              <div
                id="resume-preview"
                className="resume-container"
                dangerouslySetInnerHTML={{
                  __html: cleanPreviewContent(analysis.enhancedContent),
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No enhanced content available yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
