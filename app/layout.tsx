import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:5173";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", siteUrl).toString();

  return {
    metadataBase: siteUrl,
    title: { default: "Lernraum – gemeinsam lernen", template: "%s | Lernraum" },
    description: "Lernraum verbindet Unterricht und selbstständiges Wiederholen: Laufdiktat, LernBox, Wortspeicher, Tastenwelt und Häuser – datensparsam und local-first.",
    openGraph: {
      title: "Lernraum – gemeinsam lernen",
      description: "Gemeinsam lernen, im Unterricht und zu Hause.",
      type: "website",
      locale: "de_DE",
      images: [{ url: socialImage, width: 1536, height: 1024, alt: "Lernraum – gemeinsam lernen, im Unterricht und zu Hause." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Lernraum – gemeinsam lernen",
      description: "Gemeinsam lernen, im Unterricht und zu Hause.",
      images: [socialImage],
    },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}

// Setzt das Farbschema vor dem ersten Rendern, damit dunkle Geräte nicht hell aufblitzen.
const THEME_INIT = `try{var t=JSON.parse(localStorage.getItem("lernraum:personal:v1:theme")||"null");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&family=Work+Sans:wght@300..800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
