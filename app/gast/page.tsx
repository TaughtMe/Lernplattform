import type { Metadata } from "next";
import { GuestEntry } from "./guest-entry";

export const metadata: Metadata = { title: "Gastmodus" };

export default function Page() {
  return <GuestEntry />;
}
