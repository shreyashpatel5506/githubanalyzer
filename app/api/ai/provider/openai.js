import OpenAI from "openai";

export async function callOpenAI(prompt, apiKey) {
  const client = new OpenAI({ apiKey });

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  return res.choices[0].message.content;
}
