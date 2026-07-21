import Groq from "groq-sdk";

const keys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
].filter(Boolean) as string[];

if (keys.length === 0) {
    console.warn("⚠️ No Groq API keys found in environment variables.");
}

let currentKeyIndex = 0;

export const getGroqClient = () => {
    const apiKey = keys[currentKeyIndex];
    if (!apiKey) {
        throw new Error("No Groq API keys available.");
    }
    return new Groq({ apiKey });
};

export const rotateKey = () => {
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    console.log(`🔄 Rotating Groq API Key to index ${currentKeyIndex}`);
};

export async function callGroqWithRetry(prompt: string, model = "llama-3.3-70b-versatile") {
    let attempts = 0;
    const maxAttempts = keys.length * 2; // Try each key twice max

    while (attempts < maxAttempts) {
        try {
            const groq = getGroqClient();
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: model,
            });
            return completion.choices[0]?.message?.content || "";
        } catch (error: any) {
            console.error(`❌ Groq Error (Key Index ${currentKeyIndex}):`, error.message);

            // If rate limited or auth error, rotate key
            if (error.status === 429 || error.status === 401) {
                rotateKey();
                attempts++;
                continue;
            }

            throw error; // Rethrow other errors
        }
    }

    throw new Error("All Groq API keys exhausted or failed.");
}
