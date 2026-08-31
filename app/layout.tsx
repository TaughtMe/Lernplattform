import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { ThemeToggle } from "./components/theme-toggle";
import { SiteMetaActions } from "./components/site-meta-actions";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffaf4" },
    { media: "(prefers-color-scheme: dark)", color: "#171311" },
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
      </head>
      <body>
        {children}
        <SiteMetaActions />
        <ThemeToggle />
      </body>
    </html>
  );
}
