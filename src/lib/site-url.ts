/**
 * Resolve the canonical site URL used by robots.txt, sitemap.xml, and any
 * Open Graph metadata.
 *
 * Priority order:
 *   1. NEXT_PUBLIC_SITE_URL — explicit override; set this in Vercel envs
 *      once you have a custom domain (e.g. https://worldcupigami.com).
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel auto-injects this on production
 *      builds. Always points at the canonical .vercel.app URL.
 *   3. VERCEL_URL — Vercel auto-injects this on preview/production builds.
 *   4. http://localhost:3000 — local dev fallback.
 *
 * Always returned without a trailing slash.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;

  const vercelAny = process.env.VERCEL_URL;
  if (vercelAny) return `https://${vercelAny}`;

  return "http://localhost:3000";
}
