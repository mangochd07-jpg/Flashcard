import { NextRequest, NextResponse } from "next/server";

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export async function POST(req: NextRequest) {
  const { fileData, notes } = await req.json();

  const parts: GeminiPart[] = [];

  if (fileData) {
    if (fileData.type === "text") {
      parts.push({ text: fileData.content });
    } else if (fileData.type === "image") {
      parts.push({ inline_data: { mime_type: fileData.mediaType, data: fileData.base64 } });
      if (fileData.note) parts.push({ text: fileData.note });
    } else if (fileData.type === "pdf") {
      parts.push({ inline_data: { mime_type: "application/pdf", data: fileData.base64 } });
    }
  }

  if (notes) parts.push({ text: notes });

  parts.push({
    text: `Based on ALL the above content, generate exactly 12 flashcard questions covering key concepts.
Return ONLY a JSON array, no markdown, no preamble:
[{"id":1,"level":1,"topic":"Subject","question":"...","answer":"...","memoryTrick":"..."},...]
Rules: level 1=recall, 2=understanding, 3=application, 4=exam-style. 3 cards each level.`,
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are a study material expert. Extract key concepts and generate high-quality flashcards. Always respond with pure JSON array only." }] },
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 3000, temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Upstream API error", detail: err }, { status: res.status });
  }

  const data = await res.json() as {
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
  };

  const usage = {
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    requestsRemaining: null,
    tokensRemaining: null,
    tokensLimit: null,
    resetAt: null,
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    const cards = JSON.parse(clean);
    return NextResponse.json({ cards, usage });
  } catch {
    return NextResponse.json({ error: "Failed to parse cards", raw }, { status: 500 });
  }
}
