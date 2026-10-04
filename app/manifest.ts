import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lernraum",
    short_name: "Lernraum",
    description: "Gemeinsam lernen, im Unterricht und zu Hause.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#211f1b",
    theme_color: "#211f1b",
    lang: "de",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
