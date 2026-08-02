import { NextResponse } from "next/server";

import { dispatchDailySpeakingTasks } from "@/lib/server/speaking/tasks";
import { purgeExpiredSpeakingTranscripts } from "@/lib/server/speaking/retention";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const purged = await purgeExpiredSpeakingTranscripts();
  const delivery = await dispatchDailySpeakingTasks("en");
  return NextResponse.json({ ok: true, purged, ...delivery });
}
