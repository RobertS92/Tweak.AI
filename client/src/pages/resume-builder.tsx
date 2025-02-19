import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Send, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  content: string;
}

export default function ResumeBuilder() {
  const [activeSection, setActiveSection] = useState<string>("summary");
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ type: 'assistant' | 'user'; content: string }>>([
    {
      type: 'assistant',
      content: 'Select any section of the resume, and I\'ll help you improve it with better wording and impact.'
    }
  ]);

  const sections: Section[] = [
    { id: "summary", title: "Professional Summary", content: "Senior Software Engineer with 8+ years of experience..." },
    { id: "experience", title: "Work Experience", content: "" },
    { id: "education", title: "Education", content: "" },
    { id: "skills", title: "Skills", content: "" }
  ];

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setMessages(prev => [...prev, {
      type: 'assistant',
      content: `I see you're looking at the ${sectionId} section. Would you like me to help improve it?`
    }]);
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setMessages(prev => [...prev, { type: 'user', content: chatMessage }]);
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          type: 'assistant',
          content: 'I can help improve this section. Here are some suggestions...'
        }]);
      }, 1000);
      setChatMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-6 h-[calc(100vh-48px)]">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Resume Builder</h1>
          <div className="flex gap-3">
            <Button variant="outline">New Resume</Button>
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
              <div className="text-center mb-3">
                <h1 className="text-3xl font-bold mb-2">John Smith</h1>
                <p className="text-gray-600">
                  john.smith@email.com | (123) 456-7890<br />
                  New York, NY | linkedin.com/in/johnsmith
                </p>
              </div>

              <ScrollArea className="h-[calc(100%-100px)] pr-4">
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
                    {section.id === "experience" ? (
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold">Senior Software Engineer</h3>
                          <p className="text-gray-600 italic">Tech Solutions Inc. | 2020 - Present</p>
                          <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li>Led development of cloud-native applications using microservices architecture</li>
                            <li>Implemented CI/CD pipelines reducing deployment time by 60%</li>
                            <li>Mentored junior developers and conducted code reviews</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p>{section.content}</p>
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
