
import OpenAI from "openai";
import { fetch } from "node-fetch";

export class AIService {
  private openai: OpenAI;
  private useOpenAI = true;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private async ollamaComplete(prompt: string): Promise<string> {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama2",
        prompt: prompt,
        stream: false
      })
    });

    const data = await response.json();
    return data.response;
  }

  async complete(messages: any[]): Promise<string> {
    try {
      if (this.useOpenAI) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages,
          temperature: 0.7,
        });
        return completion.choices[0].message.content || "";
      }
    } catch (error) {
      console.log("[DEBUG] OpenAI error, falling back to Ollama:", error);
      this.useOpenAI = false;
    }

    // Fallback to Ollama
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n");
    return this.ollamaComplete(prompt);
  }
}

export const aiService = new AIService();
