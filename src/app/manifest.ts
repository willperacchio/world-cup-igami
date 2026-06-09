import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "World Cupigami",
    short_name: "Cupigami",
    description:
      "Every unique final score in Men's FIFA World Cup history. Track scorigamis live during the 2026 World Cup.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f0d",
    theme_color: "#0a0f0d",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/logo-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/logo-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
