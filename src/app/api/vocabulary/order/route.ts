import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  authenticateRequest,
  parseJson,
} from "@/app/api/_server/api";
import {
  ensureUserAndSeed,
  loadVocabulary,
  reorderPracticingVocabulary,
} from "@/app/_features/vocabulary/server/vocabulary";

const PracticingOrderSchema = z
  .object({
    ids: z.array(z.string().regex(/^\d+$/)).max(500),
  })
  .superRefine(({ ids }, context) => {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        message: "Practicing phrase IDs must be unique.",
        path: ["ids"],
      });
    }
  });

export async function PUT(request: Request) {
  try {
    const { appId, user } = authenticateRequest(request);
    await ensureUserAndSeed(user, appId);
    const { ids } = await parseJson(request, PracticingOrderSchema);
    await reorderPracticingVocabulary(user.id, appId, ids);

    return NextResponse.json({
      vocabulary: await loadVocabulary(user.id, appId),
    });
  } catch (error) {
    return apiError(error);
  }
}
