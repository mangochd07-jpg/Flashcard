import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question, correctAnswer, userAnswer } = await req.json();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `You are a strict but encouraging tutor. Respond ONLY with JSON, no markdown:
{"verdict":"correct"|"partial"|"incorrect","score":0-100,"feedback":"1-2 sentences","encouragement":"short motivational line"}`,
      messages: [{ role: "user", content: `Question: ${question}\nCorrect Answer: ${correctAnswer}\nStudent's Answer: ${userAnswer}` }],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Upstream API error" }, { status: res.status });
  }

  const data = await res.json() as { content?: Array<{ type: string; text: string }> };
  const text = data.content?.find(b => b.type === "text")?.text || "{}";

  try {
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to parse evaluation" }, { status: 500 });
  }
}
