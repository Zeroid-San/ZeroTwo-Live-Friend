import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Text is required." }, { status: 400 });
    const url = process.env.GPU_TTS_URL;
    const key = process.env.GPU_API_KEY;
    if (!url || !key) return NextResponse.json({ error: "GPU voice backend is not configured." }, { status: 503 });
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-GPU-KEY": key }, body: JSON.stringify({ text }), cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "GPU TTS request failed." }, { status: 502 });
    return new NextResponse(await response.arrayBuffer(), { headers: { "Content-Type": response.headers.get("content-type") || "audio/wav", "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Voice backend unavailable." }, { status: 503 });
  }
}