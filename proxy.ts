import { NextRequest, NextResponse } from "next/server";
import {
  fallbackRoute,
  isPathVisible,
  PREVIEW_COOKIE,
} from "./src/domain/release";
import { releaseVisibility } from "./app/release/release-config";

const PREVIEW_PARAM = "vorschau";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ?vorschau=an|aus schaltet die Vorschau für dieses Gerät um.
  const toggle = searchParams.get(PREVIEW_PARAM);
  if (toggle === "an" || toggle === "aus") {
    const destination = request.nextUrl.clone();
    destination.searchParams.delete(PREVIEW_PARAM);
    const response = NextResponse.redirect(destination, 307);
    if (toggle === "an") {
      response.cookies.set(PREVIEW_COOKIE, "1", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    } else {
      response.cookies.delete(PREVIEW_COOKIE);
    }
    return response;
  }

  const visibility = releaseVisibility(
    request.cookies.get(PREVIEW_COOKIE)?.value,
  );
  if (isPathVisible(pathname, visibility)) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.pathname = fallbackRoute(pathname);
  destination.search = "";
  return NextResponse.redirect(destination, 307);
}
