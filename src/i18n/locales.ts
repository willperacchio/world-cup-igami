export const locales = [
  // Host countries
  "en", "es", "fr",
  // Alphabetical
  "id", "bs", "cs", "de", "hr", "it", "sw",
  "hu", "nl", "no", "uz", "pl", "pt", "ro", "sv", "vi", "tr",
  "el", "ru", "uk", "ar", "fa", "hi", "th", "zh", "zh-HK", "ja", "ko",
] as const;

export type Locale = (typeof locales)[number];

export const localeConfig: Record<Locale, { name: string; flag: string }> = {
  id: { name: "Bahasa Indonesia", flag: "🇮🇩" },
  bs: { name: "Bosanski", flag: "🇧🇦" },
  cs: { name: "Čeština", flag: "🇨🇿" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  en: { name: "English", flag: "🇺🇸" },
  es: { name: "Español", flag: "🇲🇽" },
  fr: { name: "Français", flag: "🇨🇦" },
  hr: { name: "Hrvatski", flag: "🇭🇷" },
  it: { name: "Italiano", flag: "🇮🇹" },
  sw: { name: "Kiswahili", flag: "🇰🇪" },
  hu: { name: "Magyar", flag: "🇭🇺" },
  nl: { name: "Nederlands", flag: "🇳🇱" },
  no: { name: "Norsk", flag: "🇳🇴" },
  uz: { name: "Oʻzbekcha", flag: "🇺🇿" },
  pl: { name: "Polski", flag: "🇵🇱" },
  pt: { name: "Português", flag: "🇧🇷" },
  ro: { name: "Română", flag: "🇷🇴" },
  sv: { name: "Svenska", flag: "🇸🇪" },
  vi: { name: "Tiếng Việt", flag: "🇻🇳" },
  tr: { name: "Türkçe", flag: "🇹🇷" },
  el: { name: "Ελληνικά", flag: "🇬🇷" },
  ru: { name: "Русский", flag: "🇷🇺" },
  uk: { name: "Українська", flag: "🇺🇦" },
  ar: { name: "العربية", flag: "🇸🇦" },
  fa: { name: "فارسی", flag: "🇮🇷" },
  hi: { name: "हिन्दी", flag: "🇮🇳" },
  th: { name: "ไทย", flag: "🇹🇭" },
  zh: { name: "中文(简体)", flag: "🇨🇳" },
  "zh-HK": { name: "中文(繁體)", flag: "🇭🇰" },
  ja: { name: "日本語", flag: "🇯🇵" },
  ko: { name: "한국어", flag: "🇰🇷" },
};
