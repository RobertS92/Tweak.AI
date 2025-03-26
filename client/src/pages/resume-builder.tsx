import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Plus, FileText, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SectionItem {
  title: string;
  subtitle: string;
  date: string;
  description: string;
  bullets: string[];
  content?: string; 
}

interface SkillCategory {
  name: string;
  skills: string[];
}

interface ResumeSection {
  id: string;
  title: string;
  content?: string;
  items?: SectionItem[];
  categories?: SkillCategory[];
  number?: number; // Added number property
}

export default function ResumeBuilder() {
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>("personal-info");
  const [progress, setProgress] = useState(16.67); 

  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    github: ""
  });

  const sections: ResumeSection[] = [
    { id: "personal-info", title: "Personal Information", number: 1 },
    { id: "professional-summary", title: "Professional Summary", number: 2 },
    { id: "work-experience", title: "Work Experience", number: 3 },
    { id: "education", title: "Education", number: 4 },
    { id: "skills", title: "Skills", number: 5 },
    { id: "projects", title: "Projects & Certs", number: 6 }
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="border-b bg-white">
        <div className="max-w-[1200px] mx-auto px-6 h-[70px] flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#2c3e50]">Resume Builder</h1>
          <div className="hidden md:block w-[300px]">
            <Progress value={progress} className="h-1.5" />
            <p className="text-sm text-muted-foreground mt-1">
              {Math.ceil(progress/16.67)} of 6 Sections
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <div className="bg-white rounded-lg p-4 flex gap-2 overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "px-6 py-3 rounded-lg flex items-center gap-3 min-w-[160px] transition-colors",
                activeSection === section.id 
                  ? "bg-[#4f8df9] text-white"
                  : "bg-[#ecf0f1] text-[#2c3e50]"
              )}
            >
              <span className="text-sm">{section.title}</span>
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs",
                activeSection === section.id
                  ? "bg-white text-[#4f8df9]"
                  : "bg-[#e6e9ed] text-[#7f8c8d]"
              )}>
                {section.number}
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="outline" className="gap-2">
            <Eye className="w-4 h-4" />
            Preview Resume
          </Button>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 py-4 grid grid-cols-1 md:grid-cols-[1fr,250px] gap-6">
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-[#2c3e50] mb-2">Personal Information</h2>
          <p className="text-[#7f8c8d] mb-6">Basic contact details that appear at the top of your resume</p>
          <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4 mb-8">
            <div className="flex gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="font-semibold text-[#2c3e50]">Pro Tips</p>
                <p className="text-sm text-[#2c3e50]">
                  Use a professional email address, and include your LinkedIn URL if it's up-to-date with relevant experience.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-semibold text-[#2c3e50]">Full Name</label>
              <input 
                type="text"
                placeholder="e.g., John Smith"
                className="w-full px-4 py-3 rounded-md border"
                value={personalInfo.name}
                onChange={(e) => setPersonalInfo({...personalInfo, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-[#2c3e50]">Email</label>
              <input 
                type="email"
                placeholder="e.g., john.smith@email.com"
                className="w-full px-4 py-3 rounded-md border"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-[#2c3e50]">Phone</label>
              <input 
                type="tel"
                placeholder="e.g., (123) 456-7890"
                className="w-full px-4 py-3 rounded-md border"
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-[#2c3e50]">Location</label>
              <input 
                type="text"
                placeholder="e.g., New York, NY"
                className="w-full px-4 py-3 rounded-md border"
                value={personalInfo.location}
                onChange={(e) => setPersonalInfo({...personalInfo, location: e.target.value})}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="font-semibold text-[#2c3e50]">LinkedIn URL</label>
              <input 
                type="url"
                placeholder="e.g., linkedin.com/in/johnsmith"
                className="w-full px-4 py-3 rounded-md border"
                value={personalInfo.linkedin}
                onChange={(e) => setPersonalInfo({...personalInfo, linkedin: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-[#2c3e50]">Portfolio Website (Optional)</label>
              <input 
                type="url"
                placeholder="e.g., johnsmith.com"
                className="w-full px-4 py-3 rounded-md border"
                value={personalInfo.portfolio}
                onChange={(e) => setPersonalInfo({...personalInfo, portfolio: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-[#2c3e50]">GitHub (Optional)</label>
              <input 
                type="url"
                placeholder="e.g., github.com/johnsmith"
                className="w-full px-4 py-3 rounded-md border"
                value={personalInfo.github}
                onChange={(e) => setPersonalInfo({...personalInfo, github: e.target.value})}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-12">
            <Button variant="outline" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2 px-6 py-3 bg-[#f9f9fa] rounded-full">
              <span className="text-[#7f8c8d]">Current ATS Score:</span>
              <span className="font-semibold text-[#f39c12]">65/100</span>
              <button className="text-xs text-[#3498db] bg-[#f0f7ff] px-3 py-1 rounded-full">
                Improve Score
              </button>
            </div>
            <Button className="gap-2">
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-center font-bold text-[#2c3e50] mb-4">AI Assistant</h3>
          <p className="text-center text-sm text-[#7f8c8d] mb-4">Ask for help with any section</p>
          <div className="bg-[#f9f9fa] rounded-lg p-4 min-h-[300px] flex items-center justify-center text-center">
            <div className="text-sm text-[#aaaaaa]">
              Type your question<br />or select a suggestion
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {["Write a professional bio", "Format my phone number", "Help with LinkedIn URL"].map((suggestion) => (
              <button
                key={suggestion}
                className="w-full px-4 py-2 rounded-full text-xs text-[#4f8df9] bg-[#f0f7ff] border border-[#4f8df9]"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="mt-6 relative">
            <input
              type="text"
              placeholder="Ask a question..."
              className="w-full pr-12 pl-4 py-3 rounded-full border"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#4f8df9] text-white rounded-full flex items-center justify-center">
              ➤
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}