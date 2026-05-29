"use client";

import { useTranslations } from "next-intl";
import { TwitterIcon, InstagramIcon, EmailIcon } from "./icons";

const SOCIAL_LINKS = [
  { href: "https://twitter.com/YOUR_HANDLE", label: "Twitter", Icon: TwitterIcon },
  { href: "https://instagram.com/YOUR_HANDLE", label: "Instagram", Icon: InstagramIcon },
  { href: "mailto:your@email.com", label: "Email", Icon: EmailIcon },
] as const;

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="pt-6 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 space-y-4">
      <div className="space-y-1">
        <div>
          {t("dataFrom")}{" "}
          <a
            href="https://github.com/jfjelstul/worldcup"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("dataSource")}
          </a>{" "}
          {t("author")}
        </div>
        <div>
          {t("liveDataFrom")}{" "}
          <a
            href="https://www.football-data.org"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("liveDataSource")}
          </a>
        </div>
        <div>
          {t("conceptCredit")}{" "}
          (<a
            href="https://www.youtube.com/watch?v=9l5C8cGMueY"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            original NFL scorigami video
          </a>)
        </div>
      </div>
      <p className="text-zinc-500">{t("disclaimer")}</p>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          {SOCIAL_LINKS.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("mailto:") ? undefined : "_blank"}
              rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              aria-label={label}
            >
              <Icon className="w-5 h-5" />
            </a>
          ))}
        </div>
        <a
          href="https://www.buymeacoffee.com/wap_"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "#FFDD00", color: "#000000", fontFamily: "Lato, sans-serif" }}
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
            alt=""
            className="h-4 w-4"
          />
          Buy me a coffee
        </a>
      </div>
    </footer>
  );
}
