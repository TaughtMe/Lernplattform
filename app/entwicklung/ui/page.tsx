import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UiCatalog } from "./ui-catalog";

export const metadata: Metadata = {
  title: "Bausteine",
  robots: { index: false, follow: false },
};

/** Übersicht der Grundbausteine; nur in der Entwicklung erreichbar. */
export default function UiCatalogPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiCatalog />;
}
