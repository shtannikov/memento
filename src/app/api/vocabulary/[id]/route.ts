import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  AppError,
  authenticateRequest,
  parseJson,
} from "@/server/api";
import { getMementoDb } from "@/server/supabase";
import { getLanguage } from "@/languages/registry";
import {
  ensureUserAndSeed,
  loadVocabulary,
  resetSchedule,
} from "@/features/vocabulary/server/vocabulary";

const ChangeStatusSchema = z.object({
  action: z.enum(["learn", "practice", "restore", "return"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { appId, user } = authenticateRequest(request);
    await ensureUserAndSeed(user, appId);
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) {
      throw new AppError("INVALID_REQUEST", "Invalid vocabulary item.", 400);
    }
    const { action } = await parseJson(request, ChangeStatusSchema);
    const speakingEnabled = Boolean(getLanguage(appId).speaking);
    if (!speakingEnabled) {
      if (action === "practice" || action === "return") {
        throw new AppError(
          "SPEAKING_UNAVAILABLE",
          "Speaking practice is unavailable for this language.",
          409,
        );
      }
      const { data, error } = await getMementoDb()
        .from("vocabulary_items")
        .update({
          status: action === "learn" ? "learned" : "learning",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("app_id", appId)
        .eq("status", action === "learn" ? "learning" : "learned")
        .eq("is_removed", false)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new AppError(
          "INVALID_STATUS_CHANGE",
          "That phrase cannot be moved from its current stage.",
          409,
        );
      }
      if (action === "restore") await resetSchedule(id);
      return NextResponse.json({
        vocabulary: await loadVocabulary(user.id, appId),
      });
    }
    if (action === "learn") {
      throw new AppError(
        "INVALID_STATUS_CHANGE",
        "Phrases become Learned after speaking practice.",
        409,
      );
    }
    const { data, error } = await getMementoDb().rpc(
      action === "practice"
        ? "promote_vocabulary_to_practicing"
        : action === "restore"
          ? "restore_vocabulary_to_practicing"
          : "return_vocabulary_to_learning",
      {
        requested_vocabulary_id: Number(id),
        requested_user_id: user.id,
        requested_app_id: appId,
      },
    );
    if (error) throw error;
    if (!data) {
      throw new AppError(
        "INVALID_STATUS_CHANGE",
        "That phrase cannot be moved from its current stage.",
        409,
      );
    }

    return NextResponse.json({
      vocabulary: await loadVocabulary(user.id, appId),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { appId, user } = authenticateRequest(request);
    await ensureUserAndSeed(user, appId);
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
      .eq("app_id", appId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new AppError("NOT_FOUND", "Vocabulary item not found.", 404);
    }

    return NextResponse.json({
      vocabulary: await loadVocabulary(user.id, appId),
    });
  } catch (error) {
    return apiError(error);
  }
}
