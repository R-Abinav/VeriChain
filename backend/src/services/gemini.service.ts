import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.config.js";
import { AnalysisResponse } from "../types/index.js";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  async analyzeClaim(claim: string): Promise<AnalysisResponse> {
    try {
      const prompt = `You are a fact-checking AI. Analyze this claim and respond ONLY with valid JSON (no markdown, no extra text).

                CLAIM: "${claim}"

                Respond with EXACTLY this JSON format (no other text):
                {
                "verdict": "TRUE" or "FALSE" or "UNCLEAR",
                "confidence": <number 0-100>,
                "analysis": "<brief explanation of your reasoning>",
                "sources": ["<source1>", "<source2>"]
                }

                Guidelines:
                - verdict: TRUE if claim is factually correct, FALSE if incorrect, UNCLEAR if insufficient evidence
                - confidence: How certain you are (0-100)
                - analysis: 1-2 sentences explaining your reasoning
                - sources: List 2-3 credible sources (can be publication names, not URLs)`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid JSON response from Gemini");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and return
      return {
        verdict: this.validateVerdict(parsed.verdict),
        confidence: Math.min(Math.max(parsed.confidence, 0), 100),
        analysis: parsed.analysis || "No analysis provided",
        sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      };
    } catch(error: any){
      console.error("Gemini API Error:", error);
      // Return UNCLEAR on error
      return {
        verdict: "UNCLEAR",
        confidence: 0,
        analysis: "Error analyzing claim. Please try again.",
        sources: [],
      };
    }
  }

  private validateVerdict(verdict: string): "TRUE" | "FALSE" | "UNCLEAR" {
    const normalized = verdict.toUpperCase();
    if (normalized === "TRUE") return "TRUE";
    if (normalized === "FALSE") return "FALSE";
    return "UNCLEAR";
  }
}

export const geminiService = new GeminiService();