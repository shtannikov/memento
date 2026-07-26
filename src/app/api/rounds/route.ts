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
    const user = authenticateRequest(request);
    await ensureUserAndSeed(user);
    const body = await parseJson(request, CreateRoundSchema);
    return NextResponse.json({
      round: await createRound(user.id, body.retryRoundId),
    });
  } catch (error) {
    return apiError(error);
  }
}
