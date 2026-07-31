import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  authenticateRequest,
  parseJson,
} from "@/lib/server/api";
import {
  ensureUserAndSeed,
  importVocabularyItems,
  loadVocabulary,
} from "@/lib/server/vocabulary";
import {
  DEFINITION_MAX_LENGTH,
  TERM_MAX_LENGTH,
} from "@/lib/domain/vocabulary";

const NewVocabularySchema = z.object({
  term: z.string().trim().min(1).max(TERM_MAX_LENGTH),
  definition: z.string().trim().min(1).max(DEFINITION_MAX_LENGTH),
});

export async function GET(request: Request) {
  try {
    const { appId, user } = authenticateRequest(request);
    await ensureUserAndSeed(user, appId);
    return NextResponse.json({
      vocabulary: await loadVocabulary(user.id, appId),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { appId, user } = authenticateRequest(request);
    const body = await parseJson(request, NewVocabularySchema);
    await importVocabularyItems(user, [body], appId);
    return NextResponse.json(
      { vocabulary: await loadVocabulary(user.id, appId) },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
