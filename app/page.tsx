"use client";

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

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const TOOL_LABELS: Record<string, Record<Lang, string>> = {
  find_competitors:   { uz: "Raqobatchilar qidirilmoqda",   ru: "Поиск конкурентов",   en: "Finding competitors"  },
  find_nearby_helpers:{ uz: "Hamkorlar izlanmoqda",          ru: "Поиск партнёров",      en: "Finding partners"     },
  get_market_stats:   { uz: "Bozor tahlil qilinmoqda",       ru: "Анализ рынка",         en: "Analysing market"     },
  check_company_risks:{ uz: "Risklar tekshirilmoqda",        ru: "Проверка рисков",      en: "Checking risks"       },
  search_laws:        { uz: "Qonunlar qidirilmoqda",         ru: "Поиск законов",        en: "Searching laws"       },
};

const STARTERS: Record<Lang, { icon: string; text: string }[]> = {
  uz: [
    { icon: "🏪", text: "Toshkentda supermarket ochmoqchiman, raqobatchilar bormi?" },
    { icon: "🏗️", text: "Qurilish kompaniyasi ochish uchun litsenziya kerakmi?" },
    { icon: "☕", text: "Yunusobodda kafe ochsam qanday imkoniyatlar bor?" },
    { icon: "🔍", text: "INN bo'yicha kompaniya tekshirish: 202099756" },
    { icon: "💡", text: "Kichik biznes uchun qanday soliq rejimlari bor?" },
    { icon: "🌿", text: "Farg'onada fermer xo'jaligi ochish qanday?" },
  ],
  ru: [
    { icon: "🏪", text: "Хочу открыть супермаркет в Ташкенте, есть конкуренты?" },
    { icon: "🏗️", text: "Нужна ли лицензия для открытия строительной компании?" },
    { icon: "☕", text: "Какие возможности для кафе в Юнусабаде?" },
    { icon: "🔍", text: "Проверить компанию по ИНН: 202099756" },
    { icon: "💡", text: "Какие налоговые режимы для малого бизнеса?" },
    { icon: "🌿", text: "Как открыть фермерское хозяйство в Фергане?" },
  ],
  en: [
    { icon: "🏪", text: "I want to open a supermarket in Tashkent. Any competitors?" },
    { icon: "🏗️", text: "Do I need a license to open a construction company?" },
    { icon: "☕", text: "What are my chances for a café in Yunusobod?" },
    { icon: "🔍", text: "Check company by INN: 202099756" },
    { icon: "💡", text: "What tax regimes are available for small business?" },
    { icon: "🌿", text: "How to start a farm in Fergana?" },
  ],
};

const WELCOME: Record<Lang, { title: string; desc: string; thinking: string; placeholder: string; hint: string; newChat: string; suggested: string }> = {
  uz: {
    title: "Biznes Maslahatchi",
    desc: "O'zbekistonda biznes boshlash yoki rivojlantirish bo'yicha savollaringizni bering. 1.6 mln kompaniya ma'lumotlari va rasmiy qonunlar asosida yordam beramiz.",
    thinking: "Tahlil qilinmoqda",
    placeholder: "Savolingizni yozing...",
    hint: "Enter — yuborish  ·  Shift+Enter — yangi qator",
    newChat: "Yangi suhbat",
    suggested: "Mashhur savollar",
  },
  ru: {
    title: "Бизнес-Советник",
    desc: "Задавайте вопросы о запуске или развитии бизнеса в Узбекистане. Ответы на основе базы 1,6 млн компаний и официального законодательства.",
    thinking: "Анализирую",
    placeholder: "Напишите ваш вопрос...",
    hint: "Enter — отправить  ·  Shift+Enter — новая строка",
    newChat: "Новый чат",
    suggested: "Частые вопросы",
  },
  en: {
    title: "Business Advisor",
    desc: "Ask anything about starting or growing a business in Uzbekistan. Powered by 1.6M company records and official regulations.",
    thinking: "Analysing",
    placeholder: "Ask your question...",
    hint: "Enter to send  ·  Shift+Enter for new line",
    newChat: "New chat",
    suggested: "Suggested",
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

// ─── Main component ───────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<Lang>("uz");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sessionId] = useState<string>(() =>
    typeof crypto !== "undefined" ? crypto.randomUUID() : `s-${Date.now()}`
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = WELCOME[lang];

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("humora-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  // Apply theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("humora-theme", theme);
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
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
          body: JSON.stringify({ message: text, session_id: sessionId }),
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

  return (
    <div className="app">
      {/* ── Header ──────────────────────────────── */}
      <header className="header">
        <div className="logo">
          <span className="logo-wordmark">
            HUMOR<span className="logo-accent">A</span>
          </span>
          <span className="logo-dot" />
          <span className="logo-tagline">AI</span>
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
          <button
            className="new-chat-btn"
            onClick={() => setMessages([])}
          >
            <PlusIcon />
            {t.newChat}
          </button>

          <div>
            <div className="sidebar-label">{t.suggested}</div>
            <div className="starter-list">
              {STARTERS[lang].map((s, i) => (
                <button
                  key={i}
                  className="starter-btn"
                  onClick={() => sendMessage(s.text)}
                >
                  <span className="s-icon">{s.icon}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Chat */}
        <div className="chat-area">
          <div className="messages-list">
            <div className="messages-inner">
              {/* Welcome */}
              {messages.length === 0 && (
                <div className="welcome">
                  <div className="welcome-gem">
                    <GemIcon size={52} />
                  </div>
                  <h1 className="welcome-title">
                    Humora <em>{t.title}</em>
                  </h1>
                  <p className="welcome-desc">{t.desc}</p>
                  <div className="welcome-chips">
                    {STARTERS[lang].slice(0, 3).map((s, i) => (
                      <button
                        key={i}
                        className="welcome-chip"
                        onClick={() => sendMessage(s.text)}
                      >
                        <span>{s.icon}</span>
                        <span style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                  {/* Avatar */}
                  <div className="msg-avatar">
                    {msg.role === "ai" ? (
                      <GemIcon size={16} />
                    ) : (
                      <span style={{ fontSize: 10, letterSpacing: "0.05em" }}>
                        {lang === "uz" ? "SIZ" : lang === "ru" ? "ВЫ" : "YOU"}
                      </span>
                    )}
                  </div>

                  {/* Bubble */}
                  <div className="msg-bubble">
                    {/* Tool pills */}
                    {msg.tools.length > 0 && (
                      <div className="tool-row">
                        {msg.tools.map((tc, i) => (
                          <span
                            key={i}
                            className={`tool-pill ${tc.done ? "tool-done" : "tool-active"}`}
                          >
                            {tc.done ? (
                              <span className="t-check">✓</span>
                            ) : (
                              <span className="t-spin" />
                            )}
                            {TOOL_LABELS[tc.name]?.[lang] ?? tc.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Content */}
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
                      <div
                        className={[
                          "msg-content",
                          msg.role === "ai" && msg.streaming ? "streaming-cursor" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {msg.role === "ai" ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
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
              <textarea
                ref={textareaRef}
                className="input-field"
                value={input}
                placeholder={t.placeholder}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeTextarea();
                }}
                onKeyDown={handleKey}
              />
              <button
                className="send-btn"
                disabled={!input.trim() || busy}
                onClick={() => sendMessage()}
                aria-label="Send"
              >
                <SendIcon />
              </button>
            </div>
            <div className="input-meta">
              <span className="input-hint">{t.hint}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
