import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

// Geist supports Latin, Latin Extended, and Cyrillic — enough for the 24
// European locales in src/i18n/locales.ts (en, es, fr, de, pl, cs, hr, hu,
// ro, bs, it, nl, no, pt, sv, sw, tr, uz, vi, ru, uk, …). For Greek/Arabic/
// Persian/Hindi/Thai/CJK locales, the browser falls back to system fonts
// per the chain in globals.css, which on modern OSes renders cleanly.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

// Editorial display face — italic gets the playful "Cupigami" gag.
// "Cupigami" is a brand name, so it always renders in Latin script regardless
// of the locale. Fraunces' subsets: latin, latin-ext, vietnamese.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext", "vietnamese"],
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "World Cupigami",
  description: "Every unique final score in Men's FIFA World Cup history",
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "World Cupigami",
    description:
      "Every unique final score in Men's FIFA World Cup history. Track scorigamis live during the 2026 World Cup.",
    url: siteUrl,
    siteName: "World Cupigami",
    images: [
      {
        url: "/logo-1024.png",
        width: 1024,
        height: 1024,
        alt: "World Cupigami — scorigami heatmap icon",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "World Cupigami",
    description:
      "Every unique final score in Men's FIFA World Cup history. Track scorigamis live during the 2026 World Cup.",
    images: ["/logo-512.png"],
    creator: "@WorldCupigami",
    site: "@WorldCupigami",
  },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const enMessages = (await import(`../../../messages/en.json`)).default;
  let localeMessages = enMessages;
  if (locale !== "en") {
    try {
      localeMessages = (await import(`../../../messages/${locale}.json`)).default;
    } catch {
      // Fall back to English
    }
  }
  const messages = { ...enMessages, ...localeMessages };

  return (
    <html
      lang={locale}
      dir="ltr"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
