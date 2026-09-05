import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  isPomnenkaProductionRequest,
  POMNENKA_SITE,
  POMNENKA_SITE_HEADER,
} from "@/app/site-routing";

export function proxy(request: NextRequest) {
  if (!isPomnenkaProductionRequest(request.nextUrl.hostname)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(POMNENKA_SITE_HEADER, POMNENKA_SITE);

  if (request.nextUrl.pathname === "/trial") {
    return NextResponse.rewrite(new URL("/cz/trial", request.url), {
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
