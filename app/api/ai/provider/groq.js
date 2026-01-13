import Groq from "groq-sdk";

// Initialize the client outside the function to reuse the instance
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function callGroq(prompt) {
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
