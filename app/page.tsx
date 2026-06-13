"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type Lang = "uz" | "ru" | "en";

function GemIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="currentColor">
      <path d="M14 2.5L5 9.5 2 14l12 11.5L26 14l-3-4.5L14 2.5z" opacity="0.3" />
      <path d="M14 2.5l9 7-9 13.5L5 9.5l9-7z" opacity="0.6" />
      <path d="M14 2.5L5 9.5h18L14 2.5z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const CONTENT: Record<Lang, {
  trial: string;
  eyebrow: string;
  title: string;
  tagline: string;
  chips: { icon: string; text: string }[];
  cta: string;
  footer: string;
}> = {
  uz: {
    trial: "Boshlash →",
    eyebrow: "AI biznes maslahatchi",
    title: "Consultant AI",
    tagline: "Biznesingizning har bir bosqichida yoningizda.",
    chips: [
      { icon: "🏪", text: "Kompaniya qanday ro'yxatdan o'tkaziladi?" },
      { icon: "📋", text: "Biznes-reja yozib ber" },
      { icon: "⚖️", text: "Yakka tartibda qanday soliqlar to'layman?" },
      { icon: "📈", text: "Bozor imkoniyatlarini tahlil qil" },
    ],
    cta: "Suhbatni boshlash →",
    footer: "Har doim tayyor · Ishonchli · Aniq",
  },
  ru: {
    trial: "Начать →",
    eyebrow: "ИИ бизнес-советник",
    title: "Consultant AI",
    tagline: "Рядом с вами на каждом этапе пути.",
    chips: [
      { icon: "🏪", text: "Как зарегистрировать компанию?" },
      { icon: "📋", text: "Напиши бизнес-план" },
      { icon: "⚖️", text: "Какие налоги платить самозанятым?" },
      { icon: "📈", text: "Проанализируй возможности рынка" },
    ],
    cta: "Начать разговор →",
    footer: "Всегда готов · Надёжно · Точно",
  },
  en: {
    trial: "Start →",
    eyebrow: "AI Business Advisor",
    title: "Consultant AI",
    tagline: "Your companion at every step of the journey.",
    chips: [
      { icon: "🏪", text: "How do I register a company?" },
      { icon: "📋", text: "Write a business plan outline" },
      { icon: "⚖️", text: "What taxes apply to freelancers?" },
      { icon: "📈", text: "Find market opportunities" },
    ],
    cta: "Start a conversation →",
    footer: "Always ready · Reliable · Precise",
  },
};

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("uz");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("cai-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.style.overflowY = "auto";
    return () => { document.body.style.overflowY = ""; };
  }, []);

  const t = CONTENT[lang];

  return (
    <div className="landing">
      <div className="landing-bg-glow" />

      {/* ── Navbar ─────────────────────────── */}
      <nav className="landing-topbar">
        <div className="logo">
          <div className="logo-icon"><GemIcon size={15} /></div>
          <span className="logo-wordmark">
            Consultant <span className="logo-accent">AI</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="lang-switch">
            {(["uz", "ru", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                className={`lang-btn${lang === l ? " lang-active" : ""}`}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            className="theme-toggle"
            onClick={() => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); localStorage.setItem("cai-theme", next); }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <Link href="/chat" className="landing-trial-btn">{t.trial}</Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-gem-wrap"><GemIcon size={36} /></div>

        <p className="landing-eyebrow">{t.eyebrow}</p>
        <h1 className="landing-title">
          <span className="landing-title-accent">{t.title}</span>
        </h1>
        <p className="landing-tagline">{t.tagline}</p>

        {/* Prompt chips */}
        <div className="landing-chips">
          {t.chips.map((c, i) => (
            <Link key={i} href="/chat" className="landing-chip">
              <span>{c.icon}</span>
              <span>{c.text}</span>
            </Link>
          ))}
        </div>

        <Link href="/chat" className="landing-cta">{t.cta}</Link>
      </section>

      <p className="landing-footer">{t.footer}</p>
    </div>
  );
}
