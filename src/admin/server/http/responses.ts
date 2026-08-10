import { NextResponse } from "next/server";

import { AdminAuthError } from "../auth";

export function adminApiError(error: unknown): NextResponse {
  if (error instanceof AdminAuthError) {
    return NextResponse.json(
      { code: error.code, message: error.message },
      { status: error.status },
    );
  }
  console.error(error);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "Couldn’t load the admin app." },
    { status: 500 },
  );
}
