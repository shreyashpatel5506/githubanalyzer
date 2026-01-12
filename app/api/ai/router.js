import { callOpenAI } from "./provider/openai";
import { callGemini } from "./provider/gemini";

export async function runAI(prompt) {
  const openaiKeys = process.env.OPENAI_KEYS?.split(",") || [];
  let lastError = null;

  // 🔁 STRICT OpenAI rotation
  for (const key of openaiKeys) {
    try {
      return await callOpenAI(prompt, key.trim());
    } catch (err) {
      lastError = err;
      console.error("OpenAI key failed:", err.message);
    }
  }

  // 🚫 Gemini HARD-GATED
  if (process.env.ENABLE_GEMINI === "true") {
    console.warn("⚠️ OpenAI exhausted. Gemini explicitly enabled.");

    try {
      return await callGemini(prompt);
    } catch (err) {
      throw new Error(`Gemini failed: ${err.message}`);
    }
  }

  // ❌ HARD FAIL (EXPECTED BEHAVIOR)
  throw new Error(
    `All OpenAI keys exhausted. Gemini disabled. Last error: ${lastError?.message}`
  );
}
