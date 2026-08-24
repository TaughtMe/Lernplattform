import type { Metadata } from "next";
import { TypingApp } from "../../components/typing/typing-app";

export const metadata: Metadata = { title: "Tipptraining" };

export default function TypingPage() {
  return <TypingApp />;
}
