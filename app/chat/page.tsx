"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/lib/auth";
import {
  getConversations, saveConversation, deleteConversation,
  getMessages, appendMessage, getSavedIds, toggleSaved,
  getProfile, saveProfile, submitFeedback,
} from "@/lib/db";
import { getFollowUps } from "@/lib/followups";
import { STAGES, type Lang, type BusinessStage, type Conversation, type Profile } from "@/lib/types";

// ─── Markdown → HTML (for print window only) ────────────
function convertMarkdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(?!<[hul]|<li|<hr|<block)(.+)$/gm, "<p>$1</p>");
}

// ─── Document types ─────────────────────────────────────
type DocTypeKey = "business_plan" | "action_items" | "market_analysis" | "financial_summary";

const DOC_TYPES: {
  key: DocTypeKey; emoji: string;
  name: Record<Lang, string>; desc: Record<Lang, string>;
  promptPrefix: Record<Lang, string>;
}[] = [
  {
    key: "business_plan", emoji: "📋",
    name: { uz: "Biznes-reja", ru: "Бизнес-план", en: "Business Plan" },
    desc: { uz: "To'liq biznes-reja: maqsad, bozor, moliya, xavflar", ru: "Полный план: цель, рынок, финансы, риски", en: "Full plan: goal, market, finances, risks" },
    promptPrefix: { uz: "Biznesimiz haqida gaplashdik. Shu suhbat asosida professional biznes-reja tuzib ber. Sarlavhalar, bo'limlar va raqamlar bilan chiroyli formatlangan bo'lsin.", ru: "Мы обсуждали бизнес. На основе разговора составь профессиональный бизнес-план с разделами, заголовками и цифрами.", en: "We discussed my business. Based on our conversation, write a professional business plan with clear sections, headings, and numbers." },
  },
  {
    key: "action_items", emoji: "✅",
    name: { uz: "Vazifalar ro'yxati", ru: "Список задач", en: "Action Items" },
    desc: { uz: "Keyingi qadamlar: kim, nima, qachon", ru: "Следующие шаги: кто, что, когда", en: "Next steps: who, what, when" },
    promptPrefix: { uz: "Suhbatimiz asosida aniq va prioritetlangan vazifalar ro'yxatini tuzib ber. Har bir vazifaga vaqt va mas'ul shaxs qo'sh.", ru: "На основе нашего разговора составь чёткий список задач с приоритетами, сроками и ответственными.", en: "Based on our conversation, create a prioritised action-item list with deadlines and owners." },
  },
  {
    key: "market_analysis", emoji: "📊",
    name: { uz: "Bozor tahlili", ru: "Анализ рынка", en: "Market Analysis" },
    desc: { uz: "Raqobatchilar, auditoriya, imkoniyatlar", ru: "Конкуренты, аудитория, возможности", en: "Competitors, audience, opportunities" },
    promptPrefix: { uz: "Suhbat asosida O'zbekiston bozori uchun bozor tahlili hujjatini yoz. Raqobatchilar, maqsadli auditoriya va bozorga kirish strategiyasini kirgazing.", ru: "На основе разговора напиши документ анализа рынка Узбекистана: конкуренты, целевая аудитория, стратегия входа.", en: "Based on our conversation, write a market analysis document for the Uzbekistan market: competitors, target audience, entry strategy." },
  },
  {
    key: "financial_summary", emoji: "💰",
    name: { uz: "Moliyaviy xulosa", ru: "Финансовое резюме", en: "Financial Summary" },
    desc: { uz: "Xarajatlar, daromad, rentabellik hisob-kitobi", ru: "Расходы, доходы, расчёт рентабельности", en: "Costs, revenue, profitability estimates" },
    promptPrefix: { uz: "Suhbatimizdan olingan ma'lumotlar asosida moliyaviy xulosa hujjatini tuzib ber: boshlang'ich xarajatlar, oylik xarajatlar, kutilayotgan daromad va rentabellik.", ru: "По данным из разговора составь финансовое резюме: стартовые расходы, ежемесячные затраты, ожидаемый доход, рентабельность.", en: "Using data from our conversation, write a financial summary: startup costs, monthly expenses, expected revenue, profitability." },
  },
];

// ─── Types ──────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  streaming: boolean;
}

// ─── Config ─────────────────────────────────────────────
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://maslahatchi.humora.uz";

const STARTERS: Record<Lang, { icon: string; text: string }[]> = {
  uz: [
    { icon: "🏪", text: "Toshkentda supermarket ochmoqchiman, raqobatchilar bormi?" },
    { icon: "🏗️", text: "Qurilish kompaniyasi uchun litsenziya kerakmi?" },
    { icon: "📋", text: "Kafe uchun biznes-reja yozib ber" },
    { icon: "💰", text: "Bugun dollar kursi qancha?" },
  ],
  ru: [
    { icon: "🏪", text: "Хочу открыть супермаркет в Ташкенте, есть конкуренты?" },
    { icon: "🏗️", text: "Нужна ли лицензия для строительной компании?" },
    { icon: "📋", text: "Напиши бизнес-план для кафе" },
    { icon: "💰", text: "Какой курс доллара сегодня?" },
  ],
  en: [
    { icon: "🏪", text: "I want to open a supermarket in Tashkent. Competitors?" },
    { icon: "🏗️", text: "Do I need a license to open a construction company?" },
    { icon: "📋", text: "Write a business plan for a café" },
    { icon: "💰", text: "What is today's USD exchange rate?" },
  ],
};

