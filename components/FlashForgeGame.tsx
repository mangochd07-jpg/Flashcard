"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:"#0F0E17", surface:"#1A1828", surfaceHi:"#231F38", border:"#2E2A45",
  violet:"#7C3AED", violetLt:"#A78BFA", amber:"#F59E0B",
  emerald:"#10B981", rose:"#F43F5E", sky:"#38BDF8",
  textPri:"#F0EEFF", textSec:"#9B93C9",
};

// ── Timer presets per difficulty level ───────────────────────────────────────
const TIMER_SECONDS: Record<number, number> = { 1: 30, 2: 45, 3: 60, 4: 90 };

// ── Types ─────────────────────────────────────────────────────────────────────
type TopicStats = { correct: number; total: number };
type Stats = {
  xp: number; streak: number; totalCorrect: number; totalAnswered: number;
  clearedL2: boolean; comebacked: number; speedBonus: number; voiceAnswers: number;
  byTopic: Record<string, TopicStats>; difficultIds: Set<number>;
};
type FileData =
  | { type: "text"; content: string }
  | { type: "image"; base64: string; mediaType: string; note?: string }
  | { type: "pdf"; base64: string; mediaType?: string };
type Card = { id: number; level: number; topic: string; question: string; answer: string; memoryTrick: string };
type UsageInfo = {
  inputTokens: number; outputTokens: number;
  requestsRemaining: string | null; tokensRemaining: string | null;
  tokensLimit: string | null; resetAt: string | null;
};


// ── Fallback deck ─────────────────────────────────────────────────────────────
const FALLBACK_CARDS = [
  { id:1,  level:1, topic:"Cell Biology",  question:"What is the primary function of the Mitochondria?", answer:"To generate most of the chemical energy (ATP) needed to power the cell's biochemical reactions.", memoryTrick:"Mitochondria = 'Mighty' Powerhouse of the cell!" },
  { id:2,  level:1, topic:"Cell Biology",  question:"What does DNA stand for?", answer:"Deoxyribonucleic Acid — the molecule carrying genetic instructions for development, functioning, and reproduction.", memoryTrick:"De-Oxygen-Ribose Necklace of Acids." },
  { id:3,  level:1, topic:"Cell Biology",  question:"Name the three parts of the Cell Theory.", answer:"1) All living things are made of cells. 2) The cell is the basic unit of life. 3) All cells come from pre-existing cells.", memoryTrick:"'All life, units, origin' — AUO." },
  { id:4,  level:1, topic:"History",       question:"In what year did World War II end?", answer:"1945 — Germany surrendered in May, Japan in September.", memoryTrick:"1945: 'The world was finally ALIVE again'." },
  { id:5,  level:1, topic:"Maths",         question:"State the Pythagorean Theorem.", answer:"In a right-angled triangle: a² + b² = c², where c is the hypotenuse.", memoryTrick:"'Pythagoras wore Square pants' — he squared all three sides." },
  { id:6,  level:2, topic:"Cell Biology",  question:"Explain the difference between mitosis and meiosis.", answer:"Mitosis: 2 identical diploid daughter cells (growth/repair). Meiosis: 4 genetically unique haploid cells (reproduction).", memoryTrick:"Meiosis → 'Me + 4 others'. Mitosis → 'My twin'." },
  { id:7,  level:2, topic:"Physics",       question:"Explain Newton's Second Law of Motion.", answer:"The acceleration of an object is proportional to net force and inversely proportional to its mass. F = ma.", memoryTrick:"'Fully Matches Action'." },
  { id:8,  level:2, topic:"History",       question:"Why was the Treaty of Versailles considered harsh on Germany?", answer:"Massive reparations, territory loss, military limits, and the 'war guilt' clause blaming Germany.", memoryTrick:"R.A.W.L. — Reparations, Army limited, War guilt, Land taken." },
  { id:9,  level:2, topic:"Chemistry",     question:"What is the difference between an atom and a molecule?", answer:"An atom is the smallest unit of an element. A molecule is two or more atoms bonded together.", memoryTrick:"Atom = alone. Molecule = married atoms." },
  { id:10, level:3, topic:"Maths",         question:"A rectangle has perimeter 36 cm and width 8 cm. Find its area.", answer:"36 = 2(l + 8) → l = 10 cm. Area = 10 × 8 = 80 cm².", memoryTrick:"Find unknown side from perimeter first, then area." },
  { id:11, level:3, topic:"Physics",       question:"A car accelerates from 0 to 20 m/s in 4 s. Mass = 1000 kg. Find force.", answer:"a = 20/4 = 5 m/s². F = 1000 × 5 = 5000 N.", memoryTrick:"Find acceleration first (Δv/t), then F = ma." },
  { id:12, level:3, topic:"Cell Biology",  question:"A cell is in a hypertonic solution. What happens?", answer:"Water moves out by osmosis; cell shrinks (crenation in animals, plasmolysis in plants).", memoryTrick:"Hypertonic outside → cell loses water → shrinks." },
  { id:13, level:4, topic:"Biology",       question:"Evaluate the fluid mosaic model of the cell membrane.", answer:"Phospholipid bilayer (hydrophilic heads out, hydrophobic tails in) + embedded proteins. Fluid = lateral movement; Mosaic = varied proteins. Enables transport, signalling, structural integrity.", memoryTrick:"Fluid = moves. Mosaic = mixed. Bilayer = double fat sheet." },
  { id:14, level:4, topic:"History",       question:"Analyse WWI causes using the MAIN acronym. Which was most significant?", answer:"Militarism, Alliances, Imperialism, Nationalism. Alliances most significant — turned a regional conflict into a world war via chain declarations.", memoryTrick:"MAIN: Militarism, Alliances, Imperialism, Nationalism." },
  { id:15, level:4, topic:"Chemistry",     question:"Using Le Chatelier's Principle, what happens to N₂+3H₂⇌2NH₃ (ΔH=−92kJ) when temperature rises?", answer:"Equilibrium shifts LEFT — endothermic reverse reaction is favoured, decreasing NH₃ yield.", memoryTrick:"Exothermic forward → heat is a product → extra heat shifts LEFT." },
];

