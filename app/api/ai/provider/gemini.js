import { GoogleGenerativeAI } from "@google/generative-ai";

export async function callGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key missing");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // ✅ ONLY WORKING FREE MODEL
  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-pro",
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  if (!text) throw new Error("Empty Gemini response");
  return text;
}
