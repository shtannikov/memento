import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  AppError,
  authenticateRequest,
} from "@/app/api/_server/api";
import { getMementoDb } from "@/app/api/_server/supabase";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { appId, user } = authenticateRequest(request);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError("INVALID_REQUEST", "Invalid quiz.", 400);
    }
    const { error } = await getMementoDb()
      .from("rounds")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("app_id", appId)
      .in("status", ["preparing", "active"]);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
