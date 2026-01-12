export async function runAI(prompt) {
  // 1. Try OpenAI
  if (process.env.OPENAI_KEYS) {
    const openaiKeys = process.env.OPENAI_KEYS.split(",");
    for (const key of openaiKeys) {
      try {
        return await callOpenAI(prompt, key.trim()); // trim() handles accidental spaces in .env
      } catch (err) {}
    }

    // 2. Fallback to Gemini
    try {
      console.log("Attempting Gemini fallback...");
      return await callGemini(prompt);
    } catch (err) {
      console.error("Gemini fallback also failed:", err.message);

      // Final Error: Tell the user exactly why it failed
      throw new Error(`Service Unavailable: ${err.message}`);
    }
  }
}
