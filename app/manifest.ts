import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Lernraum", short_name: "Lernraum", description: "Gemeinsam lernen, im Unterricht und zu Hause.", start_url: "/", display: "standalone", background_color: "#fffaf4", theme_color: "#df625f", lang: "de", icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }] };
}
