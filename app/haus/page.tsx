import type { Metadata } from "next";
import { HouseApp } from "./house-app";

export const metadata: Metadata = { title: "Mein Haus" };

export default function Page() {
  return <HouseApp />;
}
