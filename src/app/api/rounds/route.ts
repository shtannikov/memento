import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  authenticateRequest,
  parseJson,
} from "@/app/_server/api";
import { createRound } from "@/app/_features/quiz/server/rounds";
import { ensureUserAndSeed } from "@/app/_features/vocabulary/server/vocabulary";

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
