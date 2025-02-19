import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Send, Download, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function ResumeBuilder() {
  const { toast } = useToast();
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
    }
  ]);

  const [messages, setMessages] = useState<Array<{ type: 'assistant' | 'user'; content: string }>>([
    {
      type: 'assistant',
      content: 'I can help you build a professional resume. Select any section to get started, or ask me for suggestions.'
    }
  ]);

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
    setMessages(prev => [...prev, {
      type: 'assistant',
      content: `Let's work on your ${sectionId} section. What would you like to add or improve?`
    }]);
  };

  const handleSendMessage = async () => {
    if (chatMessage.trim()) {
      setMessages(prev => [...prev, { type: 'user', content: chatMessage }]);

      if (activeSection) {
        // Send the current section content for enhancement
        enhanceMutation.mutate({
          sectionId: activeSection,
          content: chatMessage
        });
      }

      setChatMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6 h-[calc(100vh-48px)]">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Resume Builder</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => {
              setSections([]);
              setPersonalInfo({
                name: "",
                email: "",
                phone: "",
                location: "",
                linkedin: ""
              });
            }}>New Resume</Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="flex gap-6 h-[75vh]">
          <Card className="w-60">
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

          <Card className="flex-1">
            <CardContent className="p-12">
              <div className="text-center mb-8">
                <Input
                  value={personalInfo.name}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full Name"
                  className="text-3xl font-bold mb-2 text-center"
                />
                <div className="space-y-2">
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

              <ScrollArea className="h-[calc(100%-180px)] pr-4">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className={cn(
                      "mb-8 p-6 rounded-lg transition-all",
                      activeSection === section.id
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-transparent"
                    )}
                  >
                    <h2 className="text-xl font-semibold border-b pb-2 mb-4">
                      {section.title.toUpperCase()}
                    </h2>

                    {section.id === "summary" ? (
                      <Textarea
                        value={section.content}
                        onChange={(e) => setSections(prev => 
                          prev.map(s => s.id === section.id ? { ...s, content: e.target.value } : s)
                        )}
                        placeholder="Write your professional summary..."
                        className="min-h-[100px]"
                      />
                    ) : (
                      <div className="space-y-6">
                        {section.items?.map((item, itemIndex) => (
                          <div key={itemIndex} className="space-y-2">
                            <Input
                              value={item.title}
                              onChange={(e) => updateSectionItem(section.id, itemIndex, 'title', e.target.value)}
                              placeholder={`${section.title} Title`}
                              className="font-semibold"
                            />
                            <Input
                              value={item.subtitle}
                              onChange={(e) => updateSectionItem(section.id, itemIndex, 'subtitle', e.target.value)}
                              placeholder="Organization/Company"
                              className="italic"
                            />
                            <Input
                              value={item.date}
                              onChange={(e) => updateSectionItem(section.id, itemIndex, 'date', e.target.value)}
                              placeholder="Date Range"
                            />
                            <div className="pl-5 space-y-2">
                              {item.bullets?.map((bullet, bulletIndex) => (
                                <Input
                                  key={bulletIndex}
                                  value={bullet}
                                  onChange={(e) => updateBulletPoint(section.id, itemIndex, bulletIndex, e.target.value)}
                                  placeholder="Add bullet point..."
                                />
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addBulletPoint(section.id, itemIndex)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Bullet Point
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          onClick={() => addSectionItem(section.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add {section.title} Entry
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card className="h-[25vh]">
          <CardHeader className="py-3 px-6 border-b">
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
              AI Assistant
            </CardTitle>
          </CardHeader>
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
              </div>
            </ScrollArea>
            <div className="p-4 border-t flex gap-3">
              <Textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask me to help improve the selected section..."
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
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}