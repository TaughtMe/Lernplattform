import type { Metadata } from "next";
import { OAuthReturn } from "./oauth-return";

export const metadata: Metadata = {
  title: "Anmeldung",
  robots: { index: false },
};

export default function Page() {
  return <OAuthReturn />;
}
