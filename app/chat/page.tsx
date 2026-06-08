"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Types ───────────────────────────────────────────

type Lang = "uz" | "ru" | "en";

interface ToolCall {
  name: string;
  done: boolean;
}

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  tools: ToolCall[];
  streaming: boolean;
}

// ─── Constants ───────────────────────────────────────

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://maslahatchi.humora.uz";

const TOOL_LABELS: Record<string, Record<Lang, string>> = {
  lookup_oked:          { uz: "Faoliyat kodi aniqlanmoqda",        ru: "Определение кода ОКЭД",  en: "Looking up OKED code"    },
  find_competitors:     { uz: "Raqobatchilar qidirilmoqda",        ru: "Поиск конкурентов",      en: "Finding competitors"     },
  find_nearby_helpers:  { uz: "Hamkorlar izlanmoqda",              ru: "Поиск партнёров",        en: "Finding partners"        },
  get_market_stats:     { uz: "Bozor tahlil qilinmoqda",           ru: "Анализ рынка",           en: "Analysing market"        },
  check_company_risks:  { uz: "Risklar tekshirilmoqda",            ru: "Проверка рисков",        en: "Checking risks"          },
  compare_districts:    { uz: "Hududlar solishtirilmoqda",         ru: "Сравнение регионов",     en: "Comparing regions"       },
  find_sales_channels:  { uz: "Xaridorlar qidirilmoqda",           ru: "Поиск покупателей",      en: "Finding buyers"          },
  search_laws:          { uz: "Qonunlar qidirilmoqda",             ru: "Поиск законов",          en: "Searching laws"          },
  get_exchange_rates:   { uz: "Valyuta kursi olinmoqda",           ru: "Получение курса валют",  en: "Fetching exchange rates" },
  search_grants:        { uz: "Grantlar qidirilmoqda",             ru: "Поиск грантов",          en: "Searching grants"        },
  get_customs_tariff:   { uz: "Bojxona stavkasi tekshirilmoqda",   ru: "Таможенная ставка",      en: "Checking customs tariff" },
};

const STARTERS: Record<Lang, { icon: string; text: string }[]> = {
  uz: [
    { icon: "🏪", text: "Toshkentda supermarket ochmoqchiman, raqobatchilar bormi?" },
    { icon: "🏗️", text: "Qurilish kompaniyasi ochish uchun litsenziya kerakmi?" },
    { icon: "☕", text: "Yunusobodda kafe ochsam qanday imkoniyatlar bor?" },
    { icon: "💰", text: "Bugun dollar kursi qancha? Import uchun hisoblashim kerak." },
    { icon: "🎯", text: "Yoshlar uchun davlat granti yoki arzon kredit bormi?" },
    { icon: "📦", text: "Xitoydan kiyim import qilsam boj stavkasi qancha?" },
    { icon: "🔍", text: "INN bo'yicha kompaniya tekshirish: 202099756" },
    { icon: "🌿", text: "Farg'onada fermer xo'jaligi ochish qanday?" },
  ],
  ru: [
    { icon: "🏪", text: "Хочу открыть супермаркет в Ташкенте, есть конкуренты?" },
    { icon: "🏗️", text: "Нужна ли лицензия для открытия строительной компании?" },
    { icon: "☕", text: "Какие возможности для кафе в Юнусабаде?" },
    { icon: "💰", text: "Какой курс доллара сегодня? Считаю стоимость импорта." },
    { icon: "🎯", text: "Есть ли государственные гранты или льготные кредиты для молодых?" },
    { icon: "📦", text: "Какая таможенная пошлина при импорте одежды из Китая?" },
    { icon: "🔍", text: "Проверить компанию по ИНН: 202099756" },
    { icon: "🌿", text: "Как открыть фермерское хозяйство в Фергане?" },
  ],
  en: [
    { icon: "🏪", text: "I want to open a supermarket in Tashkent. Any competitors?" },
    { icon: "🏗️", text: "Do I need a license to open a construction company?" },
    { icon: "☕", text: "What are my chances for a café in Yunusobod?" },
    { icon: "💰", text: "What is today's USD exchange rate? I need it for import calculations." },
    { icon: "🎯", text: "Are there government grants or subsidized loans for young entrepreneurs?" },
    { icon: "📦", text: "What is the import duty for clothing from China?" },
    { icon: "🔍", text: "Check company by INN: 202099756" },
    { icon: "🌿", text: "How to start a farm in Fergana?" },
  ],
};

