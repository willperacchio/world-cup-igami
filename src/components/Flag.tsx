import { getFlagSrc } from "@/lib/flags";

interface FlagProps {
  /** ISO/team code from the match data, e.g. "ARG", "DEU", "IRN". */
  code: string;
  /** Year of the match — drives historical flag overrides (e.g. East Germany). */
  year: number;
  /** Display size. Defaults to "sm" (20×14). */
  size?: "xs" | "sm" | "md";
  /** Accessible label. Pass the country name; empty string for decorative use. */
  alt?: string;
  /** Optional extra classes (e.g. ring on hover). */
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<FlagProps["size"]>, string> = {
  xs: "w-4 h-3",
  sm: "w-5 h-3.5",
  md: "w-6 h-4",
};

/**
 * Centralized country-flag image. Single source of truth for the chrome
 * (border, rounded corners, alignment) so every screen renders flags
 * identically. Use this anywhere a flag appears.
 */
export function Flag({ code, year, size = "sm", alt = "", className = "" }: FlagProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- flags are tiny static svgs; next/image overhead isn't worth it
    <img
      src={getFlagSrc(code, year)}
      alt={alt}
      className={`inline-block object-cover rounded-sm border border-zinc-200 dark:border-zinc-700 align-text-bottom shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}
