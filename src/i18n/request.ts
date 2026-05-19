import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import type { Locale } from "./locales";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  // Load the requested locale's messages, falling back to English for missing keys
  const enMessages = (await import(`../../messages/en.json`)).default;
  let localeMessages = enMessages;
  if (locale !== "en") {
    try {
      localeMessages = (await import(`../../messages/${locale}.json`)).default;
    } catch {
      // No translation file yet — fall back entirely to English
    }
  }

  return {
    locale,
    messages: { ...enMessages, ...localeMessages },
  };
});
