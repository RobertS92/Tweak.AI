import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Plus, Download, Send, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Interface for section items */
interface SectionItem {
  title: string;
  subtitle: string;
  date: string;
  description: string;
  bullets: string[];
  content?: string; // Added content property
}

/** Interface for each resume section */
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
}

export default function ResumeBuilder() {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  // Core states
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState("");

  // Personal info state
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
  });

  // Resume sections state with proper initialization
  const [sections, setSections] = useState<ResumeSection[]>([
    { id: "professional-summary", title: "Professional Summary", content: "" },
    { id: "work-experience", title: "Work Experience", items: [] },
    { id: "education", title: "Education", items: [] },
    { id: "skills", title: "Skills", categories: [
      { name: "Technical Skills", skills: [] },
      { name: "Soft Skills", skills: [] }
    ] },
    { id: "projects", title: "Projects", items: [] },
    { id: "certifications", title: "Certifications", items: [] },
  ]);

  /**
   * Extracts the current section's text.
   */
  const getCurrentSectionContent = useCallback(() => {
    if (!activeSection) return "";

    const section = sections.find((s) => s.id === activeSection);
    if (!section) return "";

    if (section.content !== undefined) {
      return section.content || "";
    } else if (section.items && section.items.length > 0) {
      const formattedItems = section.items
        .filter(
          (item) =>
            item.title ||
            item.subtitle ||
            item.date ||
            item.description ||
            (item.bullets && item.bullets.length > 0),
        )
        .map((item) => {
          const bulletPoints = (item.bullets || [])
            .filter((bullet) => bullet && bullet.trim())
            .map((bullet) => `• ${bullet.trim()}`)
            .join("\n");

          return `
Position: ${item.title}
Company: ${item.subtitle}
Date: ${item.date}
${item.description ? `Description: ${item.description}` : ""}
${bulletPoints ? `\nAchievements:\n${bulletPoints}` : ""}
          `.trim();
        });

      if (formattedItems.length === 0) {
        return `No entries found in ${section.title}`;
      }

      return `${section.title.toUpperCase()}\n\n${formattedItems.join("\n\n==========\n\n")}`;
    }
    return "";
  }, [activeSection, sections]);

  /**
   * Extracts the "Revised Version" portion from the AI output.
   */
  const extractRevisedVersion = (text: string): string => {
    const marker = "Revised Version:";
    const index = text.indexOf(marker);
    if (index !== -1) {
      // Extract everything after the marker, then trim any quotes
      return text.substring(index + marker.length).trim().replace(/^"|"$/g, "");
    }
    return "";
  };

  /**
   * Calls the AI assistant route.
   */
  const handleApplyAiOutput = () => {
    if (!activeSection || !aiOutput) return;

    setSections(prev => prev.map(section => {
      if (section.id !== activeSection) return section;

      // Handle different section types
      if (section.id === 'skills' && section.categories) {
        // Parse skills from AI output and add to appropriate category
        const skills = aiOutput.split(',').map(s => s.trim());
        return {
          ...section,
          categories: section.categories.map(cat => ({
            ...cat,
            skills: [...new Set([...cat.skills, ...skills])]
          }))
        };
      } else if (section.items) {
        // For sections with items (work, education, projects)
        const newItem: SectionItem = {
          title: "",
          subtitle: "",
          date: "",
          description: aiOutput,
          bullets: []
        };
        return {
          ...section,
          items: [...section.items, newItem]
        };
      } else {
        // For sections with direct content
        return {
          ...section,
          content: section.content ? section.content + "\n" + aiOutput : aiOutput
        };
      }
    }));

    // Clear AI output after adding
    setAiOutput("");
    toast({
      title: "Content Added",
      description: "AI suggestions have been added to the selected section."
    });
  };

  const getAiSuggestions = useCallback(
    async (sectionId: string, userQuery?: string) => {
      if (!sectionId) return;

      setIsAiLoading(true);
      try {
        const sectionContent = getCurrentSectionContent();
        console.log("[DEBUG] Section ID:", sectionId);
        console.log("[DEBUG] Section Content:", sectionContent);
        console.log("[DEBUG] Content Length:", sectionContent.length);
        console.log("[DEBUG] User Query:", userQuery);

        const response = await fetch("/api/resume-ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId, sectionContent, userQuery }),
        });

        if (!response.ok) throw new Error("Failed to get AI suggestions");

        const data = await response.json();
        console.log("[DEBUG] AI Response Data:", data);

        const revision = data.revision || "No suggestions available.";
        console.log("[DEBUG] Setting message:", revision);

        setAiMessage(revision);
        setAiOutput(revision);
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
    },
    [getCurrentSectionContent, toast],
  );

  // Auto-fetch suggestions when activeSection changes.
  useEffect(() => {
    if (activeSection) {
      getAiSuggestions(
        activeSection,
        "Please analyze this section and suggest improvements."
      );
    }
  }, [activeSection, getAiSuggestions]);

  /**
   * Handles section selection from the sidebar.
   */
  const handleSectionSelect = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    // Get section content first
    const section = sections.find(s => s.id === sectionId);
    const isEmpty = !section?.content || section.content.trim().length === 0;

    // Only get AI suggestions if section has content
    if (!isEmpty) {
      getAiSuggestions(sectionId);
    }
  }, [sections]);

  /**
   * Submits a direct AI query (user typed something).
   */
  const handleAiChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSection || !aiInput.trim()) return;

    const userMessage = aiInput;
    setAiInput("");
    await getAiSuggestions(activeSection, userMessage);
  };

  /**
   * Applies the revised version from the AI suggestions to the active section.
   */
  const handleApplyRevision = () => {
    if (!activeSection) return;
    const revisedText = extractRevisedVersion(aiMessage);
    if (!revisedText) {
      toast({
        title: "Apply Revision Error",
        description: "No revised version found in the suggestions.",
        variant: "destructive",
      });
      return;
    }

    // Update the active section's content.
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === activeSection
          ? { ...section, content: revisedText }
          : section
      )
    );

    toast({
      title: "Revision Applied",
      description: "The revised text has been applied to the section.",
    });
  };

  const handleAddAiContent = (content: string) => {
    if (!activeSection) return;

    const updatedSections = sections.map(section => {
      if (section.id === activeSection) {
        if (section.content !== undefined) {
          return { ...section, content: section.content + "\n" + content }; // Append content
        } else if (section.items) {
          return { ...section, items: [...(section.items || []), { content }] };
        }
      }
      return section;
    });

    setSections(updatedSections);
    toast({
      title: "Content Added",
      description: "AI suggestion has been added to the section",
    });
  };


  /**
   * Handles file upload -> parse the resume.
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

      const response = await fetch("/api/resume-parser", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to parse resume (${response.status})`);
      }

      const data = await response.json();
      console.log("[DEBUG] Parsed resume data:", data);

      if (!data.sections || !Array.isArray(data.sections)) {
        throw new Error("Invalid data structure received from parser");
      }

      setPersonalInfo({
        name: data.personalInfo?.name || "",
        email: data.personalInfo?.email || "",
        phone: data.personalInfo?.phone || "",
        location: data.personalInfo?.location || "",
        linkedin: data.personalInfo?.linkedin || "",
      });

      const currentSections = new Map(sections.map(section => [section.id, section]));
      const filteredSections = data.sections.filter((section: ResumeSection) => section.id !== 'personal-info');
      const properlyFilteredSections = filteredSections.filter((section: ResumeSection) => section.id !== 'personal-info');

      const updatedSections = properlyFilteredSections.map((section: ResumeSection) => {
        const currentSection = currentSections.get(section.id) || { 
          id: section.id, 
          title: section.title 
        };
        if (section.id === 'skills') {
          return {
            ...currentSection,
            ...section,
            categories: section.categories || [
              { name: "Technical Skills", skills: [] },
              { name: "Soft Skills", skills: [] }
            ]
          };
        }
        if (['work-experience', 'education', 'projects', 'certifications'].includes(section.id)) {
          return {
            ...currentSection,
            ...section,
            items: section.items ? section.items.map(item => ({
              ...item,
              bullets: item.bullets || [],
            })) : [],
          };
        }
        return {
          ...currentSection,
          ...section,
          content: section.content || "",
        };
      });

      const standardSectionIds = [
        'professional-summary',
        'work-experience',
        'education',
        'skills',
        'projects',
        'certifications'
      ];

      standardSectionIds.forEach(id => {
        if (!updatedSections.find(section => section.id === id)) {
          const defaultSection = sections.find(section => section.id === id);
          if (defaultSection) {
            updatedSections.push(defaultSection);
          }
        }
      });

      setSections(updatedSections);

      setAiMessage("Resume parsed successfully. Select any section to get AI suggestions for improvements.");
      toast({
        title: "Resume Parsed Successfully",
        description: "All sections have been populated. Review and edit as needed.",
      });
    } catch (error) {
      console.error("Error parsing resume:", error);
      toast({
        title: "Parsing Failed",
        description: "Unable to process your resume. Please try again or enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Clears out the resume entirely.
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
      }))
    );
    setAiMessage("Start by uploading a resume or entering your information manually.");
    setActiveSection(null);
  };

  /**
   * Section item management functions.
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
      })
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
      })
    );
  };

  const addBulletPoint = (sectionId: string, itemIndex: number) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId && section.items) {
          const newItems = [...section.items];
          if (newItems[itemIndex]) {
            newItems[itemIndex] = {
              ...newItems[itemIndex],
              bullets: [...(newItems[itemIndex].bullets || []), ""],
            };
          }
          return { ...section, items: newItems };
        }
        return section;
      })
    );
  };

  // Render the sidebar buttons.
  const renderSidebarButtons = () =>
    sections.map((section) => (
      <button
        key={section.id}
        onClick={() => handleSectionSelect(section.id)}
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
    ));

  // Render the AI Assistant area.
  const renderAiAssistant = () => (
    <Card className="h-[30vh] mt-6">
      <CardHeader className="py-3">
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
              - {sections.find((s) => s.id === activeSection)?.title}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(30vh-4rem)] flex flex-col">
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              {aiMessage ||
                (activeSection
                  ? "Analyzing your content..."
                  : "Select a section to get AI assistance and suggestions.")}
            </div>
            {aiOutput && (
              <Button
                onClick={handleApplyAiOutput}
                className="mt-4 w-full bg-green-600 hover:bg-green-700"
              >
                Apply AI Suggestions
              </Button>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t flex flex-col gap-2">
          <form onSubmit={handleAiChat} className="flex gap-2">
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
        </div>
        {/* Apply Revision button - positioned at top right */}
        {activeSection && aiMessage && !isAiLoading && (
          <div className="absolute top-4 right-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddAiContent(extractRevisedVersion(aiMessage) || aiMessage)}
            >
              Add to Section
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto flex flex-col h-[calc(100vh-3rem)]">
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

        {/* Main content area - 70% height */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left sidebar */}
          <Card className="w-60 shrink-0 sticky top-6 h-fit">
            <CardContent className="p-4">{renderSidebarButtons()}</CardContent>
          </Card>

          {/* Center content area - Scrollable */}
          <ScrollArea className="flex-1 h-full pr-4" ref={contentRef}>
            <div className="space-y-6">
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
                    {section.id === 'skills' && section.categories ? (
                      <div className="space-y-6">
                        {section.categories.map((category, catIndex) => (
                          <div key={catIndex} className="space-y-2">
                            <h3 className="text-base font-medium">{category.name}</h3>
                            <div className="flex flex-wrap gap-2">
                              {category.skills.map((skill, skillIndex) => (
                                <div key={skillIndex} className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center">
                                  {skill}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 ml-1"
                                    onClick={() => {
                                      const newSections = [...sections];
                                      const skillsSection = newSections.find(s => s.id === 'skills');
                                      if (skillsSection?.categories) {
                                        skillsSection.categories[catIndex].skills = 
                                          skillsSection.categories[catIndex].skills.filter((_, i) => i !== skillIndex);
                                        setSections(newSections);
                                      }
                                    }}
                                  >
                                    <MinusCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const newSkill = prompt('Enter skill:');
                                  if (newSkill) {
                                    const newSections = [...sections];
                                    const skillsSection = newSections.find(s => s.id === 'skills');
                                    if (skillsSection?.categories) {
                                      skillsSection.categories[catIndex].skills.push(newSkill);
                                      setSections(newSections);
                                    }
                                  }
                                }}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Skill
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : section.items ? (
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
                              onClick={() =>
                                removeSectionItem(section.id, index)
                              }
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
                                              : i,
                                          ),
                                        }
                                      : s,
                                  ),
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
                                              ? {
                                                  ...i,
                                                  subtitle: e.target.value,
                                                }
                                              : i,
                                          ),
                                        }
                                      : s,
                                  ),
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
                                              : i,
                                          ),
                                        }
                                      : s,
                                  ),
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
                                              : i,
                                          ),
                                        }
                                      : s,
                                  ),
                                )
                              }
                            />
                            <div className="space-y-2">
                              {(item.bullets || []).map(
                                (bullet, bulletIndex) => (
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
                                                              : b,
                                                        ),
                                                      }
                                                    : i,
                                                ),
                                              }
                                            : s,
                                        ),
                                      )
                                    }
                                  />
                                ),
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  addBulletPoint(section.id, index)
                                }
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
                                : s,
                            ),
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
        </div>

        {/* AI Assistant - 30% height at bottom */}
        {renderAiAssistant()}
      </div>
    </div>
  );
}