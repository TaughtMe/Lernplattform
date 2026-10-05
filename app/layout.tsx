import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { PREVIEW_COOKIE } from "../src/domain/release";
import { readOAuthClientIds } from "../src/integrations/cloud-sync/oauth";
import { CloudClientIdsProvider } from "./components/cloud-client-ids";
import { releaseVisibility } from "./release/release-config";
import { ReleaseProvider } from "./release/release-context";
import { AreaFrame } from "./ui/shell/area-frame";
import { ServiceWorkerRegistration } from "./ui/service-worker-registration";
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

// Chrome bietet das Installieren oft schon vor der Hydration an. Das Ereignis
// wird deshalb sofort gemerkt; `use-install-prompt` liest es später aus.
const installPromptScript = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e;window.dispatchEvent(new Event("lernraum-install-ready"))})`;

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
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "48x48" },
      ],
      shortcut: "/favicon.ico",
      apple: { url: "/icon-180.png", sizes: "180x180", type: "image/png" },
    },
    appleWebApp: {
      capable: true,
      title: "Lernraum",
      statusBarStyle: "default",
    },
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
  const cloudClientIds = readOAuthClientIds();
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Absichtlich nicht in den Metadaten: vinext schiebt gestreamte
            Manifest-Links nicht in den <head> zurück, Chrome wertet sie dann
            nicht aus und bietet keine Installation an. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <script dangerouslySetInnerHTML={{ __html: installPromptScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ReleaseProvider value={visibility}>
          <CloudClientIdsProvider value={cloudClientIds}>
            <AreaFrame liveRoomConfig={liveRoomConfig}>{children}</AreaFrame>
          </CloudClientIdsProvider>
          <SiteFooter />
          <ServiceWorkerRegistration />
        </ReleaseProvider>
      </body>
    </html>
  );
}
