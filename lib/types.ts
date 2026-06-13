// ── Shared types across the app ────────────────────────────────

export type Lang = "uz" | "ru" | "en";

export type BusinessStage = "idea" | "research" | "planning" | "registered" | "operating";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Profile {
  userId: string;
  businessName: string;
  industry: string;
  location: string;
  stage: BusinessStage;
  lang: Lang;
  completedOnboarding: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  lang: Lang;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "ai";
  content: string;
  createdAt: string;
}

export const STAGES: { key: BusinessStage; icon: string; label: Record<Lang, string> }[] = [
  { key: "idea",       icon: "💡", label: { uz: "G'oya",        ru: "Идея",         en: "Idea"         } },
  { key: "research",   icon: "🔍", label: { uz: "Tadqiqot",     ru: "Исследование", en: "Research"     } },
  { key: "planning",   icon: "📋", label: { uz: "Reja",         ru: "Планирование", en: "Planning"     } },
  { key: "registered", icon: "🏢", label: { uz: "Ro'yxatda",    ru: "Зарегистрирован", en: "Registered" } },
  { key: "operating",  icon: "🚀", label: { uz: "Faoliyatda",   ru: "В работе",     en: "Operating"    } },
];

export const INDUSTRIES: { value: string; label: Record<Lang, string> }[] = [
  { value: "retail",       label: { uz: "Savdo",            ru: "Торговля",           en: "Retail"           } },
  { value: "food",         label: { uz: "Oziq-ovqat / Kafe", ru: "Еда / Кафе",        en: "Food & Beverage"  } },
  { value: "construction", label: { uz: "Qurilish",          ru: "Строительство",      en: "Construction"     } },
  { value: "tech",         label: { uz: "IT / Texnologiya",  ru: "IT / Технологии",   en: "Tech / IT"        } },
  { value: "services",     label: { uz: "Xizmatlar",         ru: "Услуги",             en: "Services"         } },
  { value: "agriculture",  label: { uz: "Qishloq xo'jaligi", ru: "Сельское хозяйство", en: "Agriculture"      } },
  { value: "education",    label: { uz: "Ta'lim",            ru: "Образование",         en: "Education"        } },
  { value: "other",        label: { uz: "Boshqa",            ru: "Другое",             en: "Other"            } },
];
