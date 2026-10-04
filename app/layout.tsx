import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { PREVIEW_COOKIE } from "../src/domain/release";
import { releaseVisibility } from "./release/release-config";
import { ReleaseProvider } from "./release/release-context";
import { AreaFrame } from "./ui/shell/area-frame";
import { SiteFooter } from "./ui/site-footer";
import "@fontsource-variable/work-sans/wght.css";
import "@fontsource-variable/fredoka/wght.css";
import "katex/dist/katex.min.css";
import "./ui/tokens.css";
import "./ui/base.css";
import "./ui/lernraum-ui.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Die Bildschirmtastatur verkleinert den Inhalt, statt ihn zu überdecken.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2e8" },
    { media: "(prefers-color-scheme: dark)", color: "#17150f" },
  ],
  colorScheme: "light dark",
};

const themeBootScript = `(()=>{try{const p=localStorage.getItem("theme-preference")||"system";const t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch{}})()`;

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:5173";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", siteUrl).toString();

  return {
    metadataBase: siteUrl,
    title: {
      default: "Lernraum – Laufdiktat",
      template: "%s | Lernraum",
    },
    description: "Datensparsames Laufdiktat für kurzlebige Unterrichtsräume.",
    openGraph: {
      title: "Lernraum – Laufdiktat",
      description: "Laufdiktat gemeinsam im Unterricht durchführen.",
      type: "website",
      locale: "de_DE",
      images: [
        {
          url: socialImage,
          width: 1536,
          height: 1024,
          alt: "Lernraum – Laufdiktat im Unterricht.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Lernraum – Laufdiktat",
      description: "Laufdiktat gemeinsam im Unterricht durchführen.",
      images: [socialImage],
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
      apple: { url: "/icon-180.png", sizes: "180x180", type: "image/png" },
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "Lernraum" },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const visibility = releaseVisibility(
    (await cookies()).get(PREVIEW_COOKIE)?.value,
  );
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const liveRoomConfig = url && publishableKey ? { url, publishableKey } : null;
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ReleaseProvider value={visibility}>
          <AreaFrame liveRoomConfig={liveRoomConfig}>{children}</AreaFrame>
          <SiteFooter />
        </ReleaseProvider>
      </body>
    </html>
  );
}
