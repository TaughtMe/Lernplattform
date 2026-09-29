import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { SiteMetaActions } from "./components/site-meta-actions";
import "./globals.css?ui=acceptance-v5";
import "./student-module-shell.css";
import "katex/dist/katex.min.css";
import "./ui/lernraum-ui.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&family=Work+Sans:wght@300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <SiteMetaActions />
      </body>
    </html>
  );
}
