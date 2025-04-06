import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, FileText, Eye, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import ResumeUploadDialog from "@/components/resume-upload-dialog";
import { useAuth } from "@/hooks/use-auth";

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
  number?: number;
  description?: string;
}

interface Message {
  type: 'user' | 'ai';
  content: string;
}

export default function ResumeBuilder() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>("personal-info");
  const [progress, setProgress] = useState(16.67);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [atsScore, setAtsScore] = useState(65);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessingAiRequest, setIsProcessingAiRequest] = useState(false);
  const resumeContentRef = useRef<HTMLDivElement>(null);

  // Resume data states
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    github: ""
  });

  const [professionalSummary, setProfessionalSummary] = useState("");
  
  const [workExperience, setWorkExperience] = useState<SectionItem[]>([
    { 
      title: "", 
      subtitle: "", 
      date: "", 
      description: "", 
      bullets: [""] 
    }
  ]);
  
  const [education, setEducation] = useState<SectionItem[]>([
    { 
      title: "", 
      subtitle: "", 
      date: "", 
      description: "", 
      bullets: [] 
    }
  ]);
  
  const [skills, setSkills] = useState<SkillCategory[]>([
    { 
      name: "Technical Skills", 
      skills: [""] 
    }
  ]);
  
  const [projects, setProjects] = useState<SectionItem[]>([
    { 
      title: "", 
      subtitle: "", 
      date: "", 
      description: "", 
      bullets: [""] 
    }
  ]);

  const sections: ResumeSection[] = [
    { 
      id: "personal-info", 
      title: "Personal Information", 
      number: 1,
      description: "Basic contact details that appear at the top of your resume"
    },
    { 
      id: "professional-summary", 
      title: "Professional Summary", 
      number: 2,
      description: "A concise overview of your experience, skills, and career goals"
    },
    { 
      id: "work-experience", 
      title: "Work Experience", 
      number: 3,
      description: "Your employment history, including achievements and responsibilities"
    },
    { 
      id: "education", 
      title: "Education", 
      number: 4,
      description: "Your educational background, degrees, and certifications"
    },
    { 
      id: "skills", 
      title: "Skills", 
      number: 5,
      description: "Technical, professional, and soft skills relevant to your target role"
    },
    { 
      id: "projects", 
      title: "Projects & Certs", 
      number: 6,
      description: "Notable projects, certifications, and additional qualifications"
    }
  ];

  // Effect to update progress when active section changes
  useEffect(() => {
    const currentSection = sections.find(section => section.id === activeSection);
    if (currentSection?.number) {
      setProgress(currentSection.number * 16.67);
    }
  }, [activeSection]);

  // Calculate ATS score based on resume completeness
  useEffect(() => {
    let score = 0;
    
    // Personal info check (up to 20 points)
    const filledPersonalFields = Object.values(personalInfo).filter(val => val.trim().length > 0).length;
    score += Math.min(20, (filledPersonalFields / 5) * 20);
    
    // Professional summary (up to 15 points)
    score += professionalSummary.length > 50 ? 15 : (professionalSummary.length / 50) * 15;
    
    // Work experience (up to 25 points)
    const workExpComplete = workExperience.filter(exp => 
      exp.title && exp.subtitle && exp.date && 
      (exp.description || exp.bullets.some(b => b.trim().length > 0))
    ).length;
    score += workExpComplete > 0 ? Math.min(25, (workExpComplete / 2) * 25) : 0;
    
    // Education (up to 15 points)
    const eduComplete = education.filter(edu => edu.title && edu.subtitle).length;
    score += eduComplete > 0 ? 15 : 0;
    
    // Skills (up to 15 points)
    const skillsCount = skills.reduce((acc, category) => 
      acc + category.skills.filter(s => s.trim().length > 0).length, 0
    );
    score += skillsCount >= 5 ? 15 : (skillsCount / 5) * 15;
    
    // Projects (up to 10 points)
    const projectsComplete = projects.filter(proj => 
      proj.title && (proj.description || proj.bullets.some(b => b.trim().length > 0))
    ).length;
    score += projectsComplete > 0 ? 10 : 0;
    
    setAtsScore(Math.round(score));
  }, [personalInfo, professionalSummary, workExperience, education, skills, projects]);

  // Handle section navigation
  const navigateToSection = (direction: 'next' | 'previous') => {
    const currentIndex = sections.findIndex(section => section.id === activeSection);
    let nextIndex;
    
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % sections.length;
    } else {
      nextIndex = (currentIndex - 1 + sections.length) % sections.length;
    }
    
    setActiveSection(sections[nextIndex].id);
  };

  // Handle AI assistant interactions
  const handleAskAssistant = async () => {
    if (!assistantQuestion.trim()) return;
    
    const userMessage: Message = { type: 'user', content: assistantQuestion };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessingAiRequest(true);
    
    try {
      // Determine context based on active section
      let context = "";
      switch (activeSection) {
        case "personal-info":
          context = `The user is editing their personal information section with data: ${JSON.stringify(personalInfo)}`;
          break;
        case "professional-summary":
          context = `The user is editing their professional summary section with content: "${professionalSummary}"`;
          break;
        case "work-experience":
          context = `The user is editing their work experience section with data: ${JSON.stringify(workExperience)}`;
          break;
        case "education":
          context = `The user is editing their education section with data: ${JSON.stringify(education)}`;
          break;
        case "skills":
          context = `The user is editing their skills section with data: ${JSON.stringify(skills)}`;
          break;
        case "projects":
          context = `The user is editing their projects section with data: ${JSON.stringify(projects)}`;
          break;
      }
      
      // Call AI assistant API
      const response = await apiRequest("POST", "/api/resume-ai-assistant", { 
        question: assistantQuestion,
        section: activeSection,
        context
      });
      
      const data = await response.json();
      
      // Add AI response to messages
      if (data.answer) {
        const aiMessage: Message = { type: 'ai', content: data.answer };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error("No response received from AI assistant");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI assistant response. Please try again.",
        variant: "destructive"
      });
      
      // Add error message
      const errorMessage: Message = { 
        type: 'ai', 
        content: "I'm having trouble processing your request. Please try again or try a different question." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessingAiRequest(false);
      setAssistantQuestion("");
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setAssistantQuestion(suggestion);
    handleAskAssistant();
  };

  // Export resume as PDF
  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    
    try {
      // Prepare resume data
      const resumeData = {
        personalInfo,
        sections: [
          {
            id: "professional-summary",
            title: "Professional Summary",
            content: professionalSummary
          },
          {
            id: "work-experience",
            title: "Work Experience",
            items: workExperience.filter(item => item.title.trim() !== "")
          },
          {
            id: "education",
            title: "Education",
            items: education.filter(item => item.title.trim() !== "")
          },
          {
            id: "skills",
            title: "Skills",
            categories: skills.filter(cat => 
              cat.skills.some(skill => skill.trim() !== "")
            )
          },
          {
            id: "projects",
            title: "Projects & Certifications",
            items: projects.filter(item => item.title.trim() !== "")
          }
        ]
      };
      
      // Generate PDF title
      const title = personalInfo.name 
        ? `${personalInfo.name.split(' ')[0]}'s Resume` 
        : "Generated Resume";
      
      const response = await apiRequest("POST", "/api/resumes/generate-pdf", {
        resumeData,
        title
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Your resume has been exported as PDF.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Save resume to dashboard
  const handleSaveResume = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save your resume.",
        variant: "destructive"
      });
      
      // Show a confirmation dialog instead of automatically navigating
      if (confirm("You need to be logged in to save resumes. Would you like to go to the login page?")) {
        navigate("/auth");
      }
      return;
    }
    
    try {
      // Prepare resume data similar to PDF export
      const resumeData = {
        personalInfo,
        sections: [
          {
            id: "professional-summary",
            title: "Professional Summary",
            content: professionalSummary
          },
          {
            id: "work-experience",
            title: "Work Experience",
            items: workExperience.filter(item => item.title.trim() !== "")
          },
          {
            id: "education",
            title: "Education",
            items: education.filter(item => item.title.trim() !== "")
          },
          {
            id: "skills",
            title: "Skills",
            categories: skills.filter(cat => 
              cat.skills.some(skill => skill.trim() !== "")
            )
          },
          {
            id: "projects",
            title: "Projects & Certifications",
            items: projects.filter(item => item.title.trim() !== "")
          }
        ]
      };
      
      // Generate title
      const title = personalInfo.name 
        ? `${personalInfo.name.split(' ')[0]}'s Resume` 
        : "Generated Resume";
      
      const response = await apiRequest("POST", "/api/resumes/save-builder", {
        resumeData,
        title,
        atsScore
      });
      
      if (!response.ok) {
        throw new Error("Failed to save resume");
      }
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Your resume has been saved to your dashboard.",
      });
      
      // Navigate to dashboard after saving
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save your resume. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Render section content based on active section
  const renderSectionContent = () => {
    const currentSection = sections.find(section => section.id === activeSection);
    
    switch (activeSection) {
      case "personal-info":
        return (
          <>
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-2">Personal Information</h2>
            <p className="text-[#7f8c8d] mb-6">{currentSection?.description}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="md:col-span-2 space-y-2">
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
          </>
        );
        
      case "professional-summary":
        return (
          <>
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-2">Professional Summary</h2>
            <p className="text-[#7f8c8d] mb-6">{currentSection?.description}</p>
            <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4 mb-8">
              <div className="flex gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-semibold text-[#2c3e50]">Pro Tips</p>
                  <p className="text-sm text-[#2c3e50]">
                    Keep it concise (3-5 sentences). Highlight key skills, experience level, and notable achievements. Tailor it to your target role.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-[#2c3e50]">Professional Summary</label>
              <Textarea 
                placeholder="e.g., Detail-oriented software developer with 5+ years of experience in full-stack development. Proven track record of delivering high-quality applications on time and within budget..."
                className="w-full px-4 py-3 rounded-md border min-h-[200px]"
                value={professionalSummary}
                onChange={(e) => setProfessionalSummary(e.target.value)}
              />
            </div>
          </>
        );
        
      case "work-experience":
        return (
          <>
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-2">Work Experience</h2>
            <p className="text-[#7f8c8d] mb-6">{currentSection?.description}</p>
            <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4 mb-8">
              <div className="flex gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-semibold text-[#2c3e50]">Pro Tips</p>
                  <p className="text-sm text-[#2c3e50]">
                    Use action verbs and quantify your achievements where possible. Focus on results and contributions rather than just listing responsibilities.
                  </p>
                </div>
              </div>
            </div>
            
            {workExperience.map((job, index) => (
              <div key={index} className="mb-8 p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Job #{index + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Job Title</label>
                    <input 
                      type="text"
                      placeholder="e.g., Senior Software Engineer"
                      className="w-full px-4 py-3 rounded-md border"
                      value={job.title}
                      onChange={(e) => {
                        const updated = [...workExperience];
                        updated[index].title = e.target.value;
                        setWorkExperience(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Company Name</label>
                    <input 
                      type="text"
                      placeholder="e.g., Acme Corporation"
                      className="w-full px-4 py-3 rounded-md border"
                      value={job.subtitle}
                      onChange={(e) => {
                        const updated = [...workExperience];
                        updated[index].subtitle = e.target.value;
                        setWorkExperience(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-semibold text-[#2c3e50]">Date Range</label>
                    <input 
                      type="text"
                      placeholder="e.g., January 2020 - Present"
                      className="w-full px-4 py-3 rounded-md border"
                      value={job.date}
                      onChange={(e) => {
                        const updated = [...workExperience];
                        updated[index].date = e.target.value;
                        setWorkExperience(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-semibold text-[#2c3e50]">Description (optional)</label>
                    <Textarea 
                      placeholder="e.g., Brief overview of your role and company"
                      className="w-full px-4 py-3 rounded-md border"
                      value={job.description}
                      onChange={(e) => {
                        const updated = [...workExperience];
                        updated[index].description = e.target.value;
                        setWorkExperience(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-semibold text-[#2c3e50]">Key Achievements</label>
                    {job.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2 mb-2">
                        <input 
                          type="text"
                          placeholder="e.g., Increased website performance by 40% through code optimization"
                          className="w-full px-4 py-3 rounded-md border"
                          value={bullet}
                          onChange={(e) => {
                            const updated = [...workExperience];
                            updated[index].bullets[bulletIndex] = e.target.value;
                            setWorkExperience(updated);
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          type="button"
                          onClick={() => {
                            const updated = [...workExperience];
                            if (job.bullets.length > 1) {
                              updated[index].bullets.splice(bulletIndex, 1);
                            } else {
                              updated[index].bullets[bulletIndex] = "";
                            }
                            setWorkExperience(updated);
                          }}
                        >
                          -
                        </Button>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      type="button"
                      className="w-full"
                      onClick={() => {
                        const updated = [...workExperience];
                        updated[index].bullets.push("");
                        setWorkExperience(updated);
                      }}
                    >
                      Add Bullet Point
                    </Button>
                  </div>
                </div>
                {workExperience.length > 1 && (
                  <Button 
                    variant="destructive" 
                    className="mt-4"
                    onClick={() => {
                      if (workExperience.length > 1) {
                        setWorkExperience(workExperience.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    Remove Job
                  </Button>
                )}
              </div>
            ))}
            
            <Button 
              type="button"
              onClick={() => {
                setWorkExperience([...workExperience, {
                  title: "",
                  subtitle: "",
                  date: "",
                  description: "",
                  bullets: [""]
                }]);
              }}
            >
              Add Another Job
            </Button>
          </>
        );
        
      case "education":
        return (
          <>
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-2">Education</h2>
            <p className="text-[#7f8c8d] mb-6">{currentSection?.description}</p>
            <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4 mb-8">
              <div className="flex gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-semibold text-[#2c3e50]">Pro Tips</p>
                  <p className="text-sm text-[#2c3e50]">
                    List your most recent education first. Include relevant coursework if it relates to the job you're applying for.
                  </p>
                </div>
              </div>
            </div>
            
            {education.map((edu, index) => (
              <div key={index} className="mb-8 p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Education #{index + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Degree/Certificate</label>
                    <input 
                      type="text"
                      placeholder="e.g., Bachelor of Science in Computer Science"
                      className="w-full px-4 py-3 rounded-md border"
                      value={edu.title}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[index].title = e.target.value;
                        setEducation(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Institution</label>
                    <input 
                      type="text"
                      placeholder="e.g., University of California, Berkeley"
                      className="w-full px-4 py-3 rounded-md border"
                      value={edu.subtitle}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[index].subtitle = e.target.value;
                        setEducation(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-semibold text-[#2c3e50]">Date Range</label>
                    <input 
                      type="text"
                      placeholder="e.g., 2016 - 2020"
                      className="w-full px-4 py-3 rounded-md border"
                      value={edu.date}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[index].date = e.target.value;
                        setEducation(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-semibold text-[#2c3e50]">Description (optional)</label>
                    <Textarea 
                      placeholder="e.g., Relevant coursework, honors, GPA if above 3.5"
                      className="w-full px-4 py-3 rounded-md border"
                      value={edu.description}
                      onChange={(e) => {
                        const updated = [...education];
                        updated[index].description = e.target.value;
                        setEducation(updated);
                      }}
                    />
                  </div>
                </div>
                {education.length > 1 && (
                  <Button 
                    variant="destructive" 
                    className="mt-4"
                    onClick={() => {
                      if (education.length > 1) {
                        setEducation(education.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    Remove Education
                  </Button>
                )}
              </div>
            ))}
            
            <Button 
              type="button"
              onClick={() => {
                setEducation([...education, {
                  title: "",
                  subtitle: "",
                  date: "",
                  description: "",
                  bullets: []
                }]);
              }}
            >
              Add Another Education
            </Button>
          </>
        );
        
      case "skills":
        return (
          <>
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-2">Skills</h2>
            <p className="text-[#7f8c8d] mb-6">{currentSection?.description}</p>
            <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4 mb-8">
              <div className="flex gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-semibold text-[#2c3e50]">Pro Tips</p>
                  <p className="text-sm text-[#2c3e50]">
                    Organize skills by category for better readability. Include both technical and soft skills relevant to your target role.
                  </p>
                </div>
              </div>
            </div>
            
            {skills.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-8 p-6 border rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Skill Category</h3>
                  {skills.length > 1 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        if (skills.length > 1) {
                          setSkills(skills.filter((_, i) => i !== categoryIndex));
                        }
                      }}
                    >
                      Remove Category
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Category Name</label>
                    <input 
                      type="text"
                      placeholder="e.g., Programming Languages, Soft Skills, etc."
                      className="w-full px-4 py-3 rounded-md border"
                      value={category.name}
                      onChange={(e) => {
                        const updated = [...skills];
                        updated[categoryIndex].name = e.target.value;
                        setSkills(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Skills</label>
                    {category.skills.map((skill, skillIndex) => (
                      <div key={skillIndex} className="flex gap-2 mb-2">
                        <input 
                          type="text"
                          placeholder="e.g., JavaScript, React, Problem Solving"
                          className="w-full px-4 py-3 rounded-md border"
                          value={skill}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[categoryIndex].skills[skillIndex] = e.target.value;
                            setSkills(updated);
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          type="button"
                          onClick={() => {
                            const updated = [...skills];
                            if (category.skills.length > 1) {
                              updated[categoryIndex].skills.splice(skillIndex, 1);
                            } else {
                              updated[categoryIndex].skills[skillIndex] = "";
                            }
                            setSkills(updated);
                          }}
                        >
                          -
                        </Button>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      type="button"
                      className="w-full"
                      onClick={() => {
                        const updated = [...skills];
                        updated[categoryIndex].skills.push("");
                        setSkills(updated);
                      }}
                    >
                      Add Skill
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              type="button"
              onClick={() => {
                setSkills([...skills, {
                  name: "",
                  skills: [""]
                }]);
              }}
            >
              Add Another Category
            </Button>
          </>
        );
        
      case "projects":
        return (
          <>
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-2">Projects & Certifications</h2>
            <p className="text-[#7f8c8d] mb-6">{currentSection?.description}</p>
            <div className="bg-[#f0f7ff] border border-[#4f8df9] rounded-lg p-4 mb-8">
              <div className="flex gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-semibold text-[#2c3e50]">Pro Tips</p>
                  <p className="text-sm text-[#2c3e50]">
                    For projects, include links if available. Highlight your role, technologies used, and the impact of your contribution.
                  </p>
                </div>
              </div>
            </div>
            
            {projects.map((project, index) => (
              <div key={index} className="mb-8 p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Project/Certification #{index + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Title</label>
                    <input 
                      type="text"
                      placeholder="e.g., E-commerce Website, AWS Certified Developer"
                      className="w-full px-4 py-3 rounded-md border"
                      value={project.title}
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[index].title = e.target.value;
                        setProjects(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-semibold text-[#2c3e50]">Organization/Link (optional)</label>
                    <input 
                      type="text"
                      placeholder="e.g., GitHub link, certification authority"
                      className="w-full px-4 py-3 rounded-md border"
                      value={project.subtitle}
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[index].subtitle = e.target.value;
                        setProjects(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-semibold text-[#2c3e50]">Date (optional)</label>
                    <input 
                      type="text"
                      placeholder="e.g., June 2022, 2021 - 2022"
                      className="w-full px-4 py-3 rounded-md border"
                      value={project.date}
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[index].date = e.target.value;
                        setProjects(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-semibold text-[#2c3e50]">Description</label>
                    <Textarea 
                      placeholder="e.g., Project overview, technologies used, your role"
                      className="w-full px-4 py-3 rounded-md border"
                      value={project.description}
                      onChange={(e) => {
                        const updated = [...projects];
                        updated[index].description = e.target.value;
                        setProjects(updated);
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="font-semibold text-[#2c3e50]">Key Features/Achievements (optional)</label>
                    {project.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2 mb-2">
                        <input 
                          type="text"
                          placeholder="e.g., Implemented responsive design, Recognized for top 10% performance"
                          className="w-full px-4 py-3 rounded-md border"
                          value={bullet}
                          onChange={(e) => {
                            const updated = [...projects];
                            updated[index].bullets[bulletIndex] = e.target.value;
                            setProjects(updated);
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          type="button"
                          onClick={() => {
                            const updated = [...projects];
                            if (project.bullets.length > 1) {
                              updated[index].bullets.splice(bulletIndex, 1);
                            } else {
                              updated[index].bullets[bulletIndex] = "";
                            }
                            setProjects(updated);
                          }}
                        >
                          -
                        </Button>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      type="button"
                      className="w-full"
                      onClick={() => {
                        const updated = [...projects];
                        updated[index].bullets.push("");
                        setProjects(updated);
                      }}
                    >
                      Add Bullet Point
                    </Button>
                  </div>
                </div>
                {projects.length > 1 && (
                  <Button 
                    variant="destructive" 
                    className="mt-4"
                    onClick={() => {
                      if (projects.length > 1) {
                        setProjects(projects.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    Remove Project
                  </Button>
                )}
              </div>
            ))}
            
            <Button 
              type="button"
              onClick={() => {
                setProjects([...projects, {
                  title: "",
                  subtitle: "",
                  date: "",
                  description: "",
                  bullets: [""]
                }]);
              }}
            >
              Add Another Project
            </Button>
          </>
        );
        
      default:
        return null;
    }
  };

  // Resume preview content generation
  const generateResumePreview = () => {
    // This is a simplified preview for the dialog
    return (
      <div ref={resumeContentRef} className="p-6 bg-white max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#2c3e50]">{personalInfo.name || "Your Name"}</h1>
          <div className="text-sm text-[#7f8c8d]">
            {personalInfo.email && <span className="mr-2">{personalInfo.email}</span>}
            {personalInfo.phone && <span className="mr-2">{personalInfo.phone}</span>}
            {personalInfo.location && <span>{personalInfo.location}</span>}
          </div>
          <div className="text-sm text-[#7f8c8d] mt-1">
            {personalInfo.linkedin && (
              <a href={personalInfo.linkedin} className="text-[#3498db] mr-2">LinkedIn</a>
            )}
            {personalInfo.portfolio && (
              <a href={personalInfo.portfolio} className="text-[#3498db] mr-2">Portfolio</a>
            )}
            {personalInfo.github && (
              <a href={personalInfo.github} className="text-[#3498db]">GitHub</a>
            )}
          </div>
        </div>
        
        {professionalSummary && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#2c3e50] border-b pb-1 mb-2">Professional Summary</h2>
            <p className="text-sm">{professionalSummary}</p>
          </div>
        )}
        
        {workExperience.some(job => job.title || job.subtitle) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#2c3e50] border-b pb-1 mb-2">Work Experience</h2>
            {workExperience.filter(job => job.title || job.subtitle).map((job, index) => (
              <div key={index} className="mb-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{job.title || "Position"}</h3>
                  <span className="text-sm text-[#7f8c8d]">{job.date || "Date Range"}</span>
                </div>
                <p className="text-[#2c3e50]">{job.subtitle || "Company"}</p>
                {job.description && <p className="text-sm mt-1">{job.description}</p>}
                {job.bullets.some(b => b.trim()) && (
                  <ul className="list-disc pl-5 mt-2 text-sm">
                    {job.bullets.filter(b => b.trim()).map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        
        {education.some(edu => edu.title || edu.subtitle) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#2c3e50] border-b pb-1 mb-2">Education</h2>
            {education.filter(edu => edu.title || edu.subtitle).map((edu, index) => (
              <div key={index} className="mb-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{edu.title || "Degree"}</h3>
                  <span className="text-sm text-[#7f8c8d]">{edu.date || "Date Range"}</span>
                </div>
                <p className="text-[#2c3e50]">{edu.subtitle || "Institution"}</p>
                {edu.description && <p className="text-sm mt-1">{edu.description}</p>}
              </div>
            ))}
          </div>
        )}
        
        {skills.some(cat => cat.name && cat.skills.some(s => s.trim())) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#2c3e50] border-b pb-1 mb-2">Skills</h2>
            {skills.filter(cat => cat.name && cat.skills.some(s => s.trim())).map((cat, index) => (
              <div key={index} className="mb-3">
                <h3 className="font-semibold">{cat.name}</h3>
                <p className="text-sm">
                  {cat.skills.filter(s => s.trim()).join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {projects.some(proj => proj.title) && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#2c3e50] border-b pb-1 mb-2">Projects & Certifications</h2>
            {projects.filter(proj => proj.title).map((proj, index) => (
              <div key={index} className="mb-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{proj.title}</h3>
                  <span className="text-sm text-[#7f8c8d]">{proj.date}</span>
                </div>
                {proj.subtitle && <p className="text-[#2c3e50]">{proj.subtitle}</p>}
                {proj.description && <p className="text-sm mt-1">{proj.description}</p>}
                {proj.bullets.some(b => b.trim()) && (
                  <ul className="list-disc pl-5 mt-2 text-sm">
                    {proj.bullets.filter(b => b.trim()).map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Reset all form data
                setPersonalInfo({
                  name: "",
                  email: "",
                  phone: "",
                  location: "",
                  linkedin: "",
                  portfolio: "",
                  github: ""
                });
                setProfessionalSummary("");
                setWorkExperience([{ 
                  title: "", 
                  subtitle: "", 
                  date: "", 
                  description: "", 
                  bullets: [""] 
                }]);
                setEducation([{ 
                  title: "", 
                  subtitle: "", 
                  date: "", 
                  description: "", 
                  bullets: [] 
                }]);
                setSkills([{ 
                  name: "Technical Skills", 
                  skills: [""] 
                }]);
                setProjects([{ 
                  title: "", 
                  subtitle: "", 
                  date: "", 
                  description: "", 
                  bullets: [""] 
                }]);
                setActiveSection("personal-info");
                setProgress(16.67);
                
                toast({
                  title: "Reset Complete",
                  description: "Started a new resume from scratch.",
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button 
              size="sm"
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
            >
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
        <div className="flex justify-between mt-4">
          <Button 
            variant="default" 
            className="gap-2"
            onClick={handleSaveResume}
          >
            Save to Dashboard
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowPreviewDialog(true)}
          >
            <Eye className="w-4 h-4" />
            Preview Resume
          </Button>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 py-4 grid grid-cols-1 md:grid-cols-[1fr,300px] gap-6">
        <Card className="p-6">
          {renderSectionContent()}
          <div className="flex items-center justify-between mt-12">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => navigateToSection('previous')}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2 px-6 py-3 bg-[#f9f9fa] rounded-full">
              <span className="text-[#7f8c8d]">Current ATS Score:</span>
              <span className={cn(
                "font-semibold",
                atsScore < 50 ? "text-[#e74c3c]" : 
                atsScore < 75 ? "text-[#f39c12]" : "text-[#2ecc71]"
              )}>
                {atsScore}/100
              </span>
              <button 
                className="text-xs text-[#3498db] bg-[#f0f7ff] px-3 py-1 rounded-full"
                onClick={() => {
                  // Show improvement suggestions based on current section
                  const messages = [];
                  
                  switch (activeSection) {
                    case "personal-info":
                      if (!personalInfo.name || !personalInfo.email || !personalInfo.phone) {
                        messages.push("Complete all basic contact information");
                      }
                      if (!personalInfo.linkedin) {
                        messages.push("Add your LinkedIn profile URL");
                      }
                      break;
                    case "professional-summary":
                      if (!professionalSummary) {
                        messages.push("Add a professional summary");
                      } else if (professionalSummary.length < 100) {
                        messages.push("Expand your professional summary with more details");
                      }
                      break;
                    case "work-experience":
                      if (!workExperience[0].title) {
                        messages.push("Add at least one work experience entry");
                      } else if (!workExperience[0].bullets[0]) {
                        messages.push("Include bullet points for your work achievements");
                      }
                      break;
                    case "education":
                      if (!education[0].title) {
                        messages.push("Add your educational background");
                      }
                      break;
                    case "skills":
                      if (!skills[0].skills[0]) {
                        messages.push("List relevant skills for your target positions");
                      }
                      break;
                    case "projects":
                      if (!projects[0].title) {
                        messages.push("Add relevant projects or certifications");
                      }
                      break;
                  }
                  
                  if (messages.length > 0) {
                    toast({
                      title: "ATS Score Improvement Tips",
                      description: (
                        <ul className="list-disc pl-5 mt-2">
                          {messages.map((msg, i) => (
                            <li key={i}>{msg}</li>
                          ))}
                        </ul>
                      ),
                    });
                  } else {
                    toast({
                      title: "Great job!",
                      description: "This section looks good. Continue completing other sections to improve your overall score.",
                    });
                  }
                }}
              >
                Improve Score
              </button>
            </div>
            <Button 
              className="gap-2"
              onClick={() => navigateToSection('next')}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-center font-bold text-[#2c3e50] mb-4">AI Assistant</h3>
          <p className="text-center text-sm text-[#7f8c8d] mb-4">Ask for help with any section</p>
          <div className="bg-[#f9f9fa] rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div className="text-sm text-[#aaaaaa]">
                  Type your question<br />or select a suggestion
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index}
                  className={cn(
                    "mb-3 p-3 rounded-lg max-w-[90%]",
                    message.type === 'user' 
                      ? "bg-[#4f8df9] text-white self-end" 
                      : "bg-white border self-start"
                  )}
                >
                  {message.content}
                </div>
              ))
            )}
            {isProcessingAiRequest && (
              <div className="self-start bg-white border rounded-lg p-3 mb-3">
                <div className="flex gap-2 items-center">
                  <div className="w-2 h-2 bg-[#4f8df9] rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-[#4f8df9] rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-[#4f8df9] rounded-full animate-pulse delay-200"></div>
                  <span className="text-[#7f8c8d] text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2 mt-4">
            {[
              "Write a professional bio", 
              "Format my phone number", 
              "How to describe my experience"
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="w-full px-4 py-2 rounded-full text-xs text-[#4f8df9] bg-[#f0f7ff] border border-[#4f8df9]"
                onClick={() => handleSuggestionClick(suggestion)}
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
              value={assistantQuestion}
              onChange={(e) => setAssistantQuestion(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAskAssistant();
                }
              }}
            />
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#4f8df9] text-white rounded-full flex items-center justify-center"
              onClick={handleAskAssistant}
              disabled={isProcessingAiRequest || !assistantQuestion.trim()}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </div>
      
      {/* Upload Resume Dialog */}
      {showUploadDialog && (
        <ResumeUploadDialog
          open={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          onFileUploaded={async (file) => {
            try {
              // Create a FormData object
              const formData = new FormData();
              formData.append('resume', file);

              // Upload the file to the server
              const response = await fetch('/api/resumes', {
                method: 'POST',
                body: formData,
                credentials: 'include',
              });

              if (!response.ok) {
                throw new Error('Failed to upload resume');
              }

              // Get the response data
              const resumeData = await response.json();
              
              // Parse the resume content and populate form fields
              if (resumeData.sections) {
                // Extract data from the parsed resume
                const data = resumeData.sections;
                
                // Populate personal info if available
                if (resumeData.personalInfo) {
                  setPersonalInfo({
                    name: resumeData.personalInfo.name || '',
                    email: resumeData.personalInfo.email || '',
                    phone: resumeData.personalInfo.phone || '',
                    location: resumeData.personalInfo.location || '',
                    linkedin: resumeData.personalInfo.linkedin || '',
                    portfolio: resumeData.personalInfo.portfolio || '',
                    github: resumeData.personalInfo.github || ''
                  });
                }
                
                type SectionWithId = { id: string, [key: string]: any };
                // Populate professional summary
                const summarySection = data.find((s: SectionWithId) => s.id === 'professional-summary');
                if (summarySection?.content) {
                  setProfessionalSummary(summarySection.content);
                }
                
                // Populate work experience
                const experienceSection = data.find((s: SectionWithId) => s.id === 'work-experience');
                if (experienceSection?.items && experienceSection.items.length > 0) {
                  setWorkExperience(experienceSection.items.map((item: any) => ({
                    title: item.title || '',
                    subtitle: item.subtitle || '',
                    date: item.date || '',
                    description: item.description || '',
                    bullets: item.bullets || ['']
                  })));
                }
                
                // Populate education
                const educationSection = data.find((s: SectionWithId) => s.id === 'education');
                if (educationSection?.items && educationSection.items.length > 0) {
                  setEducation(educationSection.items.map((item: any) => ({
                    title: item.title || '',
                    subtitle: item.subtitle || '',
                    date: item.date || '',
                    description: item.description || '',
                    bullets: item.bullets || []
                  })));
                }
                
                // Populate skills
                const skillsSection = data.find((s: SectionWithId) => s.id === 'skills');
                if (skillsSection?.categories && skillsSection.categories.length > 0) {
                  setSkills(skillsSection.categories.map((cat: any) => ({
                    name: cat.name || 'Technical Skills',
                    skills: cat.skills && cat.skills.length > 0 ? cat.skills : ['']
                  })));
                }
                
                // Populate projects
                const projectsSection = data.find((s: SectionWithId) => s.id === 'projects');
                if (projectsSection?.items && projectsSection.items.length > 0) {
                  setProjects(projectsSection.items.map((item: any) => ({
                    title: item.title || '',
                    subtitle: item.subtitle || '',
                    date: item.date || '',
                    description: item.description || '',
                    bullets: item.bullets || ['']
                  })));
                }

                // Also check for any certifications and add them to projects section
                const certificationsSection = data.find((s: SectionWithId) => s.id === 'certifications');
                if (certificationsSection?.items && certificationsSection.items.length > 0) {
                  // Add certifications to projects array (since they're combined in the UI)
                  setProjects(prev => [
                    ...prev,
                    ...certificationsSection.items.map((item: any) => ({
                      title: item.title || '',
                      subtitle: item.subtitle || '',
                      date: item.date || '',
                      description: item.description || 'Certification',
                      bullets: item.bullets || ['']
                    }))
                  ]);
                }
              }
              
              toast({
                title: "Resume Uploaded",
                description: "Resume content has been loaded into the builder",
              });
              
              // Close the dialog
              setShowUploadDialog(false);
            } catch (error) {
              toast({
                title: "Upload Failed",
                description: error instanceof Error ? error.message : "Failed to upload resume",
                variant: "destructive",
              });
            }
          }}
        />
      )}
      
      {/* Preview Resume Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resume Preview</DialogTitle>
            <DialogDescription>
              Here's how your resume will look when exported.
            </DialogDescription>
          </DialogHeader>
          {generateResumePreview()}
        </DialogContent>
      </Dialog>
    </div>
  );
}