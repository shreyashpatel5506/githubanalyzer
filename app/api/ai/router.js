import { callGroq } from "./provider/groq";
import { callGemini } from "./provider/gemini";
import { callOpenAI } from "./provider/openai";

// Gemini cooldown (NOTE: should be persisted later)
let geminiDisabledUntil = 0;

function isQuotaError(err) {
  const msg = err?.message?.toLowerCase() || "";
  return (
    err?.status === 429 ||
    err?.code === "rate_limit_exceeded" ||
    msg.includes("quota") ||
    msg.includes("rate")
  );
}

export async function runAI(prompt) {
  let groqError = null;
  let geminiError = null;
  let openAIError = null;

  const now = Date.now();

  // 1️⃣ GROQ — FREE & FAST (PRIMARY)
  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroq(prompt);
    } catch (err) {
      groqError = err;
      console.warn("⚠️ Groq failed:", err.message);
    }
  }

  // 2️⃣ GEMINI — FREE BUT FRAGILE
  if (
    process.env.ENABLE_GEMINI === "true" &&
    process.env.GEMINI_API_KEY &&
    now > geminiDisabledUntil
  ) {
    try {
      return await callGemini(prompt);
    } catch (err) {
      geminiError = err;

      if (isQuotaError(err)) {
        // ⛔ Disable Gemini for 24h
        geminiDisabledUntil = now + 24 * 60 * 60 * 1000;
        console.warn("🚫 Gemini quota hit. Disabled for 24h.");
      } else {
        console.warn("⚠️ Gemini failed:", err.message);
      }
    }
  }

  // 3️⃣ OPENAI — PAID / EMERGENCY
  const openaiKeys = process.env.OPENAI_KEYS?.split(",") || [];

  for (const rawKey of openaiKeys) {
    const key = rawKey.trim();
    if (!key) continue;

    try {
      return await callOpenAI(prompt, key);
    } catch (err) {
      openAIError = err;
      console.error("❌ OpenAI key failed:", err.message);

      // Rotate ONLY on quota errors
      if (!isQuotaError(err)) break;
    }
  }

  // 4️⃣ HARD FAIL (CLEAR + DEBUGGABLE)
  throw new Error(
    [
      "AI analysis failed.",
      groqError ? `Groq: ${groqError.message}` : "Groq: skipped",
      geminiError ? `Gemini: ${geminiError.message}` : "Gemini: skipped",
      openAIError ? `OpenAI: ${openAIError.message}` : "OpenAI: skipped",
    ].join(" | ")
  );
}
