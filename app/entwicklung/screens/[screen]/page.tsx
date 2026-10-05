import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DESIGN_SCREENS } from "../design-screens";
import { ScreenFrame } from "../screen-frame";

export const metadata: Metadata = {
  title: "Design-Screen",
  robots: { index: false, follow: false },
};

/** Ein Referenzzustand in exakter Rahmengröße (für den Designvergleich). */
export default async function DesignScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { screen: id } = await params;
  const screen = DESIGN_SCREENS.find((entry) => entry.id === id);
  if (!screen?.implemented) notFound();
  return (
    <ScreenFrame
      state={{ id, screen: screen.screen, theme: screen.theme }}
      width={screen.width}
      height={screen.height}
    />
  );
}
