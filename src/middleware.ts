import { NextRequest, NextResponse } from "next/server";
import { locales } from "./i18n/locales";

/**
 * Edition-first routing: public URLs are /mens/{locale}/... and
 * /womens/{locale}/..., rewritten internally onto the next-intl app tree
 * (/{locale}/... for men's, /{locale}/w/... for women's).
 *
 *   /                    → redirect /mens/{detected locale}
 *   /mens                → redirect /mens/{detected locale}
 *   /mens/en             → rewrite  /en
 *   /mens/en/embed       → rewrite  /en/embed
 *   /womens/es           → rewrite  /es/w
 *   /en                  → redirect /mens/en          (legacy locale-first)
 *   /en/w or /en/womens  → redirect /womens/en        (legacy)
 */

const LOCALES = new Set<string>(locales);
const EDITION_RE = /^\/(mens|womens)(?:\/(.*))?$/;

function detectLocale(req: NextRequest): string {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && LOCALES.has(cookie)) return cookie;
  const header = req.headers.get("accept-language") || "";
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (LOCALES.has(tag)) return tag;
    const base = tag.split("-")[0];
    if (LOCALES.has(base)) return base;
  }
  return "en";
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Root → men's edition in the detected locale.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/mens/${detectLocale(req)}`;
    return NextResponse.redirect(url);
  }

  const editionMatch = pathname.match(EDITION_RE);
  if (editionMatch) {
    const [, edition, rest = ""] = editionMatch;
    const segments = rest.split("/").filter(Boolean);
    const maybeLocale = segments[0];

    if (maybeLocale && LOCALES.has(maybeLocale)) {
      // /mens/{locale}/... → /{locale}/... ; /womens/{locale}/... → /{locale}/w/...
      const tail = segments.slice(1).join("/");
      const url = req.nextUrl.clone();
      url.pathname =
        edition === "mens"
          ? `/${maybeLocale}${tail ? `/${tail}` : ""}`
          : `/${maybeLocale}/w${tail ? `/${tail}` : ""}`;
      const res = NextResponse.rewrite(url);
      res.cookies.set("NEXT_LOCALE", maybeLocale, { path: "/" });
      return res;
    }

    // /mens or /mens/embed (no locale) → insert the detected locale.
    const url = req.nextUrl.clone();
    url.pathname = `/${edition}/${detectLocale(req)}${rest ? `/${rest}` : ""}`;
    return NextResponse.redirect(url);
  }

  // Legacy locale-first URLs → redirect to canonical edition-first form.
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && LOCALES.has(segments[0])) {
    const localeSeg = segments[0];
    const rest = segments.slice(1);
    const url = req.nextUrl.clone();
    if (rest[0] === "w" || rest[0] === "womens") {
      const tail = rest.slice(1).join("/");
      url.pathname = `/womens/${localeSeg}${tail ? `/${tail}` : ""}`;
    } else {
      const tail = rest.join("/");
      url.pathname = `/mens/${localeSeg}${tail ? `/${tail}` : ""}`;
    }
    return NextResponse.redirect(url);
  }

  // Unknown top-level path (no locale, no edition) → treat as men's content
  // path in the detected locale (e.g. /embed → /mens/en/embed).
  const url = req.nextUrl.clone();
  url.pathname = `/mens/${detectLocale(req)}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
