import { NextResponse } from "next/server";

import { purgeExpiredSpeakingTranscripts } from "@/app/_features/speaking/server/retention";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const purged = await purgeExpiredSpeakingTranscripts();
  return NextResponse.json({ ok: true, purged });
}
