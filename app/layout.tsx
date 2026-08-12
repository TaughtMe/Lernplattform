import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#df625f",
  colorScheme: "light",
};

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
      default: "Lernraum – gemeinsam lernen",
      template: "%s | Lernraum",
    },
    description:
      "Lernraum verbindet Unterricht und selbstständiges Wiederholen in einer datensparsamen, local-first Lernplattform.",
    openGraph: {
      title: "Lernraum – gemeinsam lernen",
      description: "Gemeinsam lernen, im Unterricht und zu Hause.",
      type: "website",
      locale: "de_DE",
      images: [
        {
          url: socialImage,
          width: 1536,
          height: 1024,
          alt: "Lernraum – gemeinsam lernen, im Unterricht und zu Hause.",
        },
      ],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
