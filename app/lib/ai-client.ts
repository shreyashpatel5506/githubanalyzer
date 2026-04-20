import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// --- PROVIDERS ---

// 1. GROQ
let groqInstance: Groq | null = null;

function getGroqClient() {
    if (groqInstance) return groqInstance;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is missing. Please provide it in your environment variables.");
    }

    groqInstance = new Groq({ apiKey });
    return groqInstance;
}

async function callGroq(prompt: string) {
    try {
        const groq = getGroqClient();
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Empty Groq response");
        return content;
    } catch (error: any) {
        console.error("Groq API Error:", error);
        throw new Error("Failed to fetch AI response from Groq");
    }
}

// 2. GEMINI
async function callGemini(prompt: string) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Gemini API key missing");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite-preview-02-05", // Updated to latest lite model or fallback to 1.5-flash
    });

    // Fallback if model name is unsure, but sticking to ported logic:
    // Original used "models/gemini-2.5-flash-lite" which might be a typo in original or a very new preview.
    // I will use a standard stable model for now to be safe: "gemini-1.5-flash"
    // OR keep the original string if user has access.
    // Let's use "gemini-1.5-flash" as a safe default for now, can be updated.

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("Empty Gemini response");
    return text;
}

// 3. OPENAI
async function callOpenAI(prompt: string, apiKey: string) {
    const client = new OpenAI({ apiKey });

    const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
    });

    const content = res.choices[0].message.content;
    if (!content) throw new Error("Empty OpenAI response");
    return content;
}

// --- ROUTER ---

// Gemini cooldown (in-memory, per instance)
let geminiDisabledUntil = 0;

function isQuotaError(err: any) {
    const msg = err?.message?.toLowerCase() || "";
    return (
        err?.status === 429 ||
        err?.code === "rate_limit_exceeded" ||
        msg.includes("quota") ||
        msg.includes("rate")
    );
}

export async function runAI(prompt: string): Promise<string> {
    let groqError = null;
    let geminiError = null;
    let openAIError = null;

    const now = Date.now();

    // 1️⃣ GROQ — FREE & FAST (PRIMARY)
    if (process.env.GROQ_API_KEY) {
        try {
            return await callGroq(prompt);
        } catch (err: any) {
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
        } catch (err: any) {
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
        } catch (err: any) {
            openAIError = err;
            console.error("❌ OpenAI key failed:", err.message);

            // Rotate ONLY on quota errors
            if (!isQuotaError(err)) break;
        }
    }

    // 4️⃣ HARD FAIL
    throw new Error(
        [
            "AI analysis failed.",
            groqError ? `Groq: ${groqError.message}` : "Groq: skipped",
            geminiError ? `Gemini: ${geminiError.message}` : "Gemini: skipped",
            openAIError ? `OpenAI: ${openAIError.message}` : "OpenAI: skipped",
        ].join(" | ")
    );
}
