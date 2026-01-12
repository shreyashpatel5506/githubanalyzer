import { callOpenAI } from "./provider/openai";
import { callGemini } from "./provider/gemini";

export async function runAI(prompt) {
  let lastError = null;

  // 1️⃣ Pehle Gemini try karo (Agar enabled hai)
  if (process.env.ENABLE_GEMINI === "true") {
    try {
      console.log("Attempting Gemini first...");
      return await callGemini(prompt);
    } catch (err) {
      lastError = err;
      console.warn("⚠️ Gemini failed, falling back to OpenAI:", err.message);
    }
  } else {
    console.log("Gemini is disabled, skipping to OpenAI.");
  }

  // 2️⃣ Agar Gemini fail hua ya disabled hai, tab OpenAI keys rotate karo
  const openaiKeys = process.env.OPENAI_KEYS?.split(",") || [];

  if (openaiKeys.length > 0) {
    for (const key of openaiKeys) {
      try {
        return await callOpenAI(prompt, key.trim());
      } catch (err) {
        lastError = err;
        console.error("OpenAI key failed:", err.message);
      }
    }
  }

  // ❌ Dono options khatam hone par Error throw karein
  throw new Error(
    `Both providers failed. Gemini Error: ${lastError?.message}. Check OpenAI keys.`
  );
}
