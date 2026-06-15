import { NextRequest, NextResponse } from "next/server";

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GroqContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

const CARD_PROMPT = `Based on ALL the above content, generate exactly 12 flashcard questions covering key concepts.
Return ONLY a JSON array, no markdown, no preamble:
[{"id":1,"level":1,"topic":"Subject","question":"...","answer":"...","memoryTrick":"..."},...]
Rules: level 1=recall, 2=understanding, 3=application, 4=exam-style. 3 cards each level.`;

function parseCards(raw: string) {
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function generateWithGroq(
  fileData: { type: "text"; content: string } | { type: "image"; base64: string; mediaType: string; note?: string } | null,
  notes: string
) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set. Add it in Vercel → Settings → Environment Variables." },
      { status: 500 }
    );
  }

  const isImage = fileData?.type === "image";
  const model = isImage ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

  let userContent: string | GroqContentPart[];

  if (isImage && fileData.type === "image") {
    userContent = [
      { type: "image_url", image_url: { url: `data:${fileData.mediaType};base64,${fileData.base64}` } },
      { type: "text", text: `${fileData.note ? fileData.note + "\n" : ""}${notes ? notes + "\n\n" : ""}${CARD_PROMPT}` },
    ];
  } else {
    let text = "";
    if (fileData?.type === "text") text += fileData.content + "\n\n";
    if (notes) text += notes + "\n\n";
    text += CARD_PROMPT;
    userContent = text;
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a study material expert. Extract key concepts and generate high-quality flashcards. Always respond with pure JSON array only.",
        },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    return NextResponse.json(
      { error: err?.error?.message ?? `Groq error ${res.status}` },
      { status: res.status }
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  const raw = data.choices?.[0]?.message?.content || "[]";
  const usage = {
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    requestsRemaining: null,
    tokensRemaining: null,
    tokensLimit: null,
    resetAt: null,
  };

  try {
    const cards = parseCards(raw);
    return NextResponse.json({ cards, usage });
  } catch {
    return NextResponse.json({ error: "Failed to parse cards", raw }, { status: 500 });
  }
}

async function generateWithGemini(
  fileData: { type: "pdf"; base64: string } | null,
  notes: string
) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { error: "PDF upload requires GEMINI_API_KEY. Please paste your PDF content as plain text instead." },
      { status: 400 }
    );
  }

  const parts: GeminiPart[] = [];
  if (fileData?.type === "pdf") {
    parts.push({ inline_data: { mime_type: "application/pdf", data: fileData.base64 } });
  }
  if (notes) parts.push({ text: notes });
  parts.push({ text: CARD_PROMPT });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "You are a study material expert. Always respond with pure JSON array only." }],
        },
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 3000, temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
    const msg = err?.error?.message ?? err?.error?.status ?? `Gemini error ${res.status}`;
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const usage = {
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    requestsRemaining: null,
    tokensRemaining: null,
    tokensLimit: null,
    resetAt: null,
  };

  try {
    const cards = parseCards(raw);
    return NextResponse.json({ cards, usage });
  } catch {
    return NextResponse.json({ error: "Failed to parse cards from PDF.", raw }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { fileData, notes } = await req.json();

  if (fileData?.type === "pdf") {
    return generateWithGemini(fileData, notes);
  }

  return generateWithGroq(fileData, notes);
}
