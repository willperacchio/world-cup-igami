import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

// The women's edition ("World Cupigami W") carries its own rose-accented
// branding. These asset variants live in public/ alongside the men's set and
// are generated from public/icon-w.svg (see the logo section of README /
// REACTIVATION.md). Every image field is set explicitly so none of the men's
// values from the parent layout leak through Next's metadata merge.
export const metadata: Metadata = {
  title: "World Cupigami W",
  description: "Every unique final score in FIFA Women's World Cup history",
  icons: {
    icon: [
      { url: "/icon-w.svg", type: "image/svg+xml" },
      { url: "/favicon-w.ico", sizes: "any" },
    ],
    apple: "/apple-icon-w.png",
  },
  openGraph: {
    title: "World Cupigami W",
    description:
      "Every unique final score in FIFA Women's World Cup history. Track scorigamis live during the 2027 Women's World Cup.",
    url: `${siteUrl}/womens`,
    siteName: "World Cupigami W",
    images: [
      {
        url: "/logo-1024-w.png",
        width: 1024,
        height: 1024,
        alt: "World Cupigami W — rose scorigami heatmap icon",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "World Cupigami W",
    description:
      "Every unique final score in FIFA Women's World Cup history. Track scorigamis live during the 2027 Women's World Cup.",
    images: ["/logo-512-w.png"],
    creator: "@WorldCupigami",
    site: "@WorldCupigami",
  },
};

export default function WomensLayout({ children }: { children: React.ReactNode }) {
  return children;
}