const UI: Record<Lang, {
  welcome: string; welcomeDesc: string; thinking: string;
  placeholder: string; hint: string; newChat: string;
  historyLabel: string; historyEmpty: string; journey: string;
  today: string; yesterday: string; thisWeek: string; earlier: string;
  copy: string; copied: string; pin: string; unpin: string; export: string;
  followupLabel: string; deleteConv: string;
}> = {
  uz: {
    welcome: "Consultant AI", welcomeDesc: "Biznesingizning har bir bosqichida yoningizda.",
    thinking: "Tahlil qilinmoqda", placeholder: "Savolingizni yozing…",
    hint: "Enter — yuborish · Shift+Enter — yangi qator",
    newChat: "Yangi suhbat", historyLabel: "Suhbatlar", historyEmpty: "Hali suhbat yo'q",
    journey: "Biznes bosqich", today: "Bugun", yesterday: "Kecha",
    thisWeek: "Shu hafta", earlier: "Oldingi",
    copy: "Copy", copied: "Copied", pin: "Pin", unpin: "Pinned", export: "Export",
    followupLabel: "Davom etish", deleteConv: "O'chirish",
  },
  ru: {
    welcome: "Consultant AI", welcomeDesc: "Рядом с вами на каждом этапе пути.",
    thinking: "Анализирую", placeholder: "Напишите ваш вопрос…",
    hint: "Enter — отправить · Shift+Enter — новая строка",
    newChat: "Новый чат", historyLabel: "Беседы", historyEmpty: "Чатов пока нет",
    journey: "Этап бизнеса", today: "Сегодня", yesterday: "Вчера",
    thisWeek: "На этой неделе", earlier: "Раньше",
    copy: "Copy", copied: "Copied", pin: "Pin", unpin: "Pinned", export: "Export",
    followupLabel: "Продолжить", deleteConv: "Удалить",
  },
  en: {
    welcome: "Consultant AI", welcomeDesc: "Your business companion, always ready.",
    thinking: "Analysing", placeholder: "Ask your question…",
    hint: "Enter to send · Shift+Enter for new line",
    newChat: "New chat", historyLabel: "Conversations", historyEmpty: "No conversations yet",
    journey: "Business stage", today: "Today", yesterday: "Yesterday",
    thisWeek: "This week", earlier: "Earlier",
    copy: "Copy", copied: "Copied", pin: "Pin", unpin: "Pinned", export: "Export",
    followupLabel: "Continue with", deleteConv: "Delete",
  },
};

