import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  authenticateRequest,
  parseJson,
} from "@/lib/server/api";
import { getMementoDb } from "@/lib/server/supabase";
import {
  ensureUserAndSeed,
  loadVocabulary,
  resetSchedule,
} from "@/lib/server/vocabulary";

const NewVocabularySchema = z.object({
  term: z.string().trim().min(1).max(200),
  definition: z.string().trim().min(1).max(500),
});

export async function GET(request: Request) {
  try {
    const user = authenticateRequest(request);
    await ensureUserAndSeed(user);
    return NextResponse.json({
      vocabulary: await loadVocabulary(user.id),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = authenticateRequest(request);
    await ensureUserAndSeed(user);
    const body = await parseJson(request, NewVocabularySchema);
    const supabase = getMementoDb();

    const { data: existing, error: lookupError } = await supabase
      .from("vocabulary_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("normalized_term", body.term.toLowerCase())
      .maybeSingle();
    if (lookupError) throw lookupError;

    let vocabularyId: string;
    if (existing) {
      vocabularyId = String(existing.id);
      const { error } = await supabase
        .from("vocabulary_items")
        .update({
          term: body.term,
          definition: body.definition,
          status: "learning",
          is_removed: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { data: created, error } = await supabase
        .from("vocabulary_items")
        .insert({
          user_id: user.id,
          term: body.term,
          definition: body.definition,
          status: "learning",
        })
        .select("id")
        .single();
      if (error) throw error;
      vocabularyId = String(created.id);
    }

    await resetSchedule(vocabularyId);
    return NextResponse.json(
      { vocabulary: await loadVocabulary(user.id) },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
