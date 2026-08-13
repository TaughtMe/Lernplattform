import type { Metadata } from "next";
import { RunningDictationApp } from "../../../components/running-dictation-app";

export const metadata: Metadata = { title: "Laufdiktat" };

export default function RunningDictationPage() {
  return <RunningDictationApp />;
}
