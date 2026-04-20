import Groq from "groq-sdk";

let groqClient;

function getGroqApiKey() {
  return (
    process.env.GROQ_API_KEY?.trim() ||
    process.env.GROQ_API_KEY_1?.trim() ||
    process.env.GROQ_API_KEY_2?.trim() ||
    ""
  );
}

export function hasGroqKey() {
  return Boolean(getGroqApiKey());
}

function getGroqClient() {
  if (groqClient) return groqClient;

  const apiKey = getGroqApiKey();
  if (!apiKey) return null;

  groqClient = new Groq({ apiKey });
  return groqClient;
}

export async function callGroq(prompt) {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error("Groq API key is not configured.");
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });
    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error("Groq API Error:", error);
    throw new Error("Failed to fetch AI response");
  }
}
