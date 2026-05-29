import type { MetadataRoute } from "next";
import { locales } from "@/i18n/locales";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Sitemap covering all 32 locale homepages. Each entry advertises every other
 * locale as an alternate so search engines map the cross-locale relationship.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();

  const languages = Object.fromEntries(
    locales.map((loc) => [loc, `${baseUrl}/${loc}`]),
  );

  return locales.map((locale) => ({
    url: `${baseUrl}/${locale}`,
    lastModified,
    changeFrequency: "daily",
    priority: locale === "en" ? 1 : 0.8,
    alternates: { languages },
  }));
}