// ─── Date helpers ────────────────────────────────────────
function groupConversations(convs: Conversation[], t: typeof UI[Lang]) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yest  = new Date(today.getTime() - 86_400_000);
  const week  = new Date(today.getTime() - 7 * 86_400_000);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: t.today,     items: [] },
    { label: t.yesterday, items: [] },
    { label: t.thisWeek,  items: [] },
    { label: t.earlier,   items: [] },
  ];
  for (const c of convs) {
    const d = new Date(c.updatedAt);
    if      (d >= today) groups[0].items.push(c);
    else if (d >= yest)  groups[1].items.push(c);
    else if (d >= week)  groups[2].items.push(c);
    else                 groups[3].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

// ─── Icons ───────────────────────────────────────────────
function GemIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="currentColor">
      <path d="M14 2.5L5 9.5 2 14l12 11.5L26 14l-3-4.5L14 2.5z" opacity="0.3" />
      <path d="M14 2.5l9 7-9 13.5L5 9.5l9-7z" opacity="0.6" />
      <path d="M14 2.5L5 9.5h18L14 2.5z" />
    </svg>
  );
}
const SendIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const PinIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const PaperclipIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const MicIcon = ({ active }: { active?: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const DocIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const PrintIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const ExportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>
);
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const MenuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const ChatIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function ChatPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // ── Core state ──────────────────────────────────────
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [input,       setInput]       = useState("");
  const [busy,        setBusy]        = useState(false);
  const [lang,        setLang]        = useState<Lang>("uz");
  const [theme,       setTheme]       = useState<"dark" | "light">("dark");

  // ── Conversation state ──────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [profile,       setProfile]       = useState<Profile | null>(null);

  // ── UI state ────────────────────────────────────────
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [copiedId,     setCopiedId]     = useState<string | null>(null);
  const [savedIds,     setSavedIds]     = useState<Set<string>>(new Set());
  const [followUps,    setFollowUps]    = useState<string[]>([]);
  const [lastAiMsgId,  setLastAiMsgId]  = useState<string | null>(null);
  const [isListening,  setIsListening]  = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [reportPhone,  setReportPhone]  = useState("");
  const [reportText,   setReportText]   = useState("");
  const [reportOk,     setReportOk]     = useState(false);

  // ── Document generator ──────────────────────────────
  const [showDocGen,   setShowDocGen]   = useState(false);
  const [docType,      setDocType]      = useState<DocTypeKey | "">("");
  const [docTitle,     setDocTitle]     = useState("");
  const [docContent,   setDocContent]   = useState("");
  const [docStreaming, setDocStreaming]  = useState(false);

  // ── File attachment ──────────────────────────────────
  interface AttachedFile { name: string; text: string; ext: string; chars: number; truncated: boolean }
  const [attachedFile,    setAttachedFile]    = useState<AttachedFile | null>(null);
  const [fileUploading,   setFileUploading]   = useState(false);
  const [fileError,       setFileError]       = useState<string | null>(null);

  // ── Feedback ─────────────────────────────────────────
  const [feedbackRatings,    setFeedbackRatings]    = useState<Record<string, 1 | -1>>({});
  const [feedbackModal,      setFeedbackModal]      = useState<{ msgId: string } | null>(null);
  const [feedbackComment,    setFeedbackComment]    = useState("");
  const [feedbackScreenshot, setFeedbackScreenshot] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackThanks,     setFeedbackThanks]     = useState<string | null>(null);

  // ── Beta banner ───────────────────────────────────────
  const [bannerVisible,       setBannerVisible]       = useState(false);
  const [bannerModalOpen,     setBannerModalOpen]     = useState(false);
  const [bannerRating,        setBannerRating]        = useState<1 | -1 | null>(null);
  const [bannerComment,       setBannerComment]       = useState("");
  const [bannerSubmitting,    setBannerSubmitting]    = useState(false);
  const [bannerThanks,        setBannerThanks]        = useState(false);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  const t = UI[lang];

  // ── Init ────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("cai-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
    const savedLang = localStorage.getItem("cai-lang") as Lang | null;
    if (savedLang) setLang(savedLang);
    if (!localStorage.getItem("cai-banner-dismissed")) setBannerVisible(true);
    void (async () => {
      const [ids, p, convs] = await Promise.all([getSavedIds(), getProfile(), getConversations()]);
      setSavedIds(ids);
      if (p) { setProfile(p); setLang(p.lang ?? savedLang ?? "uz"); }
      setConversations(convs);
    })();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const el = messagesListRef.current;
    const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShowUserMenu(false); setShowReport(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Conversation helpers ─────────────────────────────
  const openConversation = async (convId: string) => {
    setCurrentConvId(convId);
    setSidebarOpen(false);
    setFollowUps([]);
    setLastAiMsgId(null);
    setMessages([]);
    const loaded = await getMessages(convId);
    setMessages(loaded.map((m) => ({
      id:        m.id,
      role:      m.role as "user" | "ai",
      content:   m.content,
      streaming: false,
    })));
  };

  const startNewChat = () => {
    setMessages([]);
    setInput("");
    setCurrentConvId(null);
    setFollowUps([]);
    setLastAiMsgId(null);
    setSidebarOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const removeConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation(convId);
    setConversations(await getConversations());
    if (currentConvId === convId) startNewChat();
  };

  // ── Resize textarea ─────────────────────────────────
  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  // ── Voice input ─────────────────────────────────────
  const startVoice = () => {
    type AnySR = { new(): {
      lang: string; continuous: boolean; interimResults: boolean;
      onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      onend:   (() => void) | null;
      start(): void;
    }};
    const w = window as unknown as Record<string, unknown>;
    const SR = (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as AnySR | undefined;
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      setInput(e.results[0][0].transcript);
      setIsListening(false);
      resizeTextarea();
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    setIsListening(true);
    rec.start();
  };

  // ── Export conversation ─────────────────────────────
  const exportChat = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = messages.map((m) => `
      <div class="${m.role}">
        <strong>${m.role === "user" ? (user?.name ?? "You") : "Consultant AI"}</strong>
        <p>${m.content.replace(/\n/g, "<br/>")}</p>
      </div>`).join("");
    win.document.write(`
      <!DOCTYPE html><html><head><title>Consultant AI Export</title>
      <style>
        body { font-family: Georgia,serif; max-width:700px; margin:40px auto; color:#111; }
        h1   { font-size:18px; color:#C9A84C; border-bottom:1px solid #eee; padding-bottom:10px; }
        .user{ background:#f5f5f5; padding:12px 16px; border-radius:8px; margin:14px 0; }
        .ai  { padding:12px 16px; border-left:3px solid #C9A84C; margin:14px 0; }
        strong{ display:block; font-size:11px; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; opacity:.6; }
        p    { margin:0; line-height:1.7; }
      </style></head><body>
      <h1>Consultant AI — Conversation Export</h1>${rows}
      </body></html>`);
    win.document.close();
    win.print();
  };

  // ── Pin / save ──────────────────────────────────────
  const handleTogglePin = async (msgId: string) => {
    setSavedIds(await toggleSaved(msgId));
  };

  // ── Update milestone stage ───────────────────────────
  const updateStage = async (s: BusinessStage) => {
    if (!profile) return;
    const updated = { ...profile, stage: s };
    void saveProfile(updated);
    setProfile(updated);
  };

  // ── File attachment ──────────────────────────────────
  const [isDragOver, setIsDragOver] = useState(false);

  const ALLOWED_EXTS = new Set(["pdf", "docx", "xlsx", "csv", "txt"]);

  const uploadFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTS.has(ext)) {
      setFileError(`Unsupported type .${ext} — allowed: PDF, DOCX, XLSX, CSV, TXT`);
      return;
    }
    setFileError(null);
    setFileUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BACKEND}/api/files/extract`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error((err as { detail?: string }).detail ?? "Upload failed");
      }
      const data = await res.json() as { filename: string; ext: string; chars: number; truncated: boolean; text: string };
      setAttachedFile({ name: data.filename, ext: data.ext, chars: data.chars, truncated: data.truncated, text: data.text });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  // ── Feedback handlers ───────────────────────────────
  const rateFeedback = async (msgId: string, rating: 1 | -1) => {
    setFeedbackRatings((prev) => ({ ...prev, [msgId]: rating }));
    if (rating === 1) {
      void submitFeedback({ messageId: msgId, convId: currentConvId ?? undefined, rating: 1 });
      setFeedbackThanks(msgId);
      setTimeout(() => setFeedbackThanks(null), 2000);
    } else {
      setFeedbackComment("");
      setFeedbackScreenshot(null);
      setFeedbackModal({ msgId });
    }
  };

  const MAX_IMG_BYTES = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_IMG_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

  const readImageFile = (file: File, onError?: (msg: string) => void) => {
    if (!ALLOWED_IMG_TYPES.has(file.type)) {
      onError?.("Only PNG, JPG, WEBP, GIF images are allowed");
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      onError?.(`Image too large (max 5 MB) — yours is ${(file.size / 1024 / 1024).toFixed(1)} MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFeedbackScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFeedbackPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (!blob) continue;
        readImageFile(blob);
        e.preventDefault();
        return;
      }
    }
  };

  const handleFeedbackImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFile(file, (msg) => alert(msg));
  };

  const submitFeedbackModal = async () => {
    if (!feedbackModal) return;
    setFeedbackSubmitting(true);
    try {
      await submitFeedback({
        messageId:  feedbackModal.msgId,
        convId:     currentConvId ?? undefined,
        rating:     -1,
        comment:    feedbackComment || undefined,
        screenshot: feedbackScreenshot ?? undefined,
      });
    } finally {
      setFeedbackSubmitting(false);
      setFeedbackModal(null);
      setFeedbackThanks(feedbackModal.msgId);
      setTimeout(() => setFeedbackThanks(null), 2000);
    }
  };

  const dismissBanner = () => {
    setBannerVisible(false);
    localStorage.setItem("cai-banner-dismissed", "1");
  };

  const submitBannerFeedback = async () => {
    if (!bannerRating) return;
    setBannerSubmitting(true);
    try {
      await submitFeedback({
        convId:  currentConvId ?? undefined,
        rating:  bannerRating,
        comment: bannerComment || undefined,
      });
      setBannerThanks(true);
      setTimeout(() => {
        setBannerModalOpen(false);
        setBannerThanks(false);
        setBannerComment("");
        setBannerRating(null);
        dismissBanner();
      }, 1800);
    } finally {
      setBannerSubmitting(false);
    }
  };

  // ── Send message ─────────────────────────────────────
  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const rawText = (overrideText ?? input).trim();
      const hasFile = attachedFile !== null;
      if (!rawText && !hasFile || busy) return;
      const text = rawText || "Analyze this file and give me business insights relevant to Uzbekistan.";

      setInput("");
      setBusy(true);
      setFollowUps([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      const isNewConversation = !currentConvId;

      // Create or reuse conversation
      let convId = currentConvId;
      if (!convId) {
        convId = crypto.randomUUID();
        await saveConversation({
          id:        convId,
          userId:    user?.id ?? "guest",
          title:     (text || (attachedFile ? `📎 ${attachedFile.name}` : "Chat")).slice(0, 48),
          lang,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setCurrentConvId(convId);
        setConversations(await getConversations());
      } else {
        // Touch updatedAt so this conv rises to top — fire-and-forget
        void saveConversation({ id: convId, userId: user?.id ?? "guest", title: "", lang, createdAt: "", updatedAt: "" });
      }

      // Build profile context — injected only on the first message of a new conversation
      // so the AI knows the user's sector/location/stage without asking
      let userContext: string | undefined;
      if (isNewConversation && profile) {
        const parts: string[] = [];
        if (profile.industry)     parts.push(`industry=${profile.industry}`);
        if (profile.location)     parts.push(`location=${profile.location}`);
        if (profile.stage)        parts.push(`stage=${profile.stage}`);
        if (profile.businessName) parts.push(`business_name=${profile.businessName}`);
        if (parts.length > 0) userContext = `[USER_PROFILE: ${parts.join(", ")}]`;
      }

      // Build message — prepend file content if a file is attached
      const fileSnap = attachedFile;
      let apiMessage = text;
      if (fileSnap) {
        const truncNote = fileSnap.truncated ? " [truncated]" : "";
        apiMessage = `[FILE: ${fileSnap.name}${truncNote}]\n${fileSnap.text}\n\n${text}`;
        setAttachedFile(null);
      }

      // User message — fire-and-forget so UI doesn't wait
      const userId = crypto.randomUUID();
      const displayText = fileSnap ? `📎 ${fileSnap.name}\n${text}` : text;
      const userMsg: ChatMessage = { id: userId, role: "user", content: displayText, streaming: false };
      void appendMessage({ id: userId, conversationId: convId, role: "user", content: displayText, createdAt: new Date().toISOString() });

      // AI placeholder
      const aiId = crypto.randomUUID();
      const aiMsg: ChatMessage = { id: aiId, role: "ai", content: "", streaming: true };
      setMessages((prev) => [...prev, userMsg, aiMsg]);

      try {
        const res = await fetch(`${BACKEND}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: apiMessage, session_id: convId, lang, ...(userContext ? { user_context: userContext } : {}) }),
        });
        if (!res.body) throw new Error("No stream");

        const reader = res.body.getReader();
        const dec    = new TextDecoder();
        let buf = "";
        let fullContent = "";

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
              setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, streaming: false } : m));
              void appendMessage({ id: aiId, conversationId: convId!, role: "ai", content: fullContent, createdAt: new Date().toISOString() });
              setLastAiMsgId(aiId);
              setFollowUps(getFollowUps(fullContent, lang, text));
              continue;
            }
            try {
              const ev = JSON.parse(raw);
              if (ev.type === "text") {
                fullContent += ev.content;
                setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: m.content + ev.content } : m));
              } else if (ev.type === "error") {
                setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: `⚠️ ${ev.content}`, streaming: false } : m));
              }
            } catch { /* skip */ }
          }
        }
      } catch {
        const errText = { uz: "Xatolik yuz berdi. Qayta urinib ko'ring.", ru: "Произошла ошибка. Попробуйте снова.", en: "An error occurred. Please try again." };
        setMessages((prev) => prev.map((m) => m.id === aiId ? { ...m, content: errText[lang], streaming: false } : m));
      } finally {
        setBusy(false);
        setConversations(await getConversations());
      }
    },
    [input, busy, currentConvId, lang, user]
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const submitReport = async () => {
    try {
      await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: reportPhone, error: reportText, lang }) });
    } catch { /* ignore */ }
    setReportOk(true);
    setTimeout(() => { setShowReport(false); setReportPhone(""); setReportText(""); setReportOk(false); }, 2000);
  };

  // ── Document generator ──────────────────────────────
  const generateDocument = async () => {
    if (!docType) return;
    const dt = DOC_TYPES.find((d) => d.key === docType)!;
    setDocTitle(dt.name[lang]);
    setDocContent("");
    setDocStreaming(true);

    // Build conversation context
    const history = messages
      .filter((m) => !m.streaming)
      .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n\n");
    const prompt = `${dt.promptPrefix[lang]}\n\nConversation context:\n\n${history}`;

    try {
      const res = await fetch(`${BACKEND}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, session_id: `doc_${crypto.randomUUID()}`, lang }),
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
          if (raw === "[DONE]") { setDocStreaming(false); continue; }
          try {
            const ev = JSON.parse(raw);
            if (ev.type === "text") setDocContent((prev) => prev + ev.content);
          } catch { /* skip */ }
        }
      }
    } catch {
      setDocContent({ uz: "Xatolik yuz berdi.", ru: "Произошла ошибка.", en: "An error occurred." }[lang]);
    } finally {
      setDocStreaming(false);
    }
  };

  const printDocument = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><title>${docTitle}</title>
      <style>
        body { font-family: Georgia,serif; max-width:720px; margin:40px auto; color:#111; }
        h1 { font-size:22px; border-bottom:2px solid #C9A84C; padding-bottom:10px; }
        h2 { font-size:16px; color:#C9A84C; margin:24px 0 8px; }
        h3 { font-size:14px; margin:16px 0 6px; }
        p  { line-height:1.75; margin:0 0 12px; }
        ul,ol { padding-left:20px; margin:0 0 12px; }
        li { line-height:1.7; margin-bottom:4px; }
        table { width:100%; border-collapse:collapse; margin:16px 0; }
        th { background:#f5f5f5; padding:8px; border:1px solid #ddd; }
        td { padding:7px; border:1px solid #ddd; }
        blockquote { border-left:3px solid #C9A84C; padding:8px 16px; background:#fffbf0; margin:0 0 12px; }
      </style></head>
      <body><h1>${docTitle}</h1><div>${convertMarkdownToHtml(docContent)}</div></body></html>`);
    win.document.close();
    win.print();
  };

  const downloadMarkdown = () => {
    const blob = new Blob([`# ${docTitle}\n\n${docContent}`], { type: "text/markdown;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${docTitle.replace(/\s+/g, "_")}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const openDocGen = () => {
    setDocType(""); setDocContent(""); setDocStreaming(false); setDocTitle("");
    setShowDocGen(true);
  };

  // ── Stage index ──────────────────────────────────────
  const stageIdx = STAGES.findIndex((s) => s.key === profile?.stage);
  const groups = groupConversations(conversations, t);

  // ── Initials for avatar ──────────────────────────────
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  // ════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════
  return (
    <div className="app">

      {/* ── Header ──────────────────────────────────── */}
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">
            <MenuIcon />
          </button>
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            <div className="logo-icon"><GemIcon size={15} /></div>
            <span className="logo-wordmark">Consultant <span className="logo-accent">AI</span></span>
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Language */}
          <div className="lang-switch">
            {(["uz", "ru", "en"] as Lang[]).map((l) => (
              <button key={l} className={`lang-btn${lang === l ? " lang-active" : ""}`} onClick={() => { setLang(l); localStorage.setItem("cai-lang", l); }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Theme */}
          <button className="theme-toggle" onClick={() => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); localStorage.setItem("cai-theme", next); }} aria-label="Toggle theme">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Document generator + Export (when there are messages) */}
          {messages.length > 0 && (
            <>
              <button className="docgen-btn" onClick={openDocGen} title="Generate document">
                <DocIcon /> Generate doc
              </button>
              <button className="msg-action-btn" style={{ opacity: 1 }} onClick={exportChat} title="Export conversation">
                <ExportIcon /> <span style={{ fontSize: 11 }}>{t.export}</span>
              </button>
            </>
          )}

          {/* User pill */}
          <div className="user-menu-wrap">
            <button className="user-pill" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="user-avatar">{initials}</div>
              {user && <span className="user-name">{user.name}</span>}
            </button>
            {showUserMenu && (
              <div className="user-menu" onClick={() => setShowUserMenu(false)}>
                {user ? (
                  <>
                    <div style={{ padding: "6px 10px 10px", borderBottom: "1px solid var(--line-1)", marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{user.name}</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1 }}>{user.email}</div>
                    </div>
                    <button className="user-menu-item" onClick={() => { router.push("/onboarding"); }}>
                      ✏️ &nbsp;Edit profile
                    </button>
                    <button className="user-menu-item" onClick={() => setShowReport(true)}>
                      🐞 &nbsp;Report issue
                    </button>
                    <button className="user-menu-item danger" onClick={() => { logout(); router.push("/login"); }}>
                      → &nbsp;Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <button className="user-menu-item" onClick={() => router.push("/login")}>Sign in</button>
                    <button className="user-menu-item" onClick={() => setShowReport(true)}>🐞 Report issue</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────── */}
      <div className="main">

        {/* Mobile overlay */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* ── Sidebar ─────────────────────────────── */}
        <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>

          {/* Brand */}
          <div className="sb-brand">
            <div className="sb-brand-icon"><GemIcon size={14} /></div>
            <div className="sb-brand-info">
              <span className="sb-brand-name">Consultant AI</span>
              <span className="sb-brand-badge">Beta</span>
            </div>
          </div>

          {/* New Chat */}
          <button className="new-chat-btn" onClick={startNewChat}>
            <PlusIcon /> {t.newChat}
          </button>

          {/* Milestone tracker */}
          {profile && (
            <div className="milestone-tracker">
              <div className="milestone-title">{t.journey}</div>
              {STAGES.map((s, i) => (
                <button
                  key={s.key}
                  className={`milestone-step${profile.stage === s.key ? " milestone-active" : i < stageIdx ? " milestone-done" : ""}`}
                  onClick={() => updateStage(s.key)}
                  title={s.label[lang]}
                >
                  <span className="milestone-icon">
                    {i < stageIdx ? "✓" : s.icon}
                  </span>
                  <span className="milestone-name">{s.label[lang]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Conversation history */}
          <div className="sb-section">
            <div className="sb-section-label">{t.historyLabel}</div>
            {groups.length === 0 ? (
              <div className="sb-history-empty">
                <div className="sb-history-empty-icon"><ChatIcon /></div>
                <p className="sb-history-empty-text">{t.historyEmpty}</p>
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.label} className="conv-group">
                  <div className="conv-group-label">{g.label}</div>
                  {g.items.map((conv) => (
                    <button
                      key={conv.id}
                      className={`conv-item${currentConvId === conv.id ? " conv-active" : ""}`}
                      onClick={() => openConversation(conv.id)}
                    >
                      <span className="conv-item-icon"><ChatIcon /></span>
                      <span className="conv-item-title">{conv.title}</span>
                      <span
                        className="conv-item-del"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => removeConversation(conv.id, e)}
                        onKeyDown={(e) => e.key === "Enter" && removeConversation(conv.id, e as unknown as React.MouseEvent)}
                        title={t.deleteConv}
                        aria-label={t.deleteConv}
                      >
                        <TrashIcon />
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="sb-footer">
            <div className="sb-user" onClick={() => { if (user) { router.push("/onboarding"); } else { router.push("/login"); } }}>
              <div className="sb-user-avatar">
                {user ? initials : "?"}
              </div>
              <span className="sb-user-name">
                {user ? user.name : (lang === "uz" ? "Kirish" : lang === "ru" ? "Войти" : "Sign in")}
              </span>
            </div>
          </div>
        </aside>

        {/* ── Chat area ───────────────────────────── */}
        <div
          className="chat-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >

          {/* Drag-and-drop overlay */}
          {isDragOver && (
            <div className="drop-overlay">
              <div className="drop-overlay-box">
                <span className="drop-overlay-icon">📎</span>
                <span className="drop-overlay-text">
                  {lang === "ru" ? "Отпустите файл" : lang === "en" ? "Drop file here" : "Faylni tashlang"}
                </span>
                <span className="drop-overlay-hint">PDF · DOCX · XLSX · CSV · TXT</span>
              </div>
            </div>
          )}

          {/* ── Beta banner ─────────────────────────── */}
          {bannerVisible && (
            <div className="beta-banner">
              <span className="beta-banner-badge">BETA</span>
              <span className="beta-banner-text">
                {lang === "ru" ? "Это демо-версия — ваш отзыв важен для нас"
                  : lang === "en" ? "This is a demo — your feedback helps us improve"
                  : "Bu demo versiya — fikringiz bizga muhim"}
              </span>
              <button className="beta-banner-btn" onClick={() => setBannerModalOpen(true)}>
                {lang === "ru" ? "Оставить отзыв" : lang === "en" ? "Give feedback" : "Fikr bildirish"}
              </button>
              <button className="beta-banner-dismiss" onClick={dismissBanner} aria-label="Dismiss">×</button>
            </div>
          )}

          <div className="messages-list" ref={messagesListRef}>
            <div className="messages-inner">

              {/* Empty state */}
              {messages.length === 0 && (
                <div className="welcome">
                  <div className="welcome-gem"><GemIcon size={28} /></div>
                  <h1 className="welcome-title">
                    <em>{t.welcome}</em>
                  </h1>
                  <p className="welcome-desc">{t.welcomeDesc}</p>
                  <div className="welcome-chips">
                    {STARTERS[lang].map((s, i) => (
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
                  {msg.role === "ai" && (
                    <div className="msg-avatar"><GemIcon size={14} /></div>
                  )}
                  <div className="msg-bubble">

                    {/* Thinking indicator */}
                    {msg.role === "ai" && msg.streaming && msg.content === "" ? (
                      <div className="thinking-bubble">
                        <div className="geo-spinner">
                          <div className="geo-ring-outer"/>
                          <div className="geo-ring-inner"/>
                          <div className="geo-dot"/>
                        </div>
                        <span className="thinking-text">{t.thinking}…</span>
                      </div>
                    ) : (
                      <div className={["msg-content", msg.role === "ai" && msg.streaming ? "streaming-cursor" : ""].filter(Boolean).join(" ")}>
                        {msg.role === "ai" ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}
                            components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>
                    )}

                    {/* AI message actions */}
                    {msg.role === "ai" && !msg.streaming && msg.content && (
                      <>
                        <div className="msg-actions">
                          {/* Copy */}
                          <button className="msg-action-btn" onClick={() => copyMessage(msg.id, msg.content)} title={t.copy}>
                            {copiedId === msg.id ? <><CheckIcon /><span>{t.copied}</span></> : <><CopyIcon /><span>{t.copy}</span></>}
                          </button>
                          {/* Pin */}
                          <button
                            className={`msg-action-btn${savedIds.has(msg.id) ? " pinned" : ""}`}
                            onClick={() => handleTogglePin(msg.id)}
                            title={savedIds.has(msg.id) ? t.unpin : t.pin}
                          >
                            <PinIcon filled={savedIds.has(msg.id)} />
                            <span>{savedIds.has(msg.id) ? t.unpin : t.pin}</span>
                          </button>
                          {/* Feedback */}
                          {feedbackThanks === msg.id ? (
                            <span className="feedback-thanks">✓ Thanks!</span>
                          ) : (
                            <>
                              <button
                                className={`msg-action-btn feedback-btn${feedbackRatings[msg.id] === 1 ? " feedback-good" : ""}`}
                                onClick={() => rateFeedback(msg.id, 1)}
                                title="Good response"
                              >
                                👍
                              </button>
                              <button
                                className={`msg-action-btn feedback-btn${feedbackRatings[msg.id] === -1 ? " feedback-bad" : ""}`}
                                onClick={() => rateFeedback(msg.id, -1)}
                                title="Bad response — leave feedback"
                              >
                                👎
                              </button>
                            </>
                          )}
                        </div>

                        {/* Follow-up chips — only under the last AI message */}
                        {msg.id === lastAiMsgId && followUps.length > 0 && (
                          <div className="followup-wrap">
                            {followUps.map((q, i) => (
                              <button key={i} className="followup-chip" onClick={() => { setFollowUps([]); sendMessage(q); }}>
                                <span className="followup-arrow">→</span> {q}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Input bar ─────────────────────────── */}
          <div className="input-area">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.csv,.txt"
              style={{ display: "none" }}
              onChange={handleFileAttach}
            />

            {/* File chip — shown when a file is attached */}
            {(attachedFile || fileUploading || fileError) && (
              <div className="file-chip-row">
                {fileUploading && (
                  <div className="file-chip file-chip-loading">
                    <span className="file-chip-icon">⏳</span>
                    <span>Uploading…</span>
                  </div>
                )}
                {attachedFile && !fileUploading && (
                  <div className="file-chip">
                    <span className="file-chip-icon">📎</span>
                    <span className="file-chip-name">{attachedFile.name}</span>
                    <span className="file-chip-meta">{(attachedFile.chars / 1000).toFixed(1)}k chars{attachedFile.truncated ? " (truncated)" : ""}</span>
                    <button className="file-chip-remove" onClick={() => setAttachedFile(null)} aria-label="Remove file">×</button>
                  </div>
                )}
                {fileError && !fileUploading && (
                  <div className="file-chip file-chip-error">
                    <span>⚠ {fileError}</span>
                    <button className="file-chip-remove" onClick={() => setFileError(null)} aria-label="Dismiss">×</button>
                  </div>
                )}
              </div>
            )}

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
              <div className="input-actions">
                {/* Attach */}
                <button
                  className={`attach-btn${attachedFile ? " attach-active" : ""}`}
                  title="Attach file (PDF, DOCX, XLSX, CSV, TXT)"
                  aria-label="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fileUploading}
                >
                  <PaperclipIcon />
                </button>
                {/* Voice */}
                <button
                  className={`voice-btn${isListening ? " listening" : ""}`}
                  onClick={startVoice}
                  title="Voice input"
                  aria-label="Voice"
                >
                  <MicIcon active={isListening} />
                </button>
                {/* Send */}
                <button className="send-btn" disabled={(!input.trim() && !attachedFile) || busy} onClick={() => sendMessage()} aria-label="Send">
                  <SendIcon />
                </button>
              </div>
            </div>
            <div className="input-meta">
              <span className="input-hint">{t.hint}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feedback modal ──────────────────────────── */}
      {feedbackModal && (
        <div className="feedback-overlay" onClick={(e) => { if (e.target === e.currentTarget) setFeedbackModal(null); }}>
          <div className="feedback-modal">
            <div className="feedback-modal-header">
              <span>👎 What went wrong?</span>
              <button className="docgen-close" onClick={() => setFeedbackModal(null)} aria-label="Close">✕</button>
            </div>

            <textarea
              className="feedback-comment"
              placeholder="Describe the issue (optional)…"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              onPaste={handleFeedbackPaste}
              rows={3}
            />

            {/* Screenshot area */}
            <div className="feedback-screenshot-area">
              {feedbackScreenshot ? (
                <div className="feedback-screenshot-preview">
                  <img src={feedbackScreenshot} alt="Screenshot" />
                  <button className="feedback-screenshot-remove" onClick={() => setFeedbackScreenshot(null)}>Remove</button>
                </div>
              ) : (
                <label className="feedback-screenshot-drop">
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFeedbackImageUpload} />
                  <span>📷 Paste screenshot (Ctrl+V) or click to upload</span>
                </label>
              )}
            </div>

            <div className="feedback-modal-actions">
              <button className="feedback-skip" onClick={() => setFeedbackModal(null)}>Skip</button>
              <button
                className="feedback-submit"
                disabled={feedbackSubmitting}
                onClick={submitFeedbackModal}
              >
                {feedbackSubmitting ? "Sending…" : "Send feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Banner feedback modal ───────────────────── */}
      {bannerModalOpen && (
        <div className="feedback-overlay" onClick={(e) => { if (e.target === e.currentTarget && !bannerSubmitting) setBannerModalOpen(false); }}>
          <div className="feedback-modal">
            {bannerThanks ? (
              <div style={{ padding: "32px", textAlign: "center", fontSize: 15 }}>
                ✅ {lang === "ru" ? "Спасибо за ваш отзыв!" : lang === "en" ? "Thanks for your feedback!" : "Fikringiz uchun rahmat!"}
              </div>
            ) : (
              <>
                <div className="feedback-modal-header">
                  <span>💬 {lang === "ru" ? "Оставить отзыв о бета-версии" : lang === "en" ? "Beta feedback" : "Beta versiya haqida fikr"}</span>
                  <button className="docgen-close" onClick={() => setBannerModalOpen(false)} aria-label="Close">✕</button>
                </div>

                <div style={{ display: "flex", gap: 10, padding: "12px 0 4px" }}>
                  <button
                    className={`feedback-btn${bannerRating === 1 ? " feedback-good active" : " feedback-good"}`}
                    onClick={() => setBannerRating(1)}
                    style={{ flex: 1, opacity: bannerRating === -1 ? 0.4 : 1 }}
                  >👍 {lang === "ru" ? "Нравится" : lang === "en" ? "Looks good" : "Yaxshi"}</button>
                  <button
                    className={`feedback-btn${bannerRating === -1 ? " feedback-bad active" : " feedback-bad"}`}
                    onClick={() => setBannerRating(-1)}
                    style={{ flex: 1, opacity: bannerRating === 1 ? 0.4 : 1 }}
                  >👎 {lang === "ru" ? "Нужно улучшить" : lang === "en" ? "Needs work" : "Yaxshilash kerak"}</button>
                </div>

                <textarea
                  className="feedback-comment"
                  placeholder={lang === "ru" ? "Напишите комментарий (необязательно)…" : lang === "en" ? "Write a comment (optional)…" : "Izoh yozing (ixtiyoriy)…"}
                  value={bannerComment}
                  onChange={(e) => setBannerComment(e.target.value)}
                  rows={3}
                />

                <div className="feedback-modal-actions">
                  <button className="feedback-skip" onClick={() => setBannerModalOpen(false)}>
                    {lang === "ru" ? "Отмена" : lang === "en" ? "Cancel" : "Bekor qilish"}
                  </button>
                  <button
                    className="feedback-submit"
                    disabled={!bannerRating || bannerSubmitting}
                    onClick={submitBannerFeedback}
                  >
                    {bannerSubmitting ? "…" : lang === "ru" ? "Отправить" : lang === "en" ? "Send" : "Yuborish"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Document generator modal ────────────────── */}
      {showDocGen && (
        <div className="docgen-overlay" onClick={(e) => { if (e.target === e.currentTarget && !docStreaming) setShowDocGen(false); }}>
          <div className="docgen-modal">
            <div className="docgen-header">
              <div className="docgen-header-left">
                <div className="docgen-header-icon">📄</div>
                <div>
                  <div className="docgen-title">Generate document</div>
                  <div className="docgen-subtitle">AI writes a structured document from your conversation</div>
                </div>
              </div>
              {!docStreaming && (
                <button className="docgen-close" onClick={() => setShowDocGen(false)} aria-label="Close"><XIcon /></button>
              )}
            </div>

            {/* Type picker — shown when no content yet */}
            {!docContent && !docStreaming && (
              <>
                <div className="docgen-picker">
                  {DOC_TYPES.map((dt) => (
                    <button
                      key={dt.key}
                      className={`docgen-type-btn${docType === dt.key ? " selected" : ""}`}
                      onClick={() => setDocType(dt.key)}
                    >
                      <span className="docgen-type-emoji">{dt.emoji}</span>
                      <div className="docgen-type-info">
                        <span className="docgen-type-name">{dt.name[lang]}</span>
                        <span className="docgen-type-desc">{dt.desc[lang]}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  className="docgen-generate-btn"
                  disabled={!docType}
                  onClick={generateDocument}
                >
                  {docType
                    ? `✨ Generate ${DOC_TYPES.find((d) => d.key === docType)!.name[lang]}`
                    : "Select a document type above"}
                </button>
              </>
            )}

            {/* Streaming / preview */}
            {(docContent || docStreaming) && (
              <div className="docgen-preview-wrap">
                <div className="docgen-doc-header">
                  <input
                    className="docgen-doc-title-input"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Document title…"
                  />
                  {!docStreaming && (
                    <div className="docgen-doc-actions">
                      <button className="docgen-action-btn" onClick={() => { setDocContent(""); setDocType(""); }}>
                        ← Change type
                      </button>
                      <button className="docgen-action-btn" onClick={downloadMarkdown} title="Download .md">
                        <DownloadIcon /> .md
                      </button>
                      <button className="docgen-action-btn primary" onClick={printDocument} title="Print / Save as PDF">
                        <PrintIcon /> Print PDF
                      </button>
                    </div>
                  )}
                  {docStreaming && (
                    <div style={{ fontSize: 12, color: "var(--gold)", display: "flex", alignItems: "center", gap: 6 }}>
                      <div className="geo-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", animation: "pulse 1s ease infinite" }} />
                      Writing…
                    </div>
                  )}
                </div>
                <div className="docgen-preview-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}
                    components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
                  >
                    {docContent}
                  </ReactMarkdown>
                  {docStreaming && <span className="docgen-streaming" />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Report modal ────────────────────────────── */}
      {showReport && (
        <div className="report-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}>
          <div className="report-modal">
            <div className="report-modal-header">
              <span className="report-modal-title">Report an issue</span>
              <button className="report-close-btn" onClick={() => setShowReport(false)} aria-label="Close"><XIcon /></button>
            </div>
            {reportOk ? (
              <div className="report-success"><span style={{ fontSize: 28 }}>✅</span><p>Message sent! Thank you.</p></div>
            ) : (
              <>
                <div className="report-form-group">
                  <label className="report-form-label">Phone number</label>
                  <input className="report-form-input" type="tel" placeholder="+998 90 000 00 00" value={reportPhone} onChange={(e) => setReportPhone(e.target.value)} />
                </div>
                <div className="report-form-group">
                  <label className="report-form-label">Describe the issue</label>
                  <textarea className="report-form-textarea" placeholder="What happened?" rows={4} value={reportText} onChange={(e) => setReportText(e.target.value)} />
                </div>
                <div className="report-modal-btns">
                  <button className="report-cancel-btn" onClick={() => setShowReport(false)}>Cancel</button>
                  <button className="send-btn" style={{ width: "auto", padding: "0 20px", height: 36, fontSize: 13, fontFamily: "var(--font)", fontWeight: 600, borderRadius: 9 }} disabled={!reportPhone.trim() || !reportText.trim()} onClick={submitReport}>Submit</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
