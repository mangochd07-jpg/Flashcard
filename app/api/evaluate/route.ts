import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question, correctAnswer, userAnswer } = await req.json();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `You are a strict but encouraging tutor. Respond ONLY with JSON, no markdown:\n{"verdict":"correct"|"partial"|"incorrect","score":0-100,"feedback":"1-2 sentences","encouragement":"short motivational line"}` }] },
        contents: [{ parts: [{ text: `Question: ${question}\nCorrect Answer: ${correctAnswer}\nStudent's Answer: ${userAnswer}` }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
      }),
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Upstream API error" }, { status: res.status });
  }

  const data = await res.json() as {
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  try {
    const result = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to parse evaluation" }, { status: 500 });
  }
}
