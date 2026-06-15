import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question, correctAnswer, userAnswer } = await req.json();

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a strict but encouraging tutor. Respond ONLY with JSON, no markdown:\n{"verdict":"correct"|"partial"|"incorrect","score":0-100,"feedback":"1-2 sentences","encouragement":"short motivational line"}`,
        },
        {
          role: "user",
          content: `Question: ${question}\nCorrect Answer: ${correctAnswer}\nStudent's Answer: ${userAnswer}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Upstream API error" }, { status: res.status });
  }

  const data = (await res.json()) as {
    choices?: Array<{ message: { content: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content || "{}";

  try {
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to parse evaluation" }, { status: 500 });
  }
}
