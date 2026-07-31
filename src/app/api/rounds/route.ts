import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  authenticateRequest,
  parseJson,
} from "@/lib/server/api";
import { createRound } from "@/lib/server/rounds";
import { ensureUserAndSeed } from "@/lib/server/vocabulary";

const CreateRoundSchema = z.object({
  retryRoundId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const { appId, user } = authenticateRequest(request);
    await ensureUserAndSeed(user, appId);
    const body = await parseJson(request, CreateRoundSchema);
    return NextResponse.json({
      round: await createRound(user.id, appId, body.retryRoundId),
    });
  } catch (error) {
    return apiError(error);
  }
}
