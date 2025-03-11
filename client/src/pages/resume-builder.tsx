import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Send, Download, Plus, Upload, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@radix-ui/react-select'
import ResumeUploadDialog from "@/components/resume-upload-dialog";

interface Section {
  id: string;
  title: string;
  content: string;
  items?: Array<{
    title?: string;
    subtitle?: string;
    date?: string;
    description?: string;
    bullets?: string[];
  }>;
}

interface AIEnhancement {
  enhancedContent: string;
  suggestions: string[];
  explanation: string;
}

export default function ResumeBuilder() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<string>("");
  const [chatMessage, setChatMessage] = useState("");
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: ""
  });

  const [sections, setSections] = useState<Section[]>([
    {
      id: "summary",
      title: "Professional Summary",
      content: "",
      items: []
    },
    {
      id: "experience",
      title: "Work Experience",
      content: "",
      items: []
    },
    {
      id: "education",
      title: "Education",
      content: "",
      items: []
    },
    {
      id: "skills",
      title: "Skills",
      content: "",
      items: []
    },
    {
      id: "projects",
      title: "Projects",
      content: "",
      items: []
    },
    {
      id: "certifications",
      title: "Certifications",
      content: "",
      items: []
    }
  ]);

  const [messages, setMessages] = useState<Array<{ type: 'assistant' | 'user'; content: string }>>([
    {
      type: 'assistant',
      content: 'I can help you build a professional resume. Select any section to get started, or ask me for suggestions.'
    }
  ]);

  // Fetch existing resumes
  const { data: existingResumes } = useQuery<{ id: number; title: string }[]>({
    queryKey: ['/api/resumes'],
  });

  // Populate data from selected resume
  const populateFromResume = async (resumeId: number) => {
    try {
      const response = await apiRequest("GET", `/api/resumes/${resumeId}`);
      const resumeData = await response.json();

      if (resumeData.content) {
        try {
          const parsed = JSON.parse(resumeData.content);

          // Populate personal info if available
          if (parsed.personalInfo) {
            setPersonalInfo({
              name: parsed.personalInfo.name || "",
              email: parsed.personalInfo.email || "",
              phone: parsed.personalInfo.phone || "",
              location: parsed.personalInfo.location || "",
              linkedin: parsed.personalInfo.linkedin || ""
            });
          }

          // Populate sections if available
          if (parsed.sections && Array.isArray(parsed.sections)) {
            const newSections = sections.map(section => {
              const matchingSection = parsed.sections.find((s: Section) => s.id === section.id);
              if (matchingSection) {
                return {
                  ...section,
                  content: matchingSection.content || "",
                  items: matchingSection.items || []
                };
              }
              return section;
            });
            setSections(newSections);
          }

          toast({
            title: "Resume Loaded",
            description: "Your existing resume has been loaded into the builder"
          });
        } catch (e) {
          // If parsing fails, try to use content as summary
          setSections(prev => prev.map(section =>
            section.id === "summary"
              ? { ...section, content: resumeData.content }
              : section
          ));
        }
      }
    } catch (error) {
      toast({
        title: "Error Loading Resume",
        description: "Failed to load the selected resume",
        variant: "destructive"
      });
    }
  };

  const enhanceMutation = useMutation({
    mutationFn: async (data: { sectionId: string, content: string }) => {
      return apiRequest("POST", "/api/resumes/enhance", data).then(r => r.json());
    },
    onSuccess: (data, variables) => {
      const updatedSections = sections.map(section => {
        if (section.id === variables.sectionId) {
          return { ...section, content: data.enhancedContent };
        }
        return section;
      });
      setSections(updatedSections);
      toast({
        title: "Section Enhanced",
        description: "Your content has been improved by AI"
      });
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { content: string; sectionType: string }) => {
      return apiRequest("POST", "/api/resumes/analyze", data).then(r => r.json());
    },
    onSuccess: (data: AIEnhancement) => {
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: data.explanation
        }
      ]);
      setCurrentSuggestions(data.suggestions);
      toast({
        title: "Analysis Complete",
        description: "Review the suggestions and click to apply them"
      });
    }
  });

  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAssistantMinimized, setIsAssistantMinimized] = useState(false);


  const handleGeneratePDF = async () => {
    try {
      // Prepare the resume data
      const resumeData = {
        personalInfo,
        sections
      };

      // Create a new resume with the builder data
      const response = await apiRequest("POST", "/api/resumes", {
        title: `${personalInfo.name}'s Resume`,
        content: JSON.stringify(resumeData),
        fileType: "application/json"
      });

      const { id } = await response.json();

      // Redirect to the PDF download endpoint
      window.location.href = `/api/resumes/${id}/download-pdf`;

      toast({
        title: "Success",
        description: "Your resume PDF is being generated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  const addSectionItem = (sectionId: string) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: [
            ...(section.items || []),
            { title: "", subtitle: "", date: "", description: "", bullets: [] }
          ]
        };
      }
      return section;
    }));
  };

  const updateSectionItem = (sectionId: string, itemIndex: number, field: string, value: string) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId && section.items) {
        const newItems = [...section.items];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        return { ...section, items: newItems };
      }
      return section;
    }));
  };

  const addBulletPoint = (sectionId: string, itemIndex: number) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId && section.items) {
        const newItems = [...section.items];
        newItems[itemIndex].bullets = [...(newItems[itemIndex].bullets || []), ""];
        return { ...section, items: newItems };
      }
      return section;
    }));
  };

  const updateBulletPoint = (sectionId: string, itemIndex: number, bulletIndex: number, value: string) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId && section.items) {
        const newItems = [...section.items];
        newItems[itemIndex].bullets![bulletIndex] = value;
        return { ...section, items: newItems };
      }
      return section;
    }));
  };

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    const section = sections.find(s => s.id === sectionId);

    if (section) {
      setIsAnalyzing(true);
      analyzeMutation.mutate({
        content: section.content || JSON.stringify(section.items),
        sectionType: sectionId
      });

      setMessages(prev => [...prev, {
        type: 'assistant',
        content: `Analyzing your ${section.title.toLowerCase()}. I'll provide specific suggestions to enhance this section...`
      }]);
    }
  };

  const applySuggestion = (suggestion: string) => {
    if (activeSection) {
      enhanceMutation.mutate({
        sectionId: activeSection,
        content: suggestion
      });
    }
  };

  const handleSendMessage = async () => {
    if (chatMessage.trim()) {
      setMessages(prev => [...prev, { type: 'user', content: chatMessage }]);

      if (activeSection) {
        analyzeMutation.mutate({
          content: chatMessage,
          sectionType: activeSection
        });
      }

      setChatMessage("");
    }
  };

  // Improved file upload function with better error handling and structure adaptability
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/resumes/parse', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to parse resume');
      }

      const parsedData = await response.json();

      // Debug the structure of parsed data
      console.log('Parsed resume data:', parsedData);

      // Flexible handling of personal information
      // Try different possible paths to find personal info
      if (parsedData) {
        // Update personal information with improved validation and flexible path finding
        const personalInfoData = parsedData.personalInfo || parsedData.personal || parsedData.contact || parsedData;

        if (personalInfoData) {
          const updatedPersonalInfo = {
            name: personalInfoData.name || personalInfoData.fullName || "",
            email: personalInfoData.email || personalInfoData.emailAddress || "",
            phone: personalInfoData.phone || personalInfoData.phoneNumber || personalInfoData.telephone || "",
            location: personalInfoData.location || personalInfoData.address || "",
            linkedin: personalInfoData.linkedin || personalInfoData.linkedInUrl || ""
          };

          console.log('Updating personal info with:', updatedPersonalInfo);
          setPersonalInfo(updatedPersonalInfo);
        }

        // Create a more flexible approach to handling sections
        const newSections = [...sections];

        // Function to extract array data safely
        const extractArray = (data: any, paths: string[]): any[] => {
          for (const path of paths) {
            const value = path.split('.').reduce((obj, key) => obj && obj[key], data);
            if (Array.isArray(value) && value.length > 0) {
              return value;
            }
          }
          return [];
        };

        // Function to extract string data safely
        const extractString = (data: any, paths: string[]): string => {
          for (const path of paths) {
            const value = path.split('.').reduce((obj, key) => obj && obj[key], data);
            if (typeof value === 'string' && value.trim()) {
              return value;
            }
          }
          return '';
        };

        // Handle summary section
        const summaryText = extractString(
          parsedData, 
          ['summary', 'professionalSummary', 'profile', 'about', 'objective', 'sections.summary.content']
        );

        if (summaryText) {
          const summaryIndex = newSections.findIndex(s => s.id === "summary");
          if (summaryIndex !== -1) {
            newSections[summaryIndex] = {
              ...newSections[summaryIndex],
              content: summaryText
            };
          }
        }

        // Handle work experience
        const workExperience = extractArray(
          parsedData, 
          ['workExperience', 'experience', 'employment', 'jobs', 'sections.experience.items']
        );

        if (workExperience.length > 0) {
          const experienceIndex = newSections.findIndex(s => s.id === "experience");
          if (experienceIndex !== -1) {
            newSections[experienceIndex] = {
              ...newSections[experienceIndex],
              items: workExperience.map(item => ({
                title: item.jobTitle || item.title || item.position || "",
                subtitle: item.company || item.employer || item.organization || "",
                date: `${item.startDate || item.from || ""} - ${item.endDate || item.to || item.current ? "Present" : ""}`,
                description: item.description || item.summary || "",
                bullets: Array.isArray(item.responsibilities || item.achievements || item.duties || item.bulletPoints) 
                  ? (item.responsibilities || item.achievements || item.duties || item.bulletPoints)
                  : []
              }))
            };
          }
        }

        // Handle education
        const education = extractArray(
          parsedData,
          ['education', 'educationHistory', 'academic', 'sections.education.items']
        );

        if (education.length > 0) {
          const educationIndex = newSections.findIndex(s => s.id === "education");
          if (educationIndex !== -1) {
            newSections[educationIndex] = {
              ...newSections[educationIndex],
              items: education.map(item => ({
                title: item.degree || item.qualification || item.title || "",
                subtitle: item.institution || item.school || item.university || "",
                date: `${item.startDate || item.from || ""} - ${item.endDate || item.to || ""}`,
                description: item.description || item.summary || "",
                bullets: Array.isArray(item.achievements || item.courses || item.activities || item.details)
                  ? (item.achievements || item.courses || item.activities || item.details)
                  : []
              }))
            };
          }
        }

        // Handle skills
        const skills = extractArray(
          parsedData,
          ['skills', 'skillSet', 'expertise', 'sections.skills.items']
        );

        if (skills.length > 0) {
          const skillsIndex = newSections.findIndex(s => s.id === "skills");
          if (skillsIndex !== -1) {
            // Check if skills is an array of strings or an array of objects
            if (typeof skills[0] === 'string') {
              newSections[skillsIndex] = {
                ...newSections[skillsIndex],
                content: skills.join(", ")
              };
            } else {
              newSections[skillsIndex] = {
                ...newSections[skillsIndex],
                items: skills.map(item => {
                  if (typeof item === 'string') {
                    return {
                      title: item,
                      subtitle: "",
                      description: ""
                    };
                  } else {
                    return {
                      title: item.name || item.category || item.title || "",
                      subtitle: "",
                      description: Array.isArray(item.skills) 
                        ? item.skills.join(", ") 
                        : (item.description || "")
                    };
                  }
                })
              };
            }
          }
        } else {
          // Try to find skills as a single string
          const skillsString = extractString(
            parsedData,
            ['skillsText', 'skillsSummary', 'sections.skills.content']
          );

          if (skillsString) {
            const skillsIndex = newSections.findIndex(s => s.id === "skills");
            if (skillsIndex !== -1) {
              newSections[skillsIndex] = {
                ...newSections[skillsIndex],
                content: skillsString
              };
            }
          }
        }

        // Handle projects
        const projects = extractArray(
          parsedData,
          ['projects', 'portfolio', 'works', 'sections.projects.items']
        );

        if (projects.length > 0) {
          const projectsIndex = newSections.findIndex(s => s.id === "projects");
          if (projectsIndex !== -1) {
            newSections[projectsIndex] = {
              ...newSections[projectsIndex],
              items: projects.map(item => ({
                title: item.name || item.title || "",
                subtitle: item.technologies || item.tools || item.subtitle || "",
                date: item.duration || item.date || item.period || "",
                description: item.description || item.summary || "",
                bullets: Array.isArray(item.highlights || item.details || item.achievements || item.bulletPoints)
                  ? (item.highlights || item.details || item.achievements || item.bulletPoints)
                  : []
              }))
            };
          }
        }

        // Handle certifications
        const certifications = extractArray(
          parsedData,
          ['certifications', 'certificates', 'qualifications', 'sections.certifications.items']
        );

        if (certifications.length > 0) {
          const certificationsIndex = newSections.findIndex(s => s.id === "certifications");
          if (certificationsIndex !== -1) {
            newSections[certificationsIndex] = {
              ...newSections[certificationsIndex],
              items: certifications.map(item => ({
                title: item.name || item.title || "",
                subtitle: item.issuer || item.authority || item.organization || "",
                date: item.issueDate || item.date || item.year || "",
                description: item.description || item.summary || "",
                bullets: Array.isArray(item.details || item.skills || item.bulletPoints)
                  ? (item.details || item.skills || item.bulletPoints)
                  : []
              }))
            };
          }
        }

        console.log('Updating sections with:', newSections);
        setSections(newSections);
      }

      toast({
        title: "Resume Parsed Successfully",
        description: "Your resume has been analyzed and sections have been populated. Please review and edit as needed."
      });
    } catch (error) {
      console.error('Error parsing resume:', error);
      toast({
        title: "Parsing Failed",
        description: error instanceof Error ? error.message : "Failed to parse resume. Please try again or enter details manually.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6 h-[calc(100vh-48px)]">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Resume Builder</h1>
          <div className="flex gap-3">
            <ResumeUploadDialog
              onResumeSelected={populateFromResume}
              onFileUploaded={handleFileUpload}
            />
            <Button 
              variant="outline" 
              onClick={() => {
                setSections(sections.map(s => ({ ...s, content: "", items: [] })));
                setPersonalInfo({
                  name: "",
                  email: "",
                  phone: "",
                  location: "",
                  linkedin: ""
                });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Resume
            </Button>
            <Button onClick={handleGeneratePDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[240px_1fr] gap-6 h-[calc(100vh-48px)]">
          <Card className="h-fit">
            <CardContent className="p-4">
              {sections.map((section) => (
                <div
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={cn(
                    "py-3 px-4 my-1 cursor-pointer rounded-lg border-l-2 font-medium transition-all",
                    activeSection === section.id
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent hover:bg-gray-50"
                  )}
                >
                  {section.title}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="text-center mb-8">
              <Input
                value={personalInfo.name}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Full Name"
                className="text-3xl font-bold mb-2 text-center"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="text-center"
                />
                <Input
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone"
                  className="text-center"
                />
                <Input
                  value={personalInfo.location}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Location"
                  className="text-center"
                />
                <Input
                  value={personalInfo.linkedin}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="LinkedIn URL"
                  className="text-center"
                />
              </div>
            </div>

            {sections.map((section) => (
              <div
                key={section.id}
                className={cn(
                  "p-6 rounded-lg transition-all border",
                  activeSection === section.id
                    ? "border-2 border-blue-500 bg-blue-50/30"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <h2 className="text-xl font-semibold border-b pb-2 mb-4">
                  {section.title}
                </h2>

                {section.id === "summary" ? (
                  <Textarea
                    value={section.content}
                    onChange={(e) => setSections(prev =>
                      prev.map(s => s.id === section.id ? { ...s, content: e.target.value } : s)
                    )}
                    placeholder="Write a compelling professional summary..."
                    className="min-h-[120px]"
                  />
                ) : (
                  <div className="space-y-6">
                    {section.items?.map((item, itemIndex) => (
                      <div key={itemIndex} className="p-4 border rounded-lg bg-white/50">
                        <div className="space-y-3">
                          <Input
                            value={item.title}
                            onChange={(e) => updateSectionItem(section.id, itemIndex, 'title', e.target.value)}
                            placeholder={`${section.title} Title`}
                            className="font-semibold text-lg"
                          />
                          <div className="flex gap-4">
                            <Input
                              value={item.subtitle}
                              onChange={(e) => updateSectionItem(section.id, itemIndex, 'subtitle', e.target.value)}
                              placeholder="Organization/Company"
                              className="italic flex-1"
                            />
                            <Input
                              value={item.date}
                              onChange={(e) => updateSectionItem(section.id, itemIndex, 'date', e.target.value)}
                              placeholder="Date Range"
                              className="w-48"
                            />
                          </div>
                          <div className="pl-5 space-y-2">
                            {item.bullets?.map((bullet, bulletIndex) => (
                              <div key={bulletIndex} className="flex gap-2 items-start">
                                <span className="mt-2.5">•</span>
                                <Input
                                  value={bullet}
                                  onChange={(e) => updateBulletPoint(section.id, itemIndex, bulletIndex, e.target.value)}
                                  placeholder="Add accomplishment or responsibility..."
                                  className="flex-1"
                                />
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addBulletPoint(section.id, itemIndex)}
                              className="ml-4"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Bullet Point
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => addSectionItem(section.id)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add {section.title} Entry
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Card className={cn(
            "transition-all duration-300",
            isAssistantMinimized ? "h-[48px]" : "h-[55vh]"
          )}>
            <CardHeader className="py-3 px-6 border-b flex flex-row justify-between items-center">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                AI Assistant {isAnalyzing && "(Analyzing...)"}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAssistantMinimized(!isAssistantMinimized)}
                className="ml-auto"
              >
                {isAssistantMinimized ? (
                  <ArrowUpWideNarrow className="h-4 w-4" />
                ) : (
                  <ArrowDownWideNarrow className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            {!isAssistantMinimized && (
              <CardContent className="p-0 flex flex-col h-[calc(100%-57px)]">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          "max-w-[85%] rounded-xl p-3",
                          message.type === "assistant"
                            ? "bg-gray-100 text-gray-800 mr-auto"
                            : "bg-blue-500 text-white ml-auto"
                        )}
                      >
                        {message.content}
                      </div>
                    ))}
                    {currentSuggestions.length > 0 && (
                      <div className="bg-gray-100 rounded-xl p-4 space-y-2">
                        <p className="font-medium text-sm text-gray-700">Suggested Improvements:</p>
                        {currentSuggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="w-full text-left justify-start h-auto py-2 px-3"
                            onClick={() => applySuggestion(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t flex gap-3">
                  <Textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder={
                      activeSection
                        ? "Ask for specific improvements or suggestions..."
                        : "Select a section to get started..."
                    }
                    className="flex-1 resize-none h-14"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="h-14 w-14 p-0"
                    disabled={!activeSection}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}