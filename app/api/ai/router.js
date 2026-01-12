import { callOpenAI } from "./provider/openai";
import { callGemini } from "./provider/gemini";

export async function runAI(prompt) {
  const openaiKeys = process.env.OPENAI_KEYS?.split(",") || [];
  let lastError = null;

  // 🔁 OpenAI key rotation ONLY
  for (const key of openaiKeys) {
    try {
      return await callOpenAI(prompt, key.trim());
    } catch (err) {
      lastError = err;
      console.error("OpenAI key failed:", err.message);
    }
  }

  // 🚫 Gemini is NOT default fallback
  if (process.env.ENABLE_GEMINI === "true") {
    try {
      console.warn("All OpenAI keys exhausted. Trying Gemini...");
      return await callGemini(prompt);
    } catch (err) {
      throw new Error(`All providers failed. Gemini error: ${err.message}`);
    }
  }

  // ❌ Final hard failure
  throw new Error(
    `All OpenAI keys failed. Gemini disabled. Last error: ${lastError?.message}`
  );
}