function generateFlashcards(notes: string) {
  if (!notes || notes.trim().length < 30) return [...FALLBACK_CARDS];
  const lines = notes.split(/\n|\./).map(s => s.trim()).filter(s => s.length > 15);
  const parsed = lines.slice(0, 8).map((line, i) => ({
    id: 100 + i, level: (i % 4) + 1, topic: "Your Notes",
    question: `Explain this concept from your notes: "${line.substring(0, 80)}${line.length > 80 ? "…" : ""}"`,
    answer: line, memoryTrick: "Re-read your original notes to reinforce this.",
  }));
  return [...parsed, ...FALLBACK_CARDS];
}

const XP_PER_CORRECT = 20, XP_PER_LEVEL = 100;
const SPEED_BONUS_THRESHOLD = 0.5; // answered in top 50% of time → bonus XP
function xpLevel(xp: number) {
  return { lvl: Math.floor(xp / XP_PER_LEVEL) + 1, pct: ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100 };
}

const BADGES: Array<{ id: string; icon: string; label: string; desc: string; cond: (s: Stats) => boolean }> = [
  { id:"first_blood",   icon:"🩸", label:"First Blood",    desc:"First correct answer",          cond:s=>s.totalCorrect>=1 },
  { id:"hot_streak",    icon:"🔥", label:"Hot Streak",      desc:"5 correct in a row",            cond:s=>s.streak>=5 },
  { id:"concept_king",  icon:"👑", label:"Concept King",    desc:"Cleared a Level 2 card",        cond:s=>s.clearedL2 },
  { id:"no_mercy",      icon:"⚡", label:"No Mercy",         desc:"10 correct answers",             cond:s=>s.totalCorrect>=10 },
  { id:"perfectionist", icon:"💎", label:"Perfectionist",   desc:"90%+ accuracy (≥10 cards)",     cond:s=>s.totalAnswered>=10&&(s.totalCorrect/s.totalAnswered)>=0.9 },
  { id:"speedster",     icon:"⚡", label:"Speedster",        desc:"Answered before half-time 3×",  cond:s=>s.speedBonus>=3 },
  { id:"voice_star",    icon:"🎙️", label:"Voice Star",       desc:"Answered 5 cards by voice",     cond:s=>s.voiceAnswers>=5 },
  { id:"comeback_kid",  icon:"🔄", label:"Comeback Kid",    desc:"Got a wrong card right on retry",cond:s=>s.comebacked>=1 },
];

// ── File → base64 helper ──────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res((e.target!.result as string).split(",")[1]);
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

// ── Determine media type for Claude API ──────────────────────────────────────
function claudeMediaType(file: File) {
  const t = file.type;
  if (t.startsWith("image/")) return t;
  if (t === "application/pdf") return "application/pdf";
  return null; // text-based or unsupported natively
}

// ── Extract text/frames from uploaded file for Claude ────────────────────────
async function extractNotesFromFile(file: File): Promise<FileData> {
  const mt = claudeMediaType(file);
  const isText = file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name);
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");

  // Text files — read directly
  if (isText) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ type:"text", content: e.target!.result as string });
      r.readAsText(file);
    });
  }

  // Video — extract first frame as image snapshot
  if (isVideo) {
    const url = URL.createObjectURL(file);
    return new Promise(res => {
      const video = document.createElement("video");
      video.src = url; video.muted = true; video.playsInline = true;
      video.onloadeddata = () => {
        video.currentTime = 1;
        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(video.videoWidth, 800);
          canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
          canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
          const b64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
          URL.revokeObjectURL(url);
          res({ type:"image", base64: b64, mediaType:"image/jpeg", note:`Screenshot from video: ${file.name}` });
        };
      };
      video.onerror = () => { URL.revokeObjectURL(url); res({ type:"text", content: `[Video file: ${file.name} — describe its content for flashcards]` }); };
    });
  }

  // Audio — tell Claude the file name, ask for topic inference
  if (isAudio) {
    return { type:"text", content: `[Audio file uploaded: ${file.name}] Please generate general study flashcards about the topic suggested by this filename.` };
  }

  // Image or PDF — send as base64 to Claude vision
  if (mt) {
    const b64 = await fileToBase64(file);
    return { type: mt === "application/pdf" ? "pdf" : "image", base64: b64, mediaType: mt };
  }

  // Fallback for .docx / .pptx / .xlsx etc.
  return { type:"text", content: `[File: ${file.name}] Generate relevant study flashcards based on the topic this filename suggests.` };
}

// ── Claude API: generate cards from multimodal input ─────────────────────────
async function generateCardsWithClaude(fileData: FileData | null, extraNotes: string): Promise<{ cards: Card[]; usage?: UsageInfo } | null> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileData, notes: extraNotes }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { cards?: Card[]; usage?: UsageInfo };
    if (!data.cards || !Array.isArray(data.cards)) return null;
    return {
      cards: data.cards.map((c, i) => ({ ...c, id: 200 + i })) as Card[],
      usage: data.usage,
    };
  } catch {
    return null;
  }
}

// ── Claude API: evaluate answer ───────────────────────────────────────────────
async function evalAnswer(question: string, correctAnswer: string, userAnswer: string) {
  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, correctAnswer, userAnswer }),
    });
    if (!res.ok) throw new Error("eval failed");
    return await res.json();
  } catch {
    const ua = userAnswer.toLowerCase();
    const hits = correctAnswer.toLowerCase().split(/\s+/).filter(w=>w.length>4&&ua.includes(w)).length;
    const score = Math.min(100,Math.round((hits/6)*100));
    return { verdict:score>=70?"correct":score>=35?"partial":"incorrect", score, feedback:score>=70?"Good answer!":"Review the answer carefully.", encouragement:score>=70?"Keep it up! 🎉":"You've got this!" };
  }
}

