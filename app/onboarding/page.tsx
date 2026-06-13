"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { saveProfile, getProfile } from "@/lib/db";
import { STAGES, INDUSTRIES, type Lang, type BusinessStage } from "@/lib/types";

// ── Uzbekistan locations for autocomplete ───────────────────────────────────
const UZ_LOCATIONS: string[] = [
  // Toshkent shahri
  "Toshkent",
  "Yunusobod", "Chilonzor", "Mirobod", "Shayxontohur", "Almazar",
  "Bektemir", "Mirzo Ulug'bek", "Uchtepa", "Yakkasaroy", "Sergeli", "Olmazor",
  // Toshkent viloyati
  "Toshkent viloyati", "Chirchiq", "Olmaliq", "Angren", "Bekobod",
  "Yangiyo'l", "Ohangaron", "Nurafshon", "Bo'stonliq",
  // Andijon
  "Andijon", "Shahrixon", "Asaka", "Xo'jaobod", "Marhamat", "Baliqchi",
  // Buxoro
  "Buxoro", "G'ijduvon", "Kogon", "Shofirkon", "Qorovulbozor",
  // Farg'ona
  "Farg'ona", "Qo'qon", "Marg'ilon", "Quvasoy", "Rishton", "Oltiariq",
  // Jizzax
  "Jizzax", "Zomin", "G'allaorol", "Paxtakor",
  // Xorazm
  "Urganch", "Xiva", "Pitnak", "Gurlan", "Hazorasp",
  // Namangan
  "Namangan", "Chust", "Pop", "Kosonsoy", "To'raqo'rg'on",
  // Navoiy
  "Navoiy", "Zarafshon", "Karmana", "Uchquduq", "Nurota",
  // Qashqadaryo
  "Qarshi", "Shahrisabz", "Kitob", "Muborak", "Koson",
  // Samarqand
  "Samarqand", "Kattaqo'rg'on", "Ishtixon", "Urgut", "Bulung'ur",
  // Sirdaryo
  "Guliston", "Yangiyer", "Shirin", "Boyovut",
  // Surxondaryo
  "Termiz", "Denov", "Boysun", "Sariosiyo",
  // Qoraqalpog'iston
  "Nukus", "Beruniy", "Qo'ng'irot", "Xo'jayli", "Turtkul",
];

// ── Translations ─────────────────────────────────────────────────────────────
const T = {
  step1_title:    { uz: "Qaysi sohada ishlaysiz?",              ru: "В какой отрасли вы работаете?",     en: "What industry are you in?"          },
  step1_sub:      { uz: "Bu eng to'g'ri maslahat berishga yordam beradi.", ru: "Это поможет дать точный совет.", en: "This helps us give the most relevant advice." },
  step1_other_ph: { uz: "Soha nomini yozing…",                  ru: "Опишите вашу отрасль…",             en: "Describe your industry…"            },
  step2_title:    { uz: "Biznesingiz qayerda joylashgan?",       ru: "Где находится ваш бизнес?",         en: "Where is your business based?"      },
  step2_sub:      { uz: "Shahar yoki tuman — mahalliy bozor ma'lumotlari uchun.", ru: "Город или район — для данных местного рынка.", en: "City or district — for local market data." },
  step2_ph:       { uz: "Shahar yoki tuman kiriting…",           ru: "Введите город или район…",          en: "Type a city or district…"           },
  step3_title:    { uz: "Biznesingiz qaysi bosqichda?",          ru: "На каком этапе ваш бизнес?",        en: "What stage are you at?"             },
  step3_sub:      { uz: "Bu yerdan rivojlanishingizni kuzatib boramiz.", ru: "Будем отслеживать ваш прогресс.", en: "We'll track your progress from here." },
  btn_continue:   { uz: "Davom etish →",                        ru: "Продолжить →",                      en: "Continue →"                         },
  btn_back:       { uz: "← Orqaga",                             ru: "← Назад",                           en: "← Back"                             },
  btn_start:      { uz: "Suhbatni boshlash →",                  ru: "Начать чат →",                      en: "Start chatting →"                   },
};

