import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

type Message = { role: "user" | "assistant"; content: string };

const instructions = "You are a live AI companion named Zero Two. You are warm, playful, confident, attentive, and conversational. Speak naturally like a close companion. Keep replies reasonably concise unless the user asks for detail. Never claim to be a real person. You are inspired by the user's requested anime companion concept, but you are an AI.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages as Message[] : [];
    const requestedProvider = body.provider === "openai" || body.provider === "gemini" ? body.provider : "auto";
    const customApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const customModel = typeof body.model === "string" ? body.model.trim() : "";

    const serverOpenAIKey = (process.env.OPENAI_API_KEY || process.env.OPENAI_API || "").trim();
    const serverGeminiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!messages.length) return NextResponse.json({ error: "No messages supplied." }, { status: 400 });

    const provider = requestedProvider === "auto"
      ? customApiKey ? "openai" : serverOpenAIKey ? "openai" : serverGeminiKey ? "gemini" : null
      : requestedProvider;

    if (!provider) {
      return NextResponse.json({ error: "No AI API is configured. Add a key in Settings or Vercel Environment Variables." }, { status: 500 });
    }

    if (provider === "openai") {
      const openaiKey = customApiKey || serverOpenAIKey;
      if (!openaiKey) {
        return NextResponse.json({ error: "OpenAI API is not configured. Add an API key in Settings or Vercel." }, { status: 500 });
      }

      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.responses.create({
        model: customModel || process.env.OPENAI_MODEL || "gpt-5.6-luna",
        instructions,
        input: messages.map(message => ({ role: message.role, content: message.content }))
      });

      return NextResponse.json({ text: response.output_text, provider: "openai" });
    }

    const geminiKey = customApiKey || serverGeminiKey;
    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini API is not configured. Add an API key in Settings or Vercel." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const response = await ai.models.generateContent({
      model: customModel || process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: messages.map(message => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
      })),
      config: { systemInstruction: instructions }
    });

    return NextResponse.json({ text: response.text, provider: "gemini" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}