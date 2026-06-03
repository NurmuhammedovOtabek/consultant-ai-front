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
  tagline: string;
  sub: string;
  cta: string;
  stat_companies: string;
  stat_laws: string;
  stat_tools: string;
  how_title: string;
  steps: { num: string; title: string; desc: string }[];
  features: { icon: string; title: string; desc: string }[];
  footer: string;
}> = {
  uz: {
    trial: "Bepul sinab ko'ring",
    tagline: "O'zbekiston SMBlari uchun AI maslahatchi",
    sub: "Biznes boshlash, raqobat tahlili, qonun qidirish — barchasi bir joyda. 1.6 mln kompaniya ma'lumotlari asosida real javoblar.",
    cta: "Bepul sinab ko'ring →",
    stat_companies: "kompaniya",
    stat_laws: "qonun",
    stat_tools: "vosita",
    how_title: "Qanday ishlaydi?",
    steps: [
      { num: "1", title: "Savol bering", desc: "O'zbek, rus yoki ingliz tilida istalgan savol yozing" },
      { num: "2", title: "AI tahlil qiladi", desc: "1.6 mln kompaniya va 1800+ qonun asosida real vaqtda tahlil" },
      { num: "3", title: "Aniq javob oling", desc: "Haqiqiy ma'lumotlarga asoslangan tavsiyalar va ko'rsatkichlar" },
    ],
    features: [
      { icon: "🏪", title: "Bozor tahlili", desc: "Istalgan tuman yoki shaharda raqobat zichligi va imkoniyatlar" },
      { icon: "🔍", title: "Kompaniya tekshiruvi", desc: "INN bo'yicha qarzlar, sud ishlari va kompaniya tarixi" },
      { icon: "⚖️", title: "Qonun qidirish", desc: "1800+ rasmiy qonun va me'yoriy hujjatlar bazasidan qidirish" },
      { icon: "💰", title: "Valyuta va Boj", desc: "Markaziy bank kurslari va import boj stavkalari kalkulyatori" },
      { icon: "🤝", title: "Hamkorlar topish", desc: "Yaqin atrofdagi banklar, buxgalterlar, yuristlar, ta'minotchilar" },
      { icon: "🎯", title: "Grant va kreditlar", desc: "Davlat dasturlari va kichik biznes uchun imtiyozli kreditlar" },
    ],
    footer: "Humora.uz ma'lumotlari asosida · Real vaqt ma'lumotlari",
  },
  ru: {
    trial: "Попробовать бесплатно",
    tagline: "ИИ-советник для малого бизнеса Узбекистана",
    sub: "Начать бизнес, найти конкурентов, проверить законы — всё в одном месте. Реальные ответы на основе 1,6 млн компаний.",
    cta: "Попробовать бесплатно →",
    stat_companies: "компаний",
    stat_laws: "законов",
    stat_tools: "инструментов",
    how_title: "Как это работает?",
    steps: [
      { num: "1", title: "Задайте вопрос", desc: "На узбекском, русском или английском — любой вопрос" },
      { num: "2", title: "ИИ анализирует", desc: "1,6 млн компаний и 1800+ законов в реальном времени" },
      { num: "3", title: "Получите ответ", desc: "Точные рекомендации на основе реальных данных и ссылок" },
    ],
    features: [
      { icon: "🏪", title: "Анализ рынка", desc: "Плотность конкуренции в любом районе или городе" },
      { icon: "🔍", title: "Проверка компании", desc: "Долги, судебные дела и история по ИНН" },
      { icon: "⚖️", title: "Поиск законов", desc: "1800+ официальных законов и нормативных актов" },
      { icon: "💰", title: "Валюта и Таможня", desc: "Курсы ЦБ в реальном времени и расчёт таможенных пошлин" },
      { icon: "🤝", title: "Поиск партнёров", desc: "Ближайшие банки, бухгалтеры, юристы, поставщики" },
      { icon: "🎯", title: "Гранты и кредиты", desc: "Государственные программы и льготные кредиты для МСБ" },
    ],
    footer: "На основе данных Humora.uz · Данные в реальном времени",
  },
  en: {
    trial: "Try for free",
    tagline: "AI business advisor for Uzbekistan's SMBs",
    sub: "Start a business, find competitors, check laws — all in one place. Real answers powered by 1.6M company records.",
    cta: "Try for free →",
    stat_companies: "companies",
    stat_laws: "laws",
    stat_tools: "tools",
    how_title: "How does it work?",
    steps: [
      { num: "1", title: "Ask a question", desc: "In Uzbek, Russian, or English — any business question" },
      { num: "2", title: "AI analyses", desc: "1.6M companies and 1800+ laws analysed in real-time" },
      { num: "3", title: "Get a real answer", desc: "Precise recommendations backed by actual data and sources" },
    ],
    features: [
      { icon: "🏪", title: "Market Analysis", desc: "Competition density in any district or city of Uzbekistan" },
      { icon: "🔍", title: "Company Check", desc: "Debts, court cases and full history by INN" },
      { icon: "⚖️", title: "Law Search", desc: "1800+ official laws and regulatory documents" },
      { icon: "💰", title: "Rates & Customs", desc: "Real-time CBU exchange rates and import duty calculator" },
      { icon: "🤝", title: "Find Partners", desc: "Nearby banks, accountants, lawyers and suppliers" },
      { icon: "🎯", title: "Grants & Loans", desc: "Government programs and subsidized loans for SMBs" },
    ],
    footer: "Powered by Humora.uz data · Real-time information",
  },
};

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("uz");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("humora-theme") as "dark" | "light" | null;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("humora-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.style.overflowY = "auto";
    return () => {
      document.body.style.overflowY = "";
    };
  }, []);

  const t = CONTENT[lang];

  return (
    <div className="landing">
      <div className="landing-bg-glow" />

      {/* ── Navbar ───────────────────────────────── */}
      <nav className="landing-topbar">
        <div className="logo">
          <div className="logo-icon"><GemIcon size={15} /></div>
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
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <Link href="/chat" className="landing-trial-btn">{t.trial}</Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-gem-wrap"><GemIcon size={40} /></div>
        <h1 className="landing-title">
          AI <span className="landing-title-accent">Maslahatchi</span>
        </h1>
        <p className="landing-tagline">{t.tagline}</p>
        <p className="landing-sub">{t.sub}</p>

        <div className="landing-stats">
          <div className="landing-stat-item">
            <span className="landing-stat-num">1.6M</span>
            <span className="landing-stat-label">{t.stat_companies}</span>
          </div>
          <div className="landing-stat-sep" />
          <div className="landing-stat-item">
            <span className="landing-stat-num">1800+</span>
            <span className="landing-stat-label">{t.stat_laws}</span>
          </div>
          <div className="landing-stat-sep" />
          <div className="landing-stat-item">
            <span className="landing-stat-num">11</span>
            <span className="landing-stat-label">{t.stat_tools}</span>
          </div>
        </div>

        <Link href="/chat" className="landing-cta">{t.cta}</Link>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section className="landing-how">
        <h2 className="landing-section-title">{t.how_title}</h2>
        <div className="landing-steps">
          {t.steps.map((s) => (
            <div key={s.num} className="landing-step">
              <div className="landing-step-num">{s.num}</div>
              <div className="landing-step-title">{s.title}</div>
              <div className="landing-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────── */}
      <div className="landing-features">
        {t.features.map((f, i) => (
          <div key={i} className="landing-feature-card">
            <span className="lf-icon">{f.icon}</span>
            <div>
              <div className="lf-title">{f.title}</div>
              <div className="lf-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom CTA ───────────────────────────── */}
      <Link href="/chat" className="landing-cta" style={{ marginBottom: 40 }}>
        {t.cta}
      </Link>

      <p className="landing-footer">{t.footer}</p>
    </div>
  );
}
