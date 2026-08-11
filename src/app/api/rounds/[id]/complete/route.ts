import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  AppError,
  authenticateRequest,
  parseJson,
} from "@/app/_server/api";
import { getMementoDb } from "@/app/_server/supabase";

const CompletionSchema = z.object({
  firstAttempts: z
    .array(
      z.object({
        vocabularyId: z.string().regex(/^\d+$/),
        correct: z.boolean(),
      }),
    )
    .min(1)
    .max(10),
  mistakes: z.number().int().min(0).max(2),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { appId, user } = authenticateRequest(request);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError("INVALID_REQUEST", "Invalid quiz.", 400);
    }
    const body = await parseJson(request, CompletionSchema);
    const supabase = getMementoDb();
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("app_id", appId)
      .maybeSingle();
    if (roundError) throw roundError;
    if (!round) throw new AppError("NOT_FOUND", "Quiz not found.", 404);

    const { data, error } = await supabase.rpc("complete_round", {
      requested_round_id: id,
      requested_user_id: user.id,
      first_attempt_results: body.firstAttempts.map((result) => ({
        vocabulary_id: Number(result.vocabularyId),
        correct: result.correct,
      })),
      requested_mistakes: body.mistakes,
    });
    if (error) {
      if (error.message.includes("ROUND_STALE")) {
        throw new AppError(
          "ROUND_STALE",
          "Your vocabulary changed. These quiz results weren’t saved.",
          409,
        );
      }
      if (error.message.includes("ROUND_NOT_FOUND")) {
        throw new AppError("NOT_FOUND", "Quiz not found.", 404);
      }
      throw error;
    }
    return NextResponse.json({ result: data });
  } catch (error) {
    return apiError(error);
  }
}
