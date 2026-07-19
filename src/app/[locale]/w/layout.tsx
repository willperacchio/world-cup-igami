import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "World Cupigami W",
  description: "Every unique final score in FIFA Women's World Cup history",
  openGraph: {
    title: "World Cupigami W",
    description:
      "Every unique final score in FIFA Women's World Cup history. Track scorigamis live during the 2027 Women's World Cup.",
  },
};

export default function WomensLayout({ children }: { children: React.ReactNode }) {
  return children;
}
