import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getSiteLanguageForRequest,
  SITE_APP_HEADER,
} from "@/app/site-routing";

export function proxy(request: NextRequest) {
  const language = getSiteLanguageForRequest(
    request.nextUrl.hostname,
    request.nextUrl.searchParams.get("site"),
  );
  if (!language) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SITE_APP_HEADER, language.id);

  if (
    language.site.trial &&
    request.nextUrl.pathname === language.site.trial.publicPath
  ) {
    return NextResponse.rewrite(
      new URL(language.site.trial.routePath, request.url),
      { request: { headers: requestHeaders } },
    );
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
