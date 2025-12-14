import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  return new GoogleGenAI({ apiKey });
};

export const generateTaskSuggestion = async (): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate a single, fun, harmless, and professional 1-sentence 'dare' or 'task' for an office colleague to do secretly. Examples: 'Wear a hat for an hour', 'Bring a coffee to someone'. Do not include quotes in the output.",
    });
    return response.text?.trim() || "Wear a funny hat for the next meeting.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Wear a funny hat for the next meeting."; // Fallback
  }
};