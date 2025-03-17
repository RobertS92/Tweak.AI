
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Plus, Download, Send, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
}

export default function ResumeBuilder() {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sections, setSections] = useState<ResumeSection[]>([
    {
      id: "professional-summary",
      title: "Professional Summary",
      content: "",
    },
    {
      id: "work-experience",
      title: "Work Experience",
      items: [],
    },
    {
      id: "education",
      title: "Education",
      items: [],
    },
    {
      id: "skills",
      title: "Skills",
      categories: [
        { name: "Technical Skills", skills: [] },
        { name: "Soft Skills", skills: [] },
      ],
    },
  ]);

  const addItem = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId && s.items
          ? {
              ...s,
              items: [
                ...s.items,
                {
                  title: "",
                  subtitle: "",
                  date: "",
                  description: "",
                  bullets: [""],
                },
              ],
            }
          : s,
      ),
    );
  }, []);

  const addBulletPoint = useCallback((sectionId: string, itemIndex: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId && s.items
          ? {
              ...s,
              items: s.items.map((item, idx) =>
                idx === itemIndex
                  ? { ...item, bullets: [...item.bullets, ""] }
                  : item,
              ),
            }
          : s,
      ),
    );
  }, []);

  const addSkill = useCallback((categoryName: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === "skills" && s.categories
          ? {
              ...s,
              categories: s.categories.map((cat) =>
                cat.name === categoryName
                  ? { ...cat, skills: [...cat.skills, ""] }
                  : cat,
              ),
            }
          : s,
      ),
    );
  }, []);

  const handleAiAssist = async (sectionId: string) => {
    try {
      // Implement AI assist functionality
      toast({
        title: "AI Assistant",
        description: "Generating suggestions...",
      });
      // Add your AI API call here
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI suggestions",
        variant: "destructive",
      });
    }
  };

  const renderAiAssistant = () => (
    <div className="h-[30vh] border-t">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
        <div className="flex gap-2">
          <Input placeholder="Ask for suggestions..." />
          <Button onClick={() => handleAiAssist(activeSection || "")}>
            <Send className="w-4 h-4 mr-2" />
            Get Help
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Resume Builder</h1>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4" ref={contentRef}>
              {sections.map((section) => (
                <Card
                  key={section.id}
                  className={cn("relative", {
                    "border-primary": activeSection === section.id,
                  })}
                  onClick={() => setActiveSection(section.id)}
                >
                  <CardHeader className="py-3">
                    <CardTitle className="text-lg font-semibold flex items-center justify-between">
                      {section.title}
                      {section.items && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addItem(section.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add {section.title.split(" ")[0]}
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {section.items ? (
                      <div className="space-y-4">
                        {section.items.map((item, index) => (
                          <div key={index} className="space-y-4">
                            <Input
                              placeholder="Title/Position"
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
                    ) : section.categories ? (
                      <div className="space-y-4">
                        {section.categories.map((category, catIndex) => (
                          <div key={catIndex} className="space-y-2">
                            <h3 className="font-medium">{category.name}</h3>
                            {category.skills.map((skill, skillIndex) => (
                              <Input
                                key={skillIndex}
                                value={skill}
                                placeholder="Enter skill"
                                onChange={(e) =>
                                  setSections((prev) =>
                                    prev.map((s) =>
                                      s.id === "skills" && s.categories
                                        ? {
                                            ...s,
                                            categories: s.categories.map(
                                              (c, cidx) =>
                                                cidx === catIndex
                                                  ? {
                                                      ...c,
                                                      skills: c.skills.map(
                                                        (sk, sidx) =>
                                                          sidx === skillIndex
                                                            ? e.target.value
                                                            : sk,
                                                      ),
                                                    }
                                                  : c,
                                            ),
                                          }
                                        : s,
                                    ),
                                  )
                                }
                              />
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addSkill(category.name)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Skill
                            </Button>
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
