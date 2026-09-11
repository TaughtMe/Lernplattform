import { NextRequest, NextResponse } from "next/server";
import { isPilotPublicRoute } from "./src/pilot-mode";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    isPilotPublicRoute(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.pathname = pathname.startsWith("/lehrer") ? "/lehrer/live" : "/";
  destination.search = "";
  destination.searchParams.set("pilot", "1");
  return NextResponse.redirect(destination, 307);
}