// ── Circular countdown timer component ───────────────────────────────────────
function CountdownRing({ seconds, total, paused }: { seconds: number; total: number; paused: boolean }) {
  const R = 28, C = 2 * Math.PI * R;
  const fraction = seconds / total;
  const dash = fraction * C;
  const color = fraction > 0.5 ? T.emerald : fraction > 0.25 ? T.amber : T.rose;
  const urgent = fraction <= 0.25 && !paused;
  return (
    <div style={{ position:"relative", width:72, height:72, flexShrink:0 }}>
      <svg width="72" height="72" style={{ transform:"rotate(-90deg)", display:"block" }}>
        <circle cx="36" cy="36" r={R} fill="none" stroke={T.border} strokeWidth="4"/>
        <circle cx="36" cy="36" r={R} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${C}`}
          strokeLinecap="round"
          style={{ transition: paused ? "none" : "stroke-dasharray 1s linear, stroke 0.5s" }}
        />
      </svg>
      <div style={{
        position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        animation: urgent ? "pulse 0.6s ease-in-out infinite alternate" : "none",
      }}>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:18, color, lineHeight:1 }}>{seconds}</span>
        <span style={{ fontSize:9, color:T.textSec, letterSpacing:"0.05em" }}>sec</span>
      </div>
    </div>
  );
}

// ── Voice recorder component ──────────────────────────────────────────────────
function VoiceRecorder({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled: boolean }) {
  const [state, setState] = useState("idle"); // idle | recording | processing | done
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunksRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const startRecording = async () => {
    setError(""); setTranscript("");
    // Try Web Speech API first (best for real-time)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec: any = new SR();
      rec.continuous = false; rec.interimResults = true; rec.lang = "en-US";
      recognitionRef.current = rec;
      let finalText = "";
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        setTranscript(finalText + interim);
      };
      rec.onerror = (e: any) => { setError("Mic error: " + e.error); setState("idle"); };
      rec.onend = () => {
        setState("done");
        if (finalText.trim()) { onTranscript(finalText.trim()); }
        else if (transcript.trim()) { onTranscript(transcript.trim()); }
      };
      rec.start();
      setState("recording");
      return;
    }
    // Fallback: MediaRecorder + send to Claude for transcription
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t=>t.stop());
        setState("processing");
        const blob = new Blob(chunksRef.current, { type:"audio/webm" });
        const placeholder = "[Voice answer recorded — please type your answer too for best results]";
        setTranscript(placeholder); onTranscript(placeholder); setState("done");
      };
      mr.start();
      setState("recording");
    } catch { setError("Microphone access denied."); setState("idle"); }
  };

  const stopRecording = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; return; }
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
  };

  const recColor = state === "recording" ? T.rose : state === "done" ? T.emerald : T.violet;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <button
          disabled={disabled || state === "processing"}
          onClick={state === "recording" ? stopRecording : startRecording}
          style={{
            background: state==="recording" ? `rgba(244,63,94,0.15)` : T.surfaceHi,
            border:`1.5px solid ${recColor}`,
            borderRadius:12, padding:"10px 18px", cursor:"pointer", color:recColor,
            fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:8,
            transition:"all 0.2s",
          }}
        >
          <span style={{ fontSize:16, animation: state==="recording" ? "pulse 0.8s ease-in-out infinite alternate" : "none" }}>
            {state==="recording" ? "⏹" : state==="processing" ? "⏳" : state==="done" ? "✅" : "🎙️"}
          </span>
          {state==="idle" ? "Record answer" : state==="recording" ? "Stop recording" : state==="processing" ? "Processing…" : "Recorded!"}
        </button>
        {state === "done" && (
          <button onClick={()=>{setState("idle");setTranscript("");onTranscript("");}} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px", color:T.textSec, fontSize:12, cursor:"pointer" }}>
            Re-record
          </button>
        )}
      </div>
      {transcript && (
        <div style={{ background:T.surfaceHi, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontSize:13, color:T.textPri, lineHeight:1.5, fontStyle:"italic" }}>
          🎙️ "{transcript}"
        </div>
      )}
      {error && <div style={{ color:T.rose, fontSize:12 }}>{error}</div>}
    </div>
  );
}

// ── Main Game ─────────────────────────────────────────────────────────────────
export default function FlashForgeGame() {
  const [phase, setPhase] = useState("upload");
  const [notes, setNotes] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{ type: string; url: string | undefined; name: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deck, setDeck] = useState<Card[]>([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [inputMode, setInputMode] = useState("text"); // text | voice
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<{ verdict: string; feedback: string; encouragement: string; score?: number } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [timerOn, setTimerOn] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerTotal, setTimerTotal] = useState(30);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [stats, setStats] = useState<Stats>({
    xp:0, streak:0, totalCorrect:0, totalAnswered:0,
    clearedL2:false, comebacked:0, speedBonus:0, voiceAnswers:0,
    byTopic:{}, difficultIds:new Set<number>(),
  });
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const [newBadge, setNewBadge] = useState<{ id: string; icon: string; label: string; desc: string } | null>(null);
  const [reportData, setReportData] = useState<{ strong: Array<{ topic: string; acc: number }>; weak: Array<{ topic: string; acc: number }> } | null>(null);
  const [isFinalPhase, setIsFinalPhase] = useState(false);
  const [apiUsage, setApiUsage] = useState<UsageInfo | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timerRef = useRef<any>(null);
  const cardStartTime = useRef(Date.now());
  const fileRef = useRef<HTMLInputElement | null>(null);

  const currentCard = deck[queueIdx] ?? null;

  // ── Timer logic ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerOn || phase !== "game" && phase !== "final" || flipped || timerPaused || !currentCard) return;
    const total = TIMER_SECONDS[currentCard.level];
    setTimerTotal(total); setTimeLeft(total); setTimedOut(false);
    cardStartTime.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setTimedOut(true); setFlipped(true);
          setEvaluation({ verdict:"timeout", feedback:"Time's up! Review the answer below.", encouragement:"Speed up next time — you've got this!" });
          setStats(prev => ({ ...prev, streak: 0, totalAnswered: prev.totalAnswered + 1 }));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentCard, flipped, timerOn, timerPaused, phase]);

  // ── Badge check ───────────────────────────────────────────────────────────
  const checkBadges = useCallback((ns: Stats) => {
    BADGES.forEach(b => {
      if (!earnedBadges.has(b.id) && b.cond(ns)) {
        setEarnedBadges(p => new Set([...p, b.id]));
        setNewBadge(b); setTimeout(()=>setNewBadge(null), 3500);
      }
    });
  }, [earnedBadges]);

  // ── File handling ─────────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadedFile(f);
    const isImg = f.type.startsWith("image/");
    const isVid = f.type.startsWith("video/");
    const isAud = f.type.startsWith("audio/");
    const url = (isImg || isVid || isAud) ? URL.createObjectURL(f) : undefined;
    setFilePreview({ type: isImg?"image":isVid?"video":isAud?"audio":"doc", url, name:f.name });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0]; if (!f) return;
    setUploadedFile(f);
    const isImg = f.type.startsWith("image/");
    const isVid = f.type.startsWith("video/");
    const isAud = f.type.startsWith("audio/");
    const url = (isImg || isVid || isAud) ? URL.createObjectURL(f) : undefined;
    setFilePreview({ type: isImg?"image":isVid?"video":isAud?"audio":"doc", url, name:f.name });
  }

  // ── Start game ────────────────────────────────────────────────────────────
  async function startGame() {
    setIsGenerating(true);
    let cards: Card[] | null = null;
    if (uploadedFile) {
      const fileData = await extractNotesFromFile(uploadedFile);
      const result = await generateCardsWithClaude(fileData, notes);
      if (result) { cards = result.cards; if (result.usage) setApiUsage(result.usage); }
    } else if (notes.trim().length > 30) {
      const result = await generateCardsWithClaude(null, notes);
      if (result) { cards = result.cards; if (result.usage) setApiUsage(result.usage); }
    }
    if (!cards || cards.length < 3) cards = generateFlashcards(notes);
    setDeck([...cards].sort((a,b)=>a.level-b.level));
    setQueueIdx(0); setIsGenerating(false); setPhase("game");
  }

  // ── Submit answer ─────────────────────────────────────────────────────────
  async function submitAnswer(answerOverride?: string) {
    const ans = answerOverride ?? userAnswer;
    if (!ans.trim() || isEvaluating || !currentCard || flipped) return;
    clearInterval(timerRef.current);
    const elapsed = (Date.now() - cardStartTime.current) / 1000;
    const isSpeedAnswer = timerOn && elapsed < TIMER_SECONDS[currentCard.level] * SPEED_BONUS_THRESHOLD;
    const isVoice = inputMode === "voice";
    setIsEvaluating(true);
    const ev = await evalAnswer(currentCard.question, currentCard.answer, ans);
    setEvaluation(ev); setFlipped(true);
    const isCorrect = ev.verdict === "correct";
    const isPartial = ev.verdict === "partial";
    const wasWrong  = stats.difficultIds.has(currentCard.id);
    setStats(prev => {
      const topic = prev.byTopic[currentCard.topic] ?? { correct:0, total:0 };
      const newDiff = new Set(prev.difficultIds);
      if (!isCorrect && !isPartial) newDiff.add(currentCard.id);
      const ns = {
        ...prev,
        xp: prev.xp + (isCorrect ? XP_PER_CORRECT + (isSpeedAnswer?5:0) : isPartial?8:0),
        streak: isCorrect ? prev.streak+1 : 0,
        totalCorrect: prev.totalCorrect + (isCorrect?1:0),
        totalAnswered: prev.totalAnswered + 1,
        clearedL2: prev.clearedL2 || (currentCard.level===2 && isCorrect),
        comebacked: prev.comebacked + (isCorrect && wasWrong ? 1 : 0),
        speedBonus: prev.speedBonus + (isSpeedAnswer && isCorrect ? 1 : 0),
        voiceAnswers: prev.voiceAnswers + (isVoice ? 1 : 0),
        byTopic: { ...prev.byTopic, [currentCard.topic]:{ correct:topic.correct+(isCorrect?1:0), total:topic.total+1 } },
        difficultIds: newDiff,
      };
      checkBadges(ns); return ns;
    });
    if (!isCorrect) setDeck(prev => [...prev, { ...currentCard }]);
    setIsEvaluating(false);
  }

  function nextCard() {
    setFlipped(false); setUserAnswer(""); setEvaluation(null); setTimedOut(false);
    setInputMode("text");
    const next = queueIdx + 1;
    if (stats.totalAnswered % 10 === 0 && stats.totalAnswered > 0 && !isFinalPhase) {
      buildReport(); setPhase("report"); return;
    }
    if (next >= deck.length) { launchFinal(); return; }
    setQueueIdx(next);
  }

  function buildReport() {
    const t = Object.entries(stats.byTopic).map(([topic,v])=>({ topic, acc:v.total>0?Math.round((v.correct/v.total)*100):0 })).sort((a,b)=>b.acc-a.acc);
    setReportData({ strong:t.filter(x=>x.acc>=70).slice(0,3), weak:t.filter(x=>x.acc<70).slice(0,3) });
  }

  function resumeFromReport() {
    setPhase("game");
    const next = queueIdx + 1;
    if (next >= deck.length) { launchFinal(); return; }
    setQueueIdx(next);
  }

  function launchFinal() {
    const fd = deck.filter(c=>stats.difficultIds.has(c.id));
    if (!fd.length) { setPhase("done"); return; }
    setIsFinalPhase(true); setDeck(fd); setQueueIdx(0); setPhase("final");
  }

  const { lvl, pct } = xpLevel(stats.xp);
  const accuracy = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect/stats.totalAnswered)*100) : 0;

  // ── File preview thumbnail ─────────────────────────────────────────────────
  const FileThumb = () => {
    if (!filePreview) return null;
    return (
      <div style={{ position:"relative", marginTop:12, borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`, background:T.surfaceHi }}>
        {filePreview.type === "image" && <img src={filePreview.url} alt="preview" style={{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" }}/>}
        {filePreview.type === "video" && <video src={filePreview.url} controls style={{ width:"100%", maxHeight:200, display:"block" }}/>}
        {filePreview.type === "audio" && <audio src={filePreview.url} controls style={{ width:"100%", display:"block", padding:12 }}/>}
        {filePreview.type === "doc" && (
          <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:28 }}>{/pdf/i.test(filePreview.name)?"📄":/pptx?/i.test(filePreview.name)?"📊":/xlsx?|csv/i.test(filePreview.name)?"📈":/docx?/i.test(filePreview.name)?"📝":"📎"}</span>
            <span style={{ color:T.textPri, fontSize:14, fontWeight:500 }}>{filePreview.name}</span>
          </div>
        )}
        <button onClick={()=>{setUploadedFile(null);setFilePreview(null);}} style={{ position:"absolute", top:8, right:8, background:"rgba(15,14,23,0.7)", border:`1px solid ${T.border}`, borderRadius:8, color:T.textSec, fontSize:12, padding:"4px 8px", cursor:"pointer" }}>✕ Remove</button>
      </div>
    );
  };

  return (
    <div style={{ fontFamily:"'Inter',sans-serif", background:T.bg, minHeight:"100vh", color:T.textPri }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        .card-scene{width:100%;perspective:1400px}
        .card-inner{position:relative;width:100%;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.4,0,.2,1)}
        .card-inner.flipped{transform:rotateY(180deg)}
        .card-face{position:absolute;width:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:20px}
        .card-back{transform:rotateY(180deg)}
        .xp-bar{height:6px;border-radius:3px;background:${T.border};overflow:hidden}
        .xp-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,${T.violet},${T.violetLt});transition:width .5s ease}
        .verdict-correct{border:2px solid ${T.emerald};background:rgba(16,185,129,.09)}
        .verdict-partial{border:2px solid ${T.amber};background:rgba(245,158,11,.09)}
        .verdict-incorrect,.verdict-timeout{border:2px solid ${T.rose};background:rgba(244,63,94,.09)}
        .badge-toast{position:fixed;top:24px;right:24px;z-index:999;animation:slideIn .4s ease}
        @keyframes slideIn{from{transform:translateX(130px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes pulse{from{opacity:1;transform:scale(1)}to{opacity:.7;transform:scale(1.08)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
        .shake{animation:shake .4s ease}
        .btn-primary{background:${T.violet};color:#fff;border:none;padding:12px 28px;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:opacity .2s,transform .1s;font-family:inherit}
        .btn-primary:hover{opacity:.88;transform:translateY(-1px)}
        .btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none}
        .btn-ghost{background:transparent;color:${T.textSec};border:1px solid ${T.border};padding:10px 22px;border-radius:10px;font-size:14px;cursor:pointer;transition:border-color .2s,color .2s;font-family:inherit}
        .btn-ghost:hover{border-color:${T.violetLt};color:${T.violetLt}}
        textarea{background:${T.surfaceHi};border:1px solid ${T.border};border-radius:12px;color:${T.textPri};font-size:14px;padding:14px;resize:vertical;font-family:inherit;outline:none;width:100%;transition:border-color .2s}
        textarea:focus{border-color:${T.violet}}
        .level-pill{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.04em}
        .l1{background:rgba(56,189,248,.15);color:${T.sky}}
        .l2{background:rgba(167,139,250,.15);color:${T.violetLt}}
        .l3{background:rgba(245,158,11,.15);color:${T.amber}}
        .l4{background:rgba(244,63,94,.15);color:${T.rose}}
        .overlay{position:fixed;inset:0;background:rgba(15,14,23,.87);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:${T.surface};border:1px solid ${T.border};border-radius:24px;padding:36px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto}
        .drop-zone{border:2px dashed ${T.border};border-radius:14px;padding:32px 24px;text-align:center;cursor:pointer;transition:border-color .25s,background .25s}
        .drop-zone:hover,.drop-zone.active{border-color:${T.violet};background:rgba(124,58,237,.06)}
        .stat-card{background:${T.surfaceHi};border-radius:14px;padding:16px 20px}
        .shimmer{background:linear-gradient(135deg,${T.surface} 0%,${T.surfaceHi} 50%,${T.surface} 100%)}
        .tab-btn{padding:8px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid ${T.border};background:transparent;color:${T.textSec};font-family:inherit;transition:all .2s}
        .tab-btn.active{background:${T.violet};border-color:${T.violet};color:#fff}
        .input-row{display:flex;gap:10;margin-top:10px}
      `}</style>

      {/* ── Badge toast ── */}
      {newBadge && (
        <div className="badge-toast">
          <div style={{ background:T.surface, border:`1px solid ${T.violet}`, borderRadius:14, padding:"14px 20px", display:"flex", gap:12, alignItems:"center", boxShadow:`0 8px 32px rgba(124,58,237,.3)` }}>
            <span style={{ fontSize:30 }}>{newBadge.icon}</span>
            <div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13, color:T.violetLt }}>Badge Unlocked!</div>
              <div style={{ color:T.textPri, fontWeight:600 }}>{newBadge.label}</div>
              <div style={{ color:T.textSec, fontSize:12 }}>{newBadge.desc}</div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          UPLOAD PHASE
      ════════════════════════════════════════════ */}
      {phase === "upload" && (
        <div style={{ maxWidth:660, margin:"0 auto", padding:"52px 20px" }}>
          <div style={{ textAlign:"center", marginBottom:44 }}>
            <div style={{ fontSize:52, marginBottom:10 }}>🧠</div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:38, fontWeight:700, background:`linear-gradient(135deg,${T.violetLt},${T.sky})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>FlashForge</h1>
            <p style={{ color:T.textSec, marginTop:8, fontSize:16 }}>Upload anything. Beat the deck. Master the subject.</p>
          </div>

          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:28, marginBottom:20 }}>
            {/* Universal file drop */}
            <div
              className="drop-zone"
              onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add("active")}}
              onDragLeave={e=>e.currentTarget.classList.remove("active")}
              onDrop={e=>{e.currentTarget.classList.remove("active");handleDrop(e)}}
              onClick={()=>fileRef.current?.click()}
            >
              <div style={{ fontSize:36, marginBottom:10 }}>📎</div>
              <div style={{ color:T.textPri, fontWeight:600, marginBottom:4 }}>Drop any file here, or click to browse</div>
              <div style={{ color:T.textSec, fontSize:12, lineHeight:1.6 }}>
                Images (PNG, JPG, GIF) · PDFs · Videos (MP4, MOV) · Audio (MP3, WAV)<br/>
                Text files (TXT, MD) · Docs (DOCX, PPTX, XLSX)
              </div>
              <input ref={fileRef} type="file"
                accept="image/*,video/*,audio/*,.pdf,.txt,.md,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                onChange={handleFile} style={{ display:"none" }}
              />
            </div>
            <FileThumb />

            {/* Divider */}
            <div style={{ display:"flex", alignItems:"center", gap:12, margin:"20px 0", color:T.textSec }}>
              <div style={{ flex:1, height:1, background:T.border }}/><span style={{ fontSize:12, fontWeight:600 }}>AND / OR</span><div style={{ flex:1, height:1, background:T.border }}/>
            </div>

            {/* Notes textarea */}
            <label style={{ display:"block", color:T.textSec, fontSize:12, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>Paste notes (optional)</label>
            <textarea rows={5} placeholder="Paste textbook content, formulas, definitions… Or leave everything blank for a Biology demo." value={notes} onChange={e=>setNotes(e.target.value)} />

            {/* Timer toggle */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:20, padding:"12px 16px", background:T.surfaceHi, borderRadius:12 }}>
              <div>
                <div style={{ color:T.textPri, fontWeight:600, fontSize:14 }}>⏱️ Countdown timer</div>
                <div style={{ color:T.textSec, fontSize:12 }}>Level 1 = 30s · L2 = 45s · L3 = 60s · L4 = 90s</div>
              </div>
              <button
                onClick={()=>setTimerOn(t=>!t)}
                style={{ width:48, height:26, borderRadius:13, border:"none", cursor:"pointer", transition:"background .2s",
                  background:timerOn?T.violet:T.border, position:"relative" }}
              >
                <span style={{ position:"absolute", top:3, left:timerOn?26:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s", display:"block" }}/>
              </button>
            </div>
          </div>

          <button className="btn-primary" style={{ width:"100%", fontSize:16, padding:16 }} onClick={startGame} disabled={isGenerating}>
            {isGenerating ? "🧠 Generating flashcards…" : "Generate Flashcards →"}
          </button>
          <p style={{ textAlign:"center", color:T.textSec, fontSize:12, marginTop:10 }}>
            AI reads your file and creates cards automatically · works offline with demo Biology deck
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════
          GAME / FINAL PHASE
      ════════════════════════════════════════════ */}
      {(phase === "game" || phase === "final") && currentCard && (
        <div style={{ maxWidth:920, margin:"0 auto", padding:"20px 14px", display:"flex", gap:20, flexWrap:"wrap" }}>

          {/* ── Sidebar ── */}
          <div style={{ width:216, flexShrink:0 }}>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:18, marginBottom:14 }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:12, color:T.textSec, marginBottom:12, letterSpacing:"0.08em", textTransform:"uppercase" }}>Your Stats</div>
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:T.violetLt, fontWeight:600, fontSize:13 }}>Level {lvl}</span>
                  <span style={{ color:T.textSec, fontSize:12 }}>{stats.xp % XP_PER_LEVEL}/{XP_PER_LEVEL} XP</span>
                </div>
                <div className="xp-bar"><div className="xp-fill" style={{ width:`${pct}%` }}/></div>
              </div>
              {[
                { label:"🔥 Streak",     val:stats.streak },
                { label:"✅ Correct",    val:stats.totalCorrect },
                { label:"🎯 Accuracy",   val:`${accuracy}%` },
                { label:"🎙️ Voice ans.", val:stats.voiceAnswers },
                { label:"📦 Remaining",  val:deck.length - queueIdx },
              ].map(r=>(
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:T.textSec, fontSize:12 }}>{r.label}</span>
                  <span style={{ color:T.textPri, fontWeight:600, fontSize:12 }}>{r.val}</span>
                </div>
              ))}
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:18 }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:11, color:T.textSec, marginBottom:10, letterSpacing:"0.08em", textTransform:"uppercase" }}>Badges</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {BADGES.map(b=><div key={b.id} title={`${b.label}: ${b.desc}`} style={{ fontSize:20, opacity:earnedBadges.has(b.id)?1:0.18, transition:"opacity .3s", cursor:"help" }}>{b.icon}</div>)}
              </div>
            </div>

            {apiUsage && (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:18, marginTop:14 }}>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:11, color:T.textSec, marginBottom:10, letterSpacing:"0.08em", textTransform:"uppercase" }}>API Usage</div>
                {[
                  { label:"Tokens in",  val: apiUsage.inputTokens.toLocaleString() },
                  { label:"Tokens out", val: apiUsage.outputTokens.toLocaleString() },
                  { label:"Remaining",  val: apiUsage.tokensRemaining ? `${Number(apiUsage.tokensRemaining).toLocaleString()} / ${Number(apiUsage.tokensLimit ?? 0).toLocaleString()}` : "—" },
                ].map(r=>(
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ color:T.textSec, fontSize:11 }}>{r.label}</span>
                    <span style={{ color:T.violetLt, fontWeight:600, fontSize:11 }}>{r.val}</span>
                  </div>
                ))}
                {apiUsage.resetAt && (
                  <div style={{ marginTop:8, fontSize:10, color:T.textSec, textAlign:"center" }}>
                    Resets {new Date(apiUsage.resetAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Main area ── */}
          <div style={{ flex:1, minWidth:280 }}>
            {phase==="final" && (
              <div style={{ background:"rgba(244,63,94,.1)", border:`1px solid ${T.rose}`, borderRadius:12, padding:"10px 16px", marginBottom:14, display:"flex", gap:8, alignItems:"center" }}>
                <span>⚡</span><span style={{ color:T.rose, fontWeight:600, fontSize:14 }}>Final Challenge — weak cards only</span>
              </div>
            )}

            {/* Progress + timer row */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ color:T.textSec, fontSize:12 }}>Card {queueIdx+1} of {deck.length}</span>
                  <span className={`level-pill l${currentCard.level}`}>L{currentCard.level} {["","Recall","Understanding","Application","Exam"][currentCard.level]}</span>
                </div>
                <div className="xp-bar"><div className="xp-fill" style={{ width:`${((queueIdx+1)/deck.length)*100}%`, background:`linear-gradient(90deg,${T.violet},${T.amber})` }}/></div>
              </div>
              {timerOn && !flipped && (
                <CountdownRing seconds={timeLeft} total={timerTotal} paused={timerPaused} />
              )}
              {timerOn && !flipped && (
                <button onClick={()=>setTimerPaused(p=>!p)} style={{ background:T.surfaceHi, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 10px", color:T.textSec, fontSize:13, cursor:"pointer" }} title="Pause timer">
                  {timerPaused ? "▶" : "⏸"}
                </button>
              )}
            </div>

            {/* Flashcard */}
            <div className="card-scene" style={{ height:220, marginBottom:18, position:"relative" }}>
              <div className={`card-inner${flipped?" flipped":""}${timedOut?" shake":""}`} style={{ height:220 }}>
                {/* Front */}
                <div className="card-face shimmer" style={{ height:220, display:"flex", flexDirection:"column", justifyContent:"center", padding:"28px 30px", border:`1px solid ${T.border}` }}>
                  <div style={{ color:T.textSec, fontSize:11, fontWeight:600, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.07em" }}>{currentCard.topic}</div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:19, fontWeight:600, lineHeight:1.45, color:T.textPri }}>{currentCard.question}</div>
                </div>
                {/* Back */}
                <div className="card-face card-back" style={{ height:220, background:`radial-gradient(circle at 30% 40%,rgba(124,58,237,.28),${T.surface} 65%)`, border:`1px solid ${T.violet}`, padding:"22px 30px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
                  <div style={{ color:T.violetLt, fontSize:11, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>Answer</div>
                  <div style={{ color:T.textPri, fontSize:15, lineHeight:1.6, marginBottom:10 }}>{currentCard.answer}</div>
                  {currentCard.memoryTrick && (
                    <div style={{ background:"rgba(245,158,11,.09)", border:"1px solid rgba(245,158,11,.25)", borderRadius:8, padding:"8px 12px", fontSize:12, color:T.amber }}>
                      💡 {currentCard.memoryTrick}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Answer input area ── */}
            {!flipped && !timedOut && (
              <div>
                {/* Input mode tabs */}
                <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                  {[{id:"text",label:"⌨️ Type answer"},{id:"voice",label:"🎙️ Voice answer"}].map(m=>(
                    <button key={m.id} className={`tab-btn${inputMode===m.id?" active":""}`} onClick={()=>setInputMode(m.id)}>{m.label}</button>
                  ))}
                </div>

                {inputMode === "text" && (
                  <div>
                    <textarea rows={3} placeholder="Type your answer here…" value={userAnswer} onChange={e=>setUserAnswer(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)submitAnswer()}} />
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:10, gap:10 }}>
                      <button className="btn-ghost" onClick={()=>{clearInterval(timerRef.current);setFlipped(true);setEvaluation({verdict:"skipped",feedback:"You revealed the answer.",encouragement:"Try answering first next time!"});}}>Reveal</button>
                      <button className="btn-primary" onClick={()=>submitAnswer()} disabled={isEvaluating||!userAnswer.trim()}>
                        {isEvaluating?"Checking…":"Check Answer"}
                      </button>
                    </div>
                  </div>
                )}

                {inputMode === "voice" && (
                  <div>
                    <VoiceRecorder
                      disabled={isEvaluating}
                      onTranscript={t => {
                        setUserAnswer(t);
                        if (t && t !== "[Voice answer recorded — please type your answer too for best results]") {
                          setTimeout(() => submitAnswer(t), 300);
                        }
                      }}
                    />
                    {userAnswer && userAnswer.includes("[Voice answer") && (
                      <div style={{ marginTop:10 }}>
                        <textarea rows={2} placeholder="Browser couldn't transcribe — type your answer here" value={userAnswer.includes("[Voice")?"":userAnswer} onChange={e=>setUserAnswer(e.target.value)}/>
                        <button className="btn-primary" style={{ marginTop:8, width:"100%" }} onClick={()=>submitAnswer()} disabled={!userAnswer.trim()||isEvaluating}>Check Answer</button>
                      </div>
                    )}
                    <button className="btn-ghost" style={{ marginTop:10 }} onClick={()=>{clearInterval(timerRef.current);setFlipped(true);setEvaluation({verdict:"skipped",feedback:"You revealed the answer.",encouragement:"Try answering first next time!"});}}>
                      Reveal answer instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Timeout message ── */}
            {timedOut && evaluation?.verdict === "timeout" && (
              <div style={{ background:"rgba(244,63,94,.1)", border:`1px solid ${T.rose}`, borderRadius:12, padding:"12px 16px", marginBottom:12, color:T.rose, fontWeight:600 }}>
                ⏰ Time&apos;s up! The answer has been revealed.
              </div>
            )}

            {/* ── Verdict ── */}
            {flipped && evaluation && (
              <div className={`verdict-${evaluation.verdict === "skipped" ? "incorrect" : evaluation.verdict}`} style={{ borderRadius:14, padding:"14px 18px", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:22 }}>
                    {evaluation.verdict==="correct"?"✅":evaluation.verdict==="partial"?"🟡":evaluation.verdict==="timeout"?"⏰":"❌"}
                  </span>
                  <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:15,
                    color:evaluation.verdict==="correct"?T.emerald:evaluation.verdict==="partial"?T.amber:T.rose }}>
                    {evaluation.verdict==="correct"?"Correct!":evaluation.verdict==="partial"?"Partially correct":evaluation.verdict==="timeout"?"Time's up!":"Incorrect"}
                    {evaluation.verdict==="correct" && <span style={{ color:T.amber, marginLeft:8, fontSize:13 }}>+{XP_PER_CORRECT} XP</span>}
                  </span>
                </div>
                <p style={{ color:T.textSec, fontSize:13, marginBottom:4 }}>{evaluation.feedback}</p>
                <p style={{ color:T.textPri, fontSize:13, fontStyle:"italic" }}>{evaluation.encouragement}</p>
              </div>
            )}
            {flipped && <button className="btn-primary" style={{ width:"100%" }} onClick={nextCard}>Next Card →</button>}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          PROGRESS REPORT MODAL
      ════════════════════════════════════════════ */}
      {phase==="report" && reportData && (
        <div className="overlay">
          <div className="modal">
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📊</div>
              <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:700 }}>Progress Report</h2>
              <p style={{ color:T.textSec, marginTop:6 }}>Every 10 cards — here's how you're doing</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
              {[{label:"Score",val:`${stats.totalCorrect}/${stats.totalAnswered}`},{label:"Accuracy",val:`${accuracy}%`},{label:"Total XP",val:stats.xp},{label:"🔥 Streak",val:stats.streak}].map(s=>(
                <div key={s.label} className="stat-card">
                  <div style={{ color:T.textSec, fontSize:12, fontWeight:600, marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:24, fontWeight:700, color:T.violetLt }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:28 }}>
              <div>
                <div style={{ color:T.emerald, fontSize:12, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>💪 Strong</div>
                {reportData.strong.length===0?<p style={{ color:T.textSec, fontSize:13 }}>Keep going!</p>:reportData.strong.map(t=>(
                  <div key={t.topic} style={{ color:T.textSec, fontSize:13, marginBottom:4 }}>{t.topic} — <strong style={{ color:T.emerald }}>{t.acc}%</strong></div>
                ))}
              </div>
              <div>
                <div style={{ color:T.rose, fontSize:12, fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.07em" }}>⚠️ Needs work</div>
                {reportData.weak.length===0?<p style={{ color:T.textSec, fontSize:13 }}>All good!</p>:reportData.weak.map(t=>(
                  <div key={t.topic} style={{ color:T.textSec, fontSize:13, marginBottom:4 }}>{t.topic} — <strong style={{ color:T.rose }}>{t.acc}%</strong></div>
                ))}
              </div>
            </div>
            <button className="btn-primary" style={{ width:"100%" }} onClick={resumeFromReport}>Continue →</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          DONE SCREEN
      ════════════════════════════════════════════ */}
      {phase==="done" && (
        <div style={{ maxWidth:560, margin:"0 auto", padding:"72px 20px", textAlign:"center" }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🏆</div>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:32, fontWeight:700, marginBottom:12 }}>Session Complete!</h1>
          <p style={{ color:T.textSec, fontSize:15, marginBottom:32 }}>You crushed every card — including the hard ones.</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:32 }}>
            {[{label:"Score",val:`${stats.totalCorrect}/${stats.totalAnswered}`},{label:"Accuracy",val:`${accuracy}%`},{label:"Total XP",val:stats.xp}].map(s=>(
              <div key={s.label} className="stat-card">
                <div style={{ color:T.textSec, fontSize:11, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700, color:T.violetLt }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:32 }}>
            <div style={{ color:T.textSec, fontSize:12, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>Badges Earned</div>
            <div style={{ display:"flex", justifyContent:"center", gap:14, flexWrap:"wrap" }}>
              {BADGES.map(b=><div key={b.id} title={b.label} style={{ fontSize:32, opacity:earnedBadges.has(b.id)?1:0.14, transition:"opacity .3s" }}>{b.icon}</div>)}
            </div>
          </div>
          <button className="btn-primary" onClick={()=>{
            setPhase("upload"); setStats({xp:0,streak:0,totalCorrect:0,totalAnswered:0,clearedL2:false,comebacked:0,speedBonus:0,voiceAnswers:0,byTopic:{},difficultIds:new Set()});
            setEarnedBadges(new Set()); setNotes(""); setUploadedFile(null); setFilePreview(null); setIsFinalPhase(false);
          }}>Study Again →</button>
        </div>
      )}
    </div>
  );
}
