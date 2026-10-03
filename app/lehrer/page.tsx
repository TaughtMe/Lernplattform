import type { Metadata } from "next";
import { ContentLibrary } from "./content-library";

export const metadata: Metadata = { title: "Inhalte" };

export default function Page() {
  return <ContentLibrary />;
}
