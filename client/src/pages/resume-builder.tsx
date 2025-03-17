
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface SectionItem {
  title: string;
  subtitle: string;
  date: string;
  description: string;
  bullets: string[];
}

interface ResumeSection {
  id: string;
  title: string;
  content?: string;
  items?: SectionItem[];
}

export default function ResumeBuilder() {
  const { toast } = useToast();
  const [sections, setSections] = useState<ResumeSection[]>([
    {
      id: "professional-summary",
      title: "Professional Summary",
      content: ""
    },
    {
      id: "work-experience",
      title: "Work Experience",
      items: []
    },
    {
      id: "education",
      title: "Education",
      items: []
    },
    {
      id: "skills",
      title: "Skills",
      content: ""
    }
  ]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Resume Builder</h1>
      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.content !== undefined ? (
                <Input
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
                  placeholder={`Enter ${section.title.toLowerCase()}...`}
                />
              ) : (
                <Button
                  onClick={() =>
                    setSections((prev) =>
                      prev.map((s) =>
                        s.id === section.id
                          ? {
                              ...s,
                              items: [
                                ...(s.items || []),
                                {
                                  title: "",
                                  subtitle: "",
                                  date: "",
                                  description: "",
                                  bullets: []
                                }
                              ]
                            }
                          : s
                      )
                    )
                  }
                >
                  Add {section.title} Entry
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
