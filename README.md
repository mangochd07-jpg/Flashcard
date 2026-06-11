# 🧠 FlashForge — AI Flashcard Learning Game

Upload your notes. Beat the deck. Master the subject.

Built with **Next.js 14 · Supabase · Vercel · Anthropic Claude API**

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Inline design tokens (Space Grotesk + Inter) |
| AI Evaluation | Anthropic `claude-sonnet-4-20250514` |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |

---

## Local Development

```bash
git clone https://github.com/YOUR_USERNAME/flashforge
cd flashforge
npm install
cp .env.local.example .env.local
# fill in your Supabase URL + anon key
npm run dev
```

---

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Copy your **Project URL** and **anon key** from Settings → API
4. Add them to `.env.local`

### Tables created

- **`game_sessions`** — one row per completed game. Tracks XP, accuracy, badges, strong/weak topics, anonymous fingerprint.
- **`card_attempts`** — one row per card answered. Tracks verdict, score, attempt number (for spaced repetition analysis).

---

## Vercel Deployment

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — done ✅

---

## Features

- 📤 Paste notes or upload `.txt`/`.md` files
- 🤖 Claude AI evaluates free-text answers (correct / partial / incorrect)
- 🔁 Spaced repetition — wrong cards reappear
- 📈 4 difficulty levels (Recall → Exam-style)
- 🏆 XP, streaks, 6 badges, progress reports every 10 cards
- 💾 Every session + card attempt saved to Supabase
- ✨ 3D card flip animation with holographic reveal

---

## License

MIT