const WELCOME: Record<Lang, {
  title: string; desc: string; thinking: string; placeholder: string;
  hint: string; newChat: string; suggested: string;
  banner: string;
  report_title: string; report_phone: string; report_error: string;
  report_submit: string; report_cancel: string; report_success: string;
  report_phone_ph: string; report_error_ph: string;
}> = {
  uz: {
    title: "Biznes Maslahatchi",
    desc: "O'zbekistonda biznes boshlash yoki rivojlantirish bo'yicha savollaringizni bering. 1.6 mln kompaniya ma'lumotlari va rasmiy qonunlar asosida yordam beramiz.",
    thinking: "Tahlil qilinmoqda",
    placeholder: "Savolingizni yozing...",
    hint: "Enter — yuborish  ·  Shift+Enter — yangi qator",
    newChat: "Yangi suhbat",
    suggested: "Mashhur savollar",
    banner: "🟢 Demo ishlayapti — xato yoki muammo bo'lsa, bizga xabar bering →",
    report_title: "Xato haqida xabar bering",
    report_phone: "Telefon raqamingiz",
    report_phone_ph: "+998 90 000 00 00",
    report_error: "Xato tavsifi",
    report_error_ph: "Nima yuz berdi? Qaysi sahifada? Qanday savol yubordingiz?",
    report_submit: "Yuborish",
    report_cancel: "Bekor qilish",
    report_success: "Xabar yuborildi! Rahmat.",
  },
  ru: {
    title: "Бизнес-Советник",
    desc: "Задавайте вопросы о запуске или развитии бизнеса в Узбекистане. Ответы на основе базы 1,6 млн компаний и официального законодательства.",
    thinking: "Анализирую",
    placeholder: "Напишите ваш вопрос...",
    hint: "Enter — отправить  ·  Shift+Enter — новая строка",
    newChat: "Новый чат",
    suggested: "Частые вопросы",
    banner: "🟢 Демо работает — нашли ошибку или проблему? Сообщите нам →",
    report_title: "Сообщить об ошибке",
    report_phone: "Ваш номер телефона",
    report_phone_ph: "+998 90 000 00 00",
    report_error: "Описание ошибки",
    report_error_ph: "Что произошло? На какой странице? Какой запрос отправили?",
    report_submit: "Отправить",
    report_cancel: "Отмена",
    report_success: "Сообщение отправлено! Спасибо.",
  },
  en: {
    title: "Business Advisor",
    desc: "Ask anything about starting or growing a business in Uzbekistan. Powered by 1.6M company records and official regulations.",
    thinking: "Analysing",
    placeholder: "Ask your question...",
    hint: "Enter to send  ·  Shift+Enter for new line",
    newChat: "New chat",
    suggested: "Suggested",
    banner: "🟢 Demo is live — found a bug or error? Let us know →",
    report_title: "Report an issue",
    report_phone: "Your phone number",
    report_phone_ph: "+998 90 000 00 00",
    report_error: "Describe the error",
    report_error_ph: "What happened? Which page? What did you ask?",
    report_submit: "Submit",
    report_cancel: "Cancel",
    report_success: "Message sent! Thank you.",
  },
};

// ─── Icons ───────────────────────────────────────────

function GemIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="currentColor">
      <path d="M14 2.5L5 9.5 2 14l12 11.5L26 14l-3-4.5L14 2.5z" opacity="0.3" />
      <path d="M14 2.5l9 7-9 13.5L5 9.5l9-7z" opacity="0.6" />
      <path d="M14 2.5L5 9.5h18L14 2.5z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
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

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckSmallIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<Lang>("uz");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionId] = useState<string>(() => {
    if (typeof window === "undefined") return `s-${Date.now()}`;
    const saved = localStorage.getItem("chat-session-id");
    if (saved) return saved;
    const id = typeof crypto !== "undefined" ? crypto.randomUUID() : `s-${Date.now()}`;
    localStorage.setItem("chat-session-id", id);
    return id;
  });

  // Report modal state
  const [showModal, setShowModal] = useState(false);
  const [reportPhone, setReportPhone] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const startNewChat = () => {
    setMessages([]);
    setInput("");
    localStorage.removeItem("chat-messages");
    const newId = typeof crypto !== "undefined" ? crypto.randomUUID() : `s-${Date.now()}`;
    localStorage.setItem("chat-session-id", newId);
    // reload to get fresh sessionId (simplest approach)
    window.location.reload();
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = WELCOME[lang];

  useEffect(() => {
    const saved = localStorage.getItem("humora-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("humora-theme", theme);
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Restore messages from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chat-messages");
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        // Mark any streaming messages as done (interrupted by refresh)
        const clean = parsed.map((m) => ({ ...m, streaming: false }));
        setMessages(clean);
      }
    } catch {
      // ignore corrupted data
    }
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length === 0) return;
    // Don't save while a message is still streaming
    const allDone = messages.every((m) => !m.streaming);
    if (allDone) {
      localStorage.setItem("chat-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const closeModal = () => {
    setShowModal(false);
    setReportPhone("");
    setReportError("");
    setReportSuccess(false);
  };

  const submitReport = async () => {
    if (!reportPhone.trim() || !reportError.trim()) return;
    setReportSubmitting(true);
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: reportPhone.trim(), error: reportError.trim(), lang }),
      });
      setReportSuccess(true);
      setTimeout(closeModal, 2000);
    } catch {
      setReportSuccess(true); // still close gracefully
      setTimeout(closeModal, 2000);
    } finally {
      setReportSubmitting(false);
    }
  };

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || busy) return;

      setInput("");
      setBusy(true);
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        tools: [],
        streaming: false,
      };

      const aiId = crypto.randomUUID();
      const aiMsg: Message = {
        id: aiId,
        role: "ai",
        content: "",
        tools: [],
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);

      try {
        const res = await fetch(`${BACKEND}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, session_id: sessionId, lang }),
        });

        if (!res.body) throw new Error("No stream");

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") {
              setMessages((prev) =>
                prev.map((m) => (m.id === aiId ? { ...m, streaming: false } : m))
              );
              continue;
            }
            try {
              const ev = JSON.parse(raw);
              if (ev.type === "text") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId ? { ...m, content: m.content + ev.content } : m
                  )
                );
              } else if (ev.type === "tool_start") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId
                      ? { ...m, tools: [...m.tools, { name: ev.tool, done: false }] }
                      : m
                  )
                );
              } else if (ev.type === "tool_end") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId
                      ? {
                          ...m,
                          tools: m.tools.map((tc) =>
                            tc.name === ev.tool ? { ...tc, done: true } : tc
                          ),
                        }
                      : m
                  )
                );
              } else if (ev.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId
                      ? { ...m, content: `⚠️ Xato: ${ev.content}`, streaming: false }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed line
            }
          }
        }
      } catch {
        const errMap: Record<Lang, string> = {
          uz: "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
          ru: "Произошла ошибка. Пожалуйста, попробуйте снова.",
          en: "An error occurred. Please try again.",
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, content: errMap[lang], streaming: false } : m
          )
        );
      } finally {
        setBusy(false);
      }
    },
    [input, busy, sessionId, lang]
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="app">
      {/* ── Header ──────────────────────────────── */}
      <header className="header">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          <div className="logo-icon"><GemIcon size={15} /></div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────── */}
      <div className="main">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Brand */}
          <div className="sb-brand">
            <div className="sb-brand-icon"><GemIcon size={14} /></div>
            <div className="sb-brand-info">
              <span className="sb-brand-name">AI Maslahatchi</span>
              <span className="sb-brand-badge">Beta</span>
            </div>
          </div>

          {/* New Chat */}
          <button className="new-chat-btn" onClick={startNewChat}>
            <PlusIcon />
            {t.newChat}
          </button>

          {/* History */}
          <div className="sb-section">
            <div className="sb-section-label">
              {lang === "uz" ? "Chat tarixi" : lang === "ru" ? "История чатов" : "Chat history"}
            </div>
            <div className="sb-history-empty">
              <div className="sb-history-empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="sb-history-empty-text">
                {lang === "uz" ? "Suhbatlar bu yerda ko'rinadi" : lang === "ru" ? "Здесь будут ваши чаты" : "Your chats will appear here"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sb-footer">
            <div className="sb-footer-stat">1.6M {lang === "uz" ? "kompaniya" : lang === "ru" ? "компаний" : "companies"}</div>
            <div className="sb-footer-dot">·</div>
            <div className="sb-footer-stat">1800+ {lang === "uz" ? "qonun" : lang === "ru" ? "законов" : "laws"}</div>
          </div>
        </aside>

        {/* Chat */}
        <div className="chat-area">
          {/* ── Report banner ─────────────────── */}
          <button className="report-banner" onClick={() => setShowModal(true)}>
            {t.banner}
          </button>

          <div className="messages-list">
            <div className="messages-inner">
              {/* Welcome */}
              {messages.length === 0 && (
                <div className="welcome">
                  <div className="welcome-gem"><GemIcon size={62} /></div>
                  <h1 className="welcome-title">
                    <em>{t.title}</em>
                  </h1>
                  <p className="welcome-desc">{t.desc}</p>
                  <div className="welcome-stats">
                    <span className="welcome-stat">🏢 1.6M {lang === "uz" ? "kompaniya" : lang === "ru" ? "компаний" : "companies"}</span>
                    <span className="welcome-stat-sep">·</span>
                    <span className="welcome-stat">⚖️ 1800+ {lang === "uz" ? "qonun" : lang === "ru" ? "законов" : "laws"}</span>
                    <span className="welcome-stat-sep">·</span>
                    <span className="welcome-stat">🛠 11 {lang === "uz" ? "vosita" : lang === "ru" ? "инструментов" : "tools"}</span>
                  </div>
                  <div className="welcome-chips">
                    {STARTERS[lang].slice(0, 4).map((s, i) => (
                      <button key={i} className="welcome-chip" onClick={() => sendMessage(s.text)}>
                        <span>{s.icon}</span>
                        <span style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div key={msg.id} className={`message msg-${msg.role}`}>
                  <div className="msg-avatar">
                    {msg.role === "ai" ? (
                      <GemIcon size={14} />
                    ) : (
                      <span>{lang === "uz" ? "SIZ" : lang === "ru" ? "ВЫ" : "YOU"}</span>
                    )}
                  </div>

                  <div className="msg-bubble">
                    {msg.tools.length > 0 && (
                      <div className="tool-row">
                        {msg.tools.map((tc, i) => (
                          <span key={i} className={`tool-pill ${tc.done ? "tool-done" : "tool-active"}`}>
                            {tc.done ? <span className="t-check">✓</span> : <span className="t-spin" />}
                            {TOOL_LABELS[tc.name]?.[lang] ?? tc.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {msg.role === "ai" && msg.streaming && msg.content === "" ? (
                      <div className="thinking-bubble">
                        <div className="geo-spinner">
                          <div className="geo-ring-outer" />
                          <div className="geo-ring-inner" />
                          <div className="geo-dot" />
                        </div>
                        <span className="thinking-text">{t.thinking}…</span>
                      </div>
                    ) : (
                      <div className={["msg-content", msg.role === "ai" && msg.streaming ? "streaming-cursor" : ""].filter(Boolean).join(" ")}>
                        {msg.role === "ai" ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer">
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                    )}

                    {msg.role === "ai" && !msg.streaming && msg.content && (
                      <button className="copy-btn" onClick={() => copyMessage(msg.id, msg.content)} title="Copy">
                        {copiedId === msg.id ? <CheckSmallIcon /> : <CopyIcon />}
                        <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="input-area">
            <div className="input-wrapper">
              <span className="input-gem-mark"><GemIcon size={15} /></span>
              <textarea
                ref={textareaRef}
                className="input-field"
                value={input}
                placeholder={t.placeholder}
                rows={1}
                onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
                onKeyDown={handleKey}
              />
              <button className="send-btn" disabled={!input.trim() || busy} onClick={() => sendMessage()} aria-label="Send">
                <SendIcon />
              </button>
            </div>
            <div className="input-meta">
              <span className="input-hint">{t.hint}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Report modal ─────────────────────────── */}
      {showModal && (
        <div className="report-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="report-modal">
            <div className="report-modal-header">
              <span className="report-modal-title">{t.report_title}</span>
              <button className="report-close-btn" onClick={closeModal} aria-label="Close"><XIcon /></button>
            </div>

            {reportSuccess ? (
              <div className="report-success">
                <span style={{ fontSize: 28 }}>✅</span>
                <p>{t.report_success}</p>
              </div>
            ) : (
              <>
                <div className="report-form-group">
                  <label className="report-form-label">{t.report_phone}</label>
                  <input
                    className="report-form-input"
                    type="tel"
                    placeholder={t.report_phone_ph}
                    value={reportPhone}
                    onChange={(e) => setReportPhone(e.target.value)}
                  />
                </div>
                <div className="report-form-group">
                  <label className="report-form-label">{t.report_error}</label>
                  <textarea
                    className="report-form-textarea"
                    placeholder={t.report_error_ph}
                    rows={4}
                    value={reportError}
                    onChange={(e) => setReportError(e.target.value)}
                  />
                </div>
                <div className="report-modal-btns">
                  <button className="report-cancel-btn" onClick={closeModal}>{t.report_cancel}</button>
                  <button
                    className="send-btn"
                    style={{ width: "auto", padding: "0 20px", height: 36, fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 600, borderRadius: 9 }}
                    disabled={!reportPhone.trim() || !reportError.trim() || reportSubmitting}
                    onClick={submitReport}
                  >
                    {reportSubmitting ? "..." : t.report_submit}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
