import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// next-intl: identity translation function. Returns the dotted key as the
// "translated" string and interpolates {placeholders} from the params object.
// If the key itself has no placeholders to substitute, the param values are
// appended so callers (e.g. ScorigamiGrid aria-labels) remain distinguishable
// when the same i18n key is used with different params.
vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) =>
    (key: string, params?: Record<string, unknown>) => {
      const fullKey = ns ? `${ns}.${key}` : key;
      if (!params) return fullKey;
      let out = fullKey;
      let replaced = false;
      for (const [k, v] of Object.entries(params)) {
        const next = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        if (next !== out) replaced = true;
        out = next;
      }
      if (!replaced) {
        const tail = Object.values(params).map(String).join(" ");
        return `${fullKey} ${tail}`;
      }
      return out;
    },
  useLocale: () => "en",
}));

// next/navigation: stub the App Router hooks. Component tests don't need
// real navigation; they just need these to exist and not throw.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));
