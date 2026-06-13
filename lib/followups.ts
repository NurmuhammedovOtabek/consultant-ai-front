import type { Lang } from "./types";

interface TopicSuggestions {
  patterns: RegExp;
  suggestions: Record<Lang, string[]>;
}

const TOPICS: TopicSuggestions[] = [
  {
    patterns: /ro.yxat|регистр|registr|ooo|xk\b|mchj/i,
    suggestions: {
      uz: ["Ro'yxatdan o'tish narxi qancha?", "Qanday hujjatlar kerak?", "INN qanday olaman?"],
      ru: ["Сколько стоит регистрация?", "Какие нужны документы?", "Как получить ИНН?"],
      en: ["How much does registration cost?", "What documents do I need?", "How do I get a tax ID?"],
    },
  },
  {
    patterns: /soliq|налог|tax|nds|qqs|yagona/i,
    suggestions: {
      uz: ["Soliq stavkasi qancha?", "Soliq muddatlari qachon?", "QQS to'lash kerakmi?"],
      ru: ["Какая налоговая ставка?", "Когда платить налоги?", "Нужно ли платить НДС?"],
      en: ["What is the tax rate?", "When are tax deadlines?", "Do I need to pay VAT?"],
    },
  },
  {
    patterns: /litsenz|лицензи|license|ruxsatnoma|разреш/i,
    suggestions: {
      uz: ["Litsenziya narxi qancha?", "Litsenziya olish muddati?", "Qaysi organga murojaat qilish?"],
      ru: ["Сколько стоит лицензия?", "Срок получения лицензии?", "В какой орган обращаться?"],
      en: ["How much does a license cost?", "How long to get a license?", "Which authority to contact?"],
    },
  },
  {
    patterns: /kredit|кредит|loan|grant|грант|moliya|финанс/i,
    suggestions: {
      uz: ["Foiz stavkasi qancha?", "Kerakli hujjatlar?", "Davlat dasturlari bormi?"],
      ru: ["Какая процентная ставка?", "Нужные документы?", "Есть ли государственные программы?"],
      en: ["What is the interest rate?", "What documents are needed?", "Are there government programs?"],
    },
  },
  {
    patterns: /raqobat|конкурент|competitor|bozor|рынок|market/i,
    suggestions: {
      uz: ["Bozordagi asosiy o'yinchilar kim?", "Raqobat qanchalik kuchli?", "Qaysi hududda kamroq raqobat?"],
      ru: ["Кто основные игроки рынка?", "Насколько высока конкуренция?", "В каком районе меньше конкурентов?"],
      en: ["Who are the main market players?", "How strong is the competition?", "Which area has less competition?"],
    },
  },
  {
    patterns: /valyuta|валюта|dollar|kurs|курс|exchange/i,
    suggestions: {
      uz: ["Euro kursi qanday?", "Rossiya rubli kursi?", "Kurs qachon o'zgaradi?"],
      ru: ["Какой курс евро?", "Курс российского рубля?", "Когда меняется курс?"],
      en: ["What is the euro rate?", "Russian ruble rate?", "When does the rate change?"],
    },
  },
  {
    patterns: /bojxona|таможн|customs|import|eksport|экспорт/i,
    suggestions: {
      uz: ["Boj stavkasi qancha?", "Kerakli hujjatlar?", "Import uchun litsenziya kerakmi?"],
      ru: ["Какая таможенная ставка?", "Нужные документы?", "Нужна ли лицензия на импорт?"],
      en: ["What is the customs rate?", "What documents are needed?", "Is an import license required?"],
    },
  },
  {
    patterns: /ishchi|xodim|сотрудник|employee|mehnat|труд|salary|maosh/i,
    suggestions: {
      uz: ["Minimal ish haqi qancha?", "Ijtimoiy sug'urta to'lovlari?", "Ishchi qabul qilish tartibi?"],
      ru: ["Какой минимальный размер оплаты труда?", "Взносы в социальное страхование?", "Порядок найма сотрудников?"],
      en: ["What is the minimum wage?", "Social security contributions?", "Hiring procedure for employees?"],
    },
  },
  {
    patterns: /yer|арен|ijarа|land|office|ofis|офис/i,
    suggestions: {
      uz: ["Ijara narxlari qancha?", "Davlat yeri qanday olinadi?", "Ijara shartnomasi qanday tuziladi?"],
      ru: ["Какие цены на аренду?", "Как получить государственную землю?", "Как составить договор аренды?"],
      en: ["What are rental prices?", "How to get government land?", "How to draw up a lease agreement?"],
    },
  },
];

const DEFAULT: Record<Lang, string[]> = {
  uz: ["Boshqa savolim bor", "Ko'proq ma'lumot ber", "Qo'shimcha maslahat kerak"],
  ru: ["Есть ещё вопрос", "Расскажи подробнее", "Нужна дополнительная консультация"],
  en: ["I have another question", "Tell me more", "I need additional advice"],
};

export function getFollowUps(aiContent: string, lang: Lang, userMessage = ""): string[] {
  let best: { score: number; topic: TopicSuggestions } | null = null;

  for (const topic of TOPICS) {
    const globalRe = new RegExp(topic.patterns.source, "gi");
    // user message weighted 4x — intent beats AI response keyword noise
    const userHits = (userMessage.match(globalRe) ?? []).length * 4;
    const aiHits   = (aiContent.match(globalRe) ?? []).length;
    const score    = userHits + aiHits;
    if (score > 0 && (!best || score > best.score)) {
      best = { score, topic };
    }
  }

  return best ? best.topic.suggestions[lang].slice(0, 3) : DEFAULT[lang];
}
