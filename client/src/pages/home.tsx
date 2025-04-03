
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Resume } from "@shared/schema";

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Handle file upload
  const uploadMutation = useMutation<Resume, Error, File>({
    mutationFn: async (file: File) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("resume", file);

      return new Promise<Resume>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/resumes");

        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadProgress(Math.round(progress));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText) as Resume;
            resolve(result);
          } else {
            reject(new Error(xhr.statusText || "Upload failed"));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error occurred"));
        };

        xhr.send(formData);
      });
    },
    onSuccess: (data: Resume) => {
      setUploading(false);
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been analyzed and scored.",
      });
      navigate(`/editor/${data.id}`);
    },
    onError: (error: Error) => {
      setUploading(false);
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };
  
  const handleButtonClick = () => {
    document.getElementById("resume-file-input")?.click();
  };
  
  const handleFile = (file: File | undefined) => {
    if (!file) return;
    
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login or register to upload your resume",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    uploadMutation.mutate(file);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-[#1e2a3b] mb-4">
          Optimize Your Resume with AI
        </h1>
        <p className="text-xl text-[#2c3e50] mb-16 max-w-2xl mx-auto">
          Get instant ATS score analysis, personalized improvements, and match your resume
          to job descriptions to stand out from the competition.
        </p>

        <div className="flex justify-center items-center gap-16 mb-20">
          {[
            { number: "1", label: "Upload", desc: "Upload your existing resume" },
            { number: "2", label: "Analyze", desc: "AI analyzes your content" },
            { number: "3", label: "Optimize", desc: "Get personalized improvements" },
            { number: "4", label: "Match", desc: "Target specific job descriptions" }
          ].map((step) => (
            <div key={step.number} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#4f8df9] text-white flex items-center justify-center text-xl font-semibold mb-2">
                {step.number}
              </div>
              <div className="text-lg font-semibold text-[#1e2a3b] mb-1">{step.label}</div>
              <div className="text-sm text-[#2c3e50]">{step.desc}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8 mb-20">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-[#f0f7ff] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#4f8df9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-4">Upload Resume</h3>
            <ul className="text-sm text-[#2c3e50] space-y-2">
              <li>Support for PDF, Word, and TXT</li>
              <li>Secure document handling</li>
              <li>Multiple resume management</li>
              <li>Version control and history</li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-[#f0f7ff] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#4f8df9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-4">AI Analysis</h3>
            <ul className="text-sm text-[#2c3e50] space-y-2">
              <li>ATS compatibility scoring</li>
              <li>Keyword optimization</li>
              <li>Content and format evaluation</li>
              <li>Industry-specific recommendations</li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-[#f0f7ff] rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#4f8df9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-4">Job Matching</h3>
            <ul className="text-sm text-[#2c3e50] space-y-2">
              <li>Job description analysis</li>
              <li>Skill gap identification</li>
              <li>Targeted keyword suggestions</li>
              <li>Customized versions for each job</li>
            </ul>
          </div>
        </div>

        <div 
          className={`bg-white p-8 rounded-lg shadow-sm mb-16 max-w-2xl mx-auto ${dragActive ? 'ring-2 ring-[#4f8df9]' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-[#f0f7ff] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#4f8df9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
              </svg>
            </div>
            <input
              type="file"
              id="resume-file-input"
              className="hidden"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
            />
            <h3 className="text-xl font-semibold mb-2">Upload Your Resume</h3>
            
            <div 
              className={`border-2 border-dashed rounded-lg p-6 mb-4 transition-colors cursor-pointer
                ${dragActive ? 'border-[#4f8df9] bg-[#f0f7ff]' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
              onClick={handleButtonClick}
            >
              <p className="text-sm text-[#2c3e50] mb-2">
                {dragActive ? "Drop your file here" : "Drag and drop your resume here or click to browse"}
              </p>
              <p className="text-xs text-[#7f8c8d]">Supported formats: PDF or TXT (Max 5MB)</p>
            </div>
            
            <Button 
              className="bg-[#4f8df9] text-white"
              onClick={handleButtonClick}
              disabled={uploading}
            >
              {uploading ? `Uploading (${uploadProgress}%)` : "Select File"}
            </Button>
            <p className="text-xs text-[#7f8c8d] mt-4">You can upload multiple resumes by returning to this page</p>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-[#1e2a3b] mb-8">What Our Users Say</h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              {
                name: "John Miller",
                role: "Software Engineer",
                quote: "Thanks to Tweak AI, my resume's ATS score jumped from 65% to 90%. I received callbacks from 3 companies within a week!",
                initials: "JM"
              },
              {
                name: "Sarah Adams",
                role: "Marketing Specialist",
                quote: "The job matching feature is incredible. It showed me exactly what keywords I was missing for each application. Game changer!",
                initials: "SA"
              },
              {
                name: "David Rodriguez",
                role: "Career Coach",
                quote: "As a career coach, I recommend Tweak AI to all my clients. It provides the data-driven insights that help make a difference.",
                initials: "DR"
              }
            ].map((testimonial) => (
              <div key={testimonial.name} className="bg-white p-6 rounded-lg shadow-sm">
                <p className="text-sm text-[#2c3e50] mb-4">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#4f8df9] text-white flex items-center justify-center text-sm">
                    {testimonial.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.name}</div>
                    <div className="text-xs text-[#7f8c8d]">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button className="bg-[#1e2a3b] text-white px-8">View Dashboard</Button>
          </Link>
          <Button variant="outline" className="px-8">Learn More</Button>
        </div>
      </div>
      <div className="text-center py-4 text-sm text-[#7f8c8d] border-t">
        © 2025 Tweak AI. All rights reserved.
      </div>
    </div>
  );
}
