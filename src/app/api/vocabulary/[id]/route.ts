import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  AppError,
  authenticateRequest,
  parseJson,
} from "@/lib/server/api";
import { getMementoDb } from "@/lib/server/supabase";
import {
  ensureUserAndSeed,
  loadVocabulary,
  resetSchedule,
} from "@/lib/server/vocabulary";

const ChangeStatusSchema = z.object({
  action: z.enum(["learn", "restore"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = authenticateRequest(request);
    await ensureUserAndSeed(user);
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) {
      throw new AppError("INVALID_REQUEST", "Invalid vocabulary item.", 400);
    }
    const { action } = await parseJson(request, ChangeStatusSchema);
    const { data, error } = await getMementoDb()
      .from("vocabulary_items")
      .update({
        status: action === "learn" ? "learned" : "learning",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("is_removed", false)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new AppError("NOT_FOUND", "Vocabulary item not found.", 404);
    }
    if (action === "restore") await resetSchedule(id);

    return NextResponse.json({
      vocabulary: await loadVocabulary(user.id),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = authenticateRequest(request);
    await ensureUserAndSeed(user);
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) {
      throw new AppError("INVALID_REQUEST", "Invalid vocabulary item.", 400);
    }
    const { data, error } = await getMementoDb()
      .from("vocabulary_items")
      .update({
        is_removed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new AppError("NOT_FOUND", "Vocabulary item not found.", 404);
    }

    return NextResponse.json({
      vocabulary: await loadVocabulary(user.id),
    });
  } catch (error) {
    return apiError(error);
  }
}
