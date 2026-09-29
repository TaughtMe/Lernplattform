import { cookies } from "next/headers";
import { PREVIEW_COOKIE } from "../src/domain/release";
import { LandingView } from "./landing/landing-view";
import { releaseVisibility } from "./release/release-config";

export default async function Home() {
  const visibility = releaseVisibility(
    (await cookies()).get(PREVIEW_COOKIE)?.value,
  );
  const configured = Boolean(
    process.env["NEXT_PUBLIC_SUPABASE_URL"] &&
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  );
  return (
    <LandingView
      learnerRoom={visibility.lernen}
      teacherOverview={visibility.lehrer}
      roomServiceConfigured={configured}
    />
  );
}
