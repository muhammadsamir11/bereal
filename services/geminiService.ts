import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Note: In a real production app, this should be proxied through a backend to hide the key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCreativeBio = async (currentBio: string, username: string): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found for Gemini");
    return "Gen-Z vibes loading... (Check API Key)";
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are a Gen-Z social media expert. Rewrite the following bio for a user named "${username}" on the app BeReal.
      Keep it short (under 100 chars), lower case, minimal punctuation, maybe one obscure emoji. 
      Make it sound authentic, slightly chaotic, or "too cool to care".
      
      Current Bio: "${currentBio}"
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Error generating bio:", error);
    return "Error generating bio. Try again.";
  }
};