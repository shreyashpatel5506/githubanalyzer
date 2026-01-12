import { callOpenAI } from "./provider/openai";
import { callGemini } from "./provider/gemini";

const openaiKeys = process.env.OPENAI_KEYS.split(",");

export async function runAI(prompt) {
  // 🔁 Try OpenAI keys one by one
  for (const key of openaiKeys) {
    try {
      return await callOpenAI(prompt, key);
    } catch (err) {
      if (err?.status !== 429) {
        console.error("OpenAI error:", err.message);
      }
    }
  }

  // 🧯 Fallback to Gemini
  try {
    return await callGemini(prompt);
  } catch (err) {
    console.error("Gemini error:", err.message);
    throw new Error("All AI providers exhausted");
  }
}
