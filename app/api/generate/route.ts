import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { fileData, notes } = await req.json();

  const userContent: unknown[] = [];

  if (fileData) {
    if (fileData.type === "text") {
      userContent.push({ type: "text", text: fileData.content });
    } else if (fileData.type === "image") {
      userContent.push({ type: "image", source: { type: "base64", media_type: fileData.mediaType, data: fileData.base64 } });
      if (fileData.note) userContent.push({ type: "text", text: fileData.note });
    } else if (fileData.type === "pdf") {
      userContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: fileData.base64 } });
    }
  }

  if (notes) userContent.push({ type: "text", text: notes });

  userContent.push({
    type: "text",
    text: `Based on ALL the above content, generate exactly 12 flashcard questions covering key concepts.
Return ONLY a JSON array, no markdown, no preamble:
[{"id":1,"level":1,"topic":"Subject","question":"...","answer":"...","memoryTrick":"..."},...]
Rules: level 1=recall, 2=understanding, 3=application, 4=exam-style. 3 cards each level.`,
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: "You are a study material expert. Extract key concepts and generate high-quality flashcards. Always respond with pure JSON array only.",
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Upstream API error" }, { status: res.status });
  }

  const data = await res.json() as {
    content?: Array<{ type: string; text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };

  const usage = {
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    requestsRemaining: res.headers.get("anthropic-ratelimit-requests-remaining"),
    tokensRemaining: res.headers.get("anthropic-ratelimit-tokens-remaining"),
    tokensLimit: res.headers.get("anthropic-ratelimit-tokens-limit"),
    resetAt: res.headers.get("anthropic-ratelimit-tokens-reset"),
  };

  const text = data.content?.find(b => b.type === "text")?.text || "[]";
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    const cards = JSON.parse(clean);
    return NextResponse.json({ cards, usage });
  } catch {
    return NextResponse.json({ error: "Failed to parse cards" }, { status: 500 });
  }
}
