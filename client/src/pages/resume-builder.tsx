import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Plus, Download, Send, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Interface for each resume section in state */
interface ResumeSection {
  id: string;
  title: string;
  content?: string;
  items?: Array<{
    title: string;
    subtitle: string;
    date: string;
    description: string;
    bullets: string[];
  }>;
}

export default function ResumeBuilder() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Personal info state
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
  });

  // Sections state
  const [sections, setSections] = useState<ResumeSection[]>([
    { id: "summary", title: "Professional Summary", content: "" },
    { id: "experience", title: "Work Experience", items: [] },
    { id: "education", title: "Education", items: [] },
    { id: "skills", title: "Skills", content: "" },
    { id: "projects", title: "Projects", items: [] },
    { id: "certifications", title: "Certifications", items: [] },
  ]);

  /**
   * 1. Handle uploading + parsing resume via /api/ai-resume-parser
   */
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      toast({
        title: "Processing Resume",
        description: "Your resume is being analyzed by AI...",
      });

      const response = await fetch("/api/ai-resume-parser", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to parse resume (${response.status})`);
      }

      const data = await response.json();
      // data shape: { name, email, phone, location, linkedin, sections: [...] }

      // Update personal info from top-level fields
      setPersonalInfo({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        location: data.location || "",
        linkedin: data.linkedin || "",
      });

      // Map the returned data.sections[] to our front-end sections
      const updatedSections = sections.map((section) => {
        const matchedServerSection = data.sections.find(
          (serverSec: any) => serverSec.id === section.id,
        );
        if (!matchedServerSection) {
          return section;
        }

        // If it's a simple "content" section
        if (section.id === "summary" || section.id === "skills") {
          return {
            ...section,
            content: matchedServerSection.content || "",
          };
        }

        // If it's an "experience" section with items
        if (section.id === "experience") {
          return {
            ...section,
            items: (matchedServerSection.items || []).map((exp: any) => ({
              title: exp.title || "",
              subtitle: exp.company || "",
              date: exp.dates || "",
              description: "",
              bullets: exp.responsibilities || [],
            })),
          };
        }

        // If it's an "education" section
        if (section.id === "education") {
          return {
            ...section,
            items: (matchedServerSection.items || []).map((edu: any) => ({
              title: edu.degree || "",
              subtitle: edu.institution || "",
              date: edu.dates || "",
              description: "",
              bullets: edu.courses || [],
            })),
          };
        }

        // If it's a "projects" section
        if (section.id === "projects") {
          return {
            ...section,
            items: (matchedServerSection.items || []).map((proj: any) => ({
              title: proj.name || "",
              subtitle: proj.technologies || "",
              date: "", // or proj.date if provided
              description: proj.focus || "",
              bullets: [],
            })),
          };
        }

        // If it's a "certifications" section
        if (section.id === "certifications") {
          return {
            ...section,
            items: (matchedServerSection.items || []).map((cert: any) => ({
              title: cert.name || "",
              subtitle: "",
              date: "",
              description: "",
              bullets: [],
            })),
          };
        }

        return section;
      });

      setSections(updatedSections);

      // Provide an AI message after populating
      setAiMessage(
        "I've analyzed your resume and populated all sections. Select any section to make edits or request AI improvements.",
      );

      toast({
        title: "Resume Parsed Successfully",
        description:
          "All sections have been populated. Review and edit as needed.",
      });
    } catch (error) {
      console.error("Error parsing resume:", error);
      toast({
        title: "Parsing Failed",
        description:
          "Unable to process your resume. Please try again or enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 2. Start a brand-new resume
   */
  const handleNewResume = () => {
    setPersonalInfo({
      name: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
    });
    setSections((prevSections) =>
      prevSections.map((section) => ({
        ...section,
        content: "",
        items: section.items ? [] : undefined,
      })),
    );
    setAiMessage(
      "Start by uploading a resume or entering your information manually.",
    );
    // We do NOT change activeSection here, so if you want it reset, setActiveSection(null)
  };

  // Get the content of current section for AI analysis
  const getCurrentSectionContent = useCallback(() => {
    if (!activeSection) return "";

    const section = sections.find(s => s.id === activeSection);
    if (!section) return "";

    if (section.content !== undefined) {
      return section.content;
    } else if (section.items) {
      return section.items.map(item => {
        const bullets = item.bullets || [];
        return `${item.title}\n${item.subtitle}\n${item.date}\n${item.description}\n${bullets.join("\n")}`;
      }).join("\n\n");
    }
    return "";
  }, [activeSection, sections]);

  // Auto-analyze section when selected
  useEffect(() => {
    if (activeSection) {
      getAiSuggestions(activeSection, "Please analyze this section and suggest improvements.");
    }
  }, [activeSection, getAiSuggestions]);

  // Get AI suggestions
  const getAiSuggestions = useCallback(async (sectionId: string, userQuery?: string) => {
    setIsAiLoading(true);
    try {
      const sectionContent = getCurrentSectionContent();

      const response = await fetch("/api/resume-ai-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectionId,
          sectionContent,
          userQuery
        }),
      });

      if (!response.ok) throw new Error("Failed to get AI suggestions");

      const data = await response.json();
      setAiMessage(data.suggestions);

    } catch (error) {
      console.error("AI suggestion error:", error);
      toast({
        title: "AI Assistant Error",
        description: "Failed to get AI suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  }, [getCurrentSectionContent, toast]);


  /**
   * 4. Helper functions to modify sections on the fly
   */
  const addSectionItem = (sectionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId && section.items) {
          return {
            ...section,
            items: [
              ...section.items,
              {
                title: "",
                subtitle: "",
                date: "",
                description: "",
                bullets: [],
              },
            ],
          };
        }
        return section;
      }),
    );
  };

  const removeSectionItem = (sectionId: string, itemIndex: number) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId && section.items) {
          return {
            ...section,
            items: section.items.filter((_, idx) => idx !== itemIndex),
          };
        }
        return section;
      }),
    );
  };

  const addBulletPoint = (sectionId: string, itemIndex: number) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId && section.items) {
          const newItems = [...section.items];
          newItems[itemIndex] = {
            ...newItems[itemIndex],
            bullets: [...newItems[itemIndex].bullets, ""],
          };
          return { ...section, items: newItems };
        }
        return section;
      }),
    );
  };

  const handleAiChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSection || !aiInput.trim()) return;
    await getAiSuggestions(activeSection, aiInput);
    setAiInput("");
  };

  /**
   * 5. Render the component
   */
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Resume Builder</h1>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pdf,.doc,.docx,.txt";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileUpload(file);
                };
                input.click();
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Resume
            </Button>
            <Button variant="outline" onClick={handleNewResume}>
              <Plus className="w-4 h-4 mr-2" />
              New Resume
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Main layout with split view */}
        <div className="grid grid-cols-[240px_1fr_600px] gap-6">
          {/* Left sidebar */}
          <Card className="h-fit sticky top-6">
            <CardContent className="p-4">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full text-left px-4 py-2 rounded-md transition-colors relative",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  {section.title}
                  {activeSection === section.id && (
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Center content area - Scrollable */}
          <ScrollArea className="h-[calc(100vh-8rem)]" ref={contentRef}>
            <div className="space-y-6 pr-4">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Full Name"
                      value={personalInfo.name}
                      onChange={(e) =>
                        setPersonalInfo((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) =>
                        setPersonalInfo((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Phone"
                      value={personalInfo.phone}
                      onChange={(e) =>
                        setPersonalInfo((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Location"
                      value={personalInfo.location}
                      onChange={(e) =>
                        setPersonalInfo((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="LinkedIn URL"
                      value={personalInfo.linkedin}
                      onChange={(e) =>
                        setPersonalInfo((prev) => ({
                          ...prev,
                          linkedin: e.target.value,
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Resume Sections */}
              {sections.map((section) => (
                <Card key={section.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{section.title}</CardTitle>
                    {section.items && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSectionItem(section.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Entry
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {section.items ? (
                      <div className="space-y-4">
                        {section.items.map((item, index) => (
                          <div
                            key={index}
                            className="space-y-4 p-4 border rounded-lg relative"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => removeSectionItem(section.id, index)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <Input
                              placeholder={`${section.title} Title`}
                              value={item.title}
                              onChange={(e) =>
                                setSections((prev) =>
                                  prev.map((s) =>
                                    s.id === section.id && s.items
                                      ? {
                                          ...s,
                                          items: s.items.map((i, idx) =>
                                            idx === index
                                              ? { ...i, title: e.target.value }
                                              : i
                                          ),
                                        }
                                      : s
                                  )
                                )
                              }
                            />
                            <Input
                              placeholder="Organization/Company"
                              value={item.subtitle}
                              onChange={(e) =>
                                setSections((prev) =>
                                  prev.map((s) =>
                                    s.id === section.id && s.items
                                      ? {
                                          ...s,
                                          items: s.items.map((i, idx) =>
                                            idx === index
                                              ? { ...i, subtitle: e.target.value }
                                              : i
                                          ),
                                        }
                                      : s
                                  )
                                )
                              }
                            />
                            <Input
                              placeholder="Date Range"
                              value={item.date}
                              onChange={(e) =>
                                setSections((prev) =>
                                  prev.map((s) =>
                                    s.id === section.id && s.items
                                      ? {
                                          ...s,
                                          items: s.items.map((i, idx) =>
                                            idx === index
                                              ? { ...i, date: e.target.value }
                                              : i
                                          ),
                                        }
                                      : s
                                  )
                                )
                              }
                            />
                            <Textarea
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) =>
                                setSections((prev) =>
                                  prev.map((s) =>
                                    s.id === section.id && s.items
                                      ? {
                                          ...s,
                                          items: s.items.map((i, idx) =>
                                            idx === index
                                              ? {
                                                  ...i,
                                                  description: e.target.value,
                                                }
                                              : i
                                          ),
                                        }
                                      : s
                                  )
                                )
                              }
                            />
                            {/* Bullet points */}
                            <div className="space-y-2">
                              {(item.bullets || []).map((bullet, bulletIndex) => (
                                <Input
                                  key={bulletIndex}
                                  value={bullet}
                                  placeholder="Bullet point"
                                  onChange={(e) =>
                                    setSections((prev) =>
                                      prev.map((s) =>
                                        s.id === section.id && s.items
                                          ? {
                                              ...s,
                                              items: s.items.map((i, idx) =>
                                                idx === index
                                                  ? {
                                                      ...i,
                                                      bullets: i.bullets.map(
                                                        (b, bidx) =>
                                                          bidx === bulletIndex
                                                            ? e.target.value
                                                            : b
                                                      ),
                                                    }
                                                  : i
                                              ),
                                            }
                                          : s
                                      )
                                    )
                                  }
                                />
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addBulletPoint(section.id, index)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Bullet Point
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Textarea
                        value={section.content}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === section.id
                                ? { ...s, content: e.target.value }
                                : s
                            )
                          )
                        }
                        placeholder={`Enter your ${section.title.toLowerCase()}...`}
                        className="min-h-[120px]"
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Right side - AI Assistant (Fixed position) */}
          <Card className="sticky top-6 h-[calc(100vh-8rem)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                AI Assistant
                {isAiLoading && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (Thinking...)
                  </span>
                )}
                {activeSection && (
                  <span className="text-sm text-muted-foreground ml-2">
                    - {sections.find(s => s.id === activeSection)?.title}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-full flex flex-col">
              <ScrollArea className="flex-grow p-4">
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    {aiMessage || (
                      activeSection 
                        ? "Analyzing your content..."
                        : "Select a section to get AI assistance and suggestions."
                    )}
                  </div>
                </div>
              </ScrollArea>
              <form onSubmit={handleAiChat} className="p-4 border-t flex gap-2">
                <Input
                  placeholder={
                    activeSection 
                      ? "Ask for suggestions or improvements..." 
                      : "Select a section first..."
                  }
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  disabled={!activeSection || isAiLoading}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isAiLoading || !activeSection || !aiInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}