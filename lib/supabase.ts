import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ────────────────────────────────────────────────────────────────────
export interface GameSession {
  id?: string;
  created_at?: string;
  user_fingerprint: string;   // anonymous browser fingerprint
  notes_length: number;        // chars of notes uploaded
  total_cards: number;
  total_answered: number;
  total_correct: number;
  accuracy: number;
  final_xp: number;
  badges_earned: string[];     // badge IDs
  weak_topics: string[];
  strong_topics: string[];
  completed: boolean;
}

export interface CardAttempt {
  id?: string;
  session_id: string;
  card_id: number;
  card_level: number;
  topic: string;
  question: string;
  user_answer: string;
  verdict: "correct" | "partial" | "incorrect";
  score: number;
  attempt_number: number;      // 1 = first try, 2+ = spaced repetition retry
  created_at?: string;
}

// ── Save a completed session ─────────────────────────────────────────────────
export async function saveSession(session: Omit<GameSession, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("game_sessions")
    .insert(session)
    .select("id")
    .single();
  if (error) console.error("saveSession error:", error);
  return data?.id ?? null;
}

// ── Save individual card attempts ────────────────────────────────────────────
export async function saveCardAttempts(attempts: Omit<CardAttempt, "id" | "created_at">[]) {
  if (!attempts.length) return;
  const { error } = await supabase.from("card_attempts").insert(attempts);
  if (error) console.error("saveCardAttempts error:", error);
}

// ── Leaderboard: top sessions by XP ─────────────────────────────────────────
export async function fetchLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("user_fingerprint, final_xp, accuracy, total_correct, badges_earned, created_at")
    .eq("completed", true)
    .order("final_xp", { ascending: false })
    .limit(limit);
  if (error) console.error("fetchLeaderboard error:", error);
  return data ?? [];
}
