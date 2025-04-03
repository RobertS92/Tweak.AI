
import OpenAI from "openai";

export class AIService {
  private openai: OpenAI;
  private useGPT4 = true;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async complete(messages: any[]): Promise<string> {
    try {
      const model = this.useGPT4 ? "gpt-4" : "gpt-3.5-turbo";
      const completion = await this.openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
      });

      if (!completion.choices[0].message.content) {
        throw new Error("No content in response");
      }

      return completion.choices[0].message.content;
    } catch (error) {
      console.log("[DEBUG] OpenAI GPT-4 error, falling back to GPT-3.5:", error);
      this.useGPT4 = false;
      
      // Retry with fallback model
      if (this.useGPT4) {
        return this.complete(messages);
      }
      
      throw error;
    }
  }
}

export const aiService = new AIService();
