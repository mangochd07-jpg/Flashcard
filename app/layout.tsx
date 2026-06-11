import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlashForge — AI Flashcard Game",
  description: "Upload your notes. Beat the deck. Master the subject.",
  openGraph: {
    title: "FlashForge",
    description: "AI-powered gamified flashcard learning",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