const STAGE_DESCS: Record<BusinessStage, Record<Lang, string>> = {
  idea:       { uz: "Hali hech narsa yozilmagan — faqat g'oya",         ru: "Идея есть, но не оформлена",      en: "Just an idea in mind"          },
  research:   { uz: "Bozorni va raqobatni o'rganmoqdaman",              ru: "Изучаю рынок и конкурентов",      en: "Researching the market"        },
  planning:   { uz: "Biznes-reja va hisob-kitoblar tayyorlanmoqda",     ru: "Готовлю бизнес-план",             en: "Preparing the business plan"   },
  registered: { uz: "Kompaniya yoki yakka tartibda ro'yxatdan o'tgan",  ru: "Зарегистрировал компанию",        en: "Company is registered"         },
  operating:  { uz: "Biznes ishlayapti — rivojlanish kerak",            ru: "Бизнес работает — нужно расти",   en: "Business is running"           },
};

const INDUSTRY_ICONS: Record<string, string> = {
  retail: "🏪", food: "☕", construction: "🏗️", tech: "💻",
  services: "🤝", agriculture: "🌾", education: "📚", other: "✨",
};

function GemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 28 28" fill="currentColor">
      <path d="M14 2.5L5 9.5 2 14l12 11.5L26 14l-3-4.5L14 2.5z" opacity="0.3" />
      <path d="M14 2.5l9 7-9 13.5L5 9.5l9-7z" opacity="0.6" />
      <path d="M14 2.5L5 9.5h18L14 2.5z" />
    </svg>
  );
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [step, setStep]               = useState(1);
  const [industry, setIndustry]       = useState("");
  const [otherText, setOtherText]     = useState("");
  const [location, setLocation]       = useState("");
  const [locInput, setLocInput]       = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug]         = useState(false);
  const [stage, setStage]             = useState<BusinessStage | "">("");
  const [lang, setLang]               = useState<Lang>("uz");
  const sugRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cai-lang") as Lang | null;
    if (saved && ["uz", "ru", "en"].includes(saved)) setLang(saved);
  }, []);

  useEffect(() => {
    getProfile().then((profile) => {
      if (profile?.completedOnboarding) router.replace("/chat");
    });
  }, [router]);

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("cai-lang", l);
  };

  // Location autocomplete
  const handleLocInput = (val: string) => {
    setLocInput(val);
    setLocation(val);
    if (val.trim().length >= 1) {
      const q = val.toLowerCase();
      const matches = UZ_LOCATIONS.filter((loc) =>
        loc.toLowerCase().includes(q)
      ).slice(0, 7);
      setSuggestions(matches);
      setShowSug(matches.length > 0);
    } else {
      setShowSug(false);
    }
  };

  const pickLocation = (loc: string) => {
    setLocation(loc);
    setLocInput(loc);
    setShowSug(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node)) {
        setShowSug(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const totalSteps = 3;
  const t = (key: keyof typeof T) => T[key][lang];

  const effectiveIndustry =
    industry === "other" && otherText.trim()
      ? otherText.trim().toLowerCase()
      : industry;

  const canContinueStep1 =
    industry !== "" && (industry !== "other" || otherText.trim().length > 0);

  const handleFinish = () => {
    const userId = user?.id ?? "guest";
    saveProfile({
      userId,
      businessName: "",
      industry:     effectiveIndustry || "other",
      location:     location.trim() || "Toshkent",
      stage:        (stage as BusinessStage) || "idea",
      lang,
      completedOnboarding: true,
    });
    localStorage.setItem("cai-lang", lang);
    router.replace("/chat");
  };

  return (
    <div className="onboard-page">
      <div className="auth-glow" />

      <div className="onboard-card">
        {/* Header */}
        <div className="onboard-header">
          <Link href="/" className="auth-logo" style={{ textDecoration: "none" }}>
            <div className="auth-logo-icon"><GemIcon /></div>
            <span className="auth-logo-name">Consultant <span style={{ color: "var(--gold)" }}>AI</span></span>
          </Link>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span className="onboard-step-label">STEP {step} OF {totalSteps}</span>
            <div className="onboard-progress">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`onboard-dot${i + 1 < step ? " done" : i + 1 === step ? " active" : ""}`}
                />
              ))}
            </div>
            {/* Language picker */}
            <div className="onboard-lang-picker">
              {(["uz", "ru", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  className={`onboard-lang-btn${lang === l ? " active" : ""}`}
                  onClick={() => changeLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Step 1: Industry ──────────────────────────────── */}
        {step === 1 && (
          <>
            <div>
              <h2 className="onboard-title">{t("step1_title")}</h2>
              <p className="onboard-subtitle" style={{ marginTop: 6 }}>{t("step1_sub")}</p>
            </div>
            <div className="onboard-grid">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  className={`onboard-option${industry === ind.value ? " selected" : ""}`}
                  onClick={() => { setIndustry(ind.value); if (ind.value !== "other") setOtherText(""); }}
                >
                  <span className="onboard-option-icon">{INDUSTRY_ICONS[ind.value]}</span>
                  <span className="onboard-option-label">{ind.label[lang]}</span>
                </button>
              ))}
            </div>

            {/* Free text when "other" is selected */}
            {industry === "other" && (
              <input
                className="onboard-input"
                type="text"
                placeholder={t("step1_other_ph")}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                autoFocus
              />
            )}

            <div className="onboard-nav">
              <div />
              <button
                className="onboard-next"
                onClick={() => setStep(2)}
                disabled={!canContinueStep1}
              >
                {t("btn_continue")}
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Location with autocomplete ───────────── */}
        {step === 2 && (
          <>
            <div>
              <h2 className="onboard-title">{t("step2_title")}</h2>
              <p className="onboard-subtitle" style={{ marginTop: 6 }}>{t("step2_sub")}</p>
            </div>
            <div ref={sugRef} style={{ position: "relative" }}>
              <input
                className="onboard-input"
                type="text"
                placeholder={t("step2_ph")}
                value={locInput}
                onChange={(e) => handleLocInput(e.target.value)}
                onFocus={() => locInput.trim() && setShowSug(suggestions.length > 0)}
                autoFocus
              />
              {showSug && (
                <div className="onboard-suggestions">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      className="onboard-suggestion-item"
                      onMouseDown={() => pickLocation(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Quick-pick chips for top cities */}
            {!locInput && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Toshkent", "Samarqand", "Buxoro", "Namangan", "Andijon", "Farg'ona"].map((city) => (
                  <button
                    key={city}
                    className="welcome-chip"
                    style={{ fontSize: 12 }}
                    onClick={() => pickLocation(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
            <div className="onboard-nav">
              <button className="onboard-back" onClick={() => setStep(1)}>{t("btn_back")}</button>
              <button
                className="onboard-next"
                onClick={() => setStep(3)}
                disabled={!location.trim()}
              >
                {t("btn_continue")}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Stage ────────────────────────────────── */}
        {step === 3 && (
          <>
            <div>
              <h2 className="onboard-title">{t("step3_title")}</h2>
              <p className="onboard-subtitle" style={{ marginTop: 6 }}>{t("step3_sub")}</p>
            </div>
            <div className="onboard-stage-grid">
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  className={`onboard-stage-option${stage === s.key ? " selected" : ""}`}
                  onClick={() => setStage(s.key)}
                >
                  <span className="onboard-stage-icon">{s.icon}</span>
                  <div className="onboard-stage-info">
                    <span className="onboard-stage-name">{s.label[lang]}</span>
                    <span className="onboard-stage-desc">{STAGE_DESCS[s.key][lang]}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="onboard-nav">
              <button className="onboard-back" onClick={() => setStep(2)}>{t("btn_back")}</button>
              <button
                className="onboard-next"
                onClick={handleFinish}
                disabled={!stage}
              >
                {t("btn_start")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
