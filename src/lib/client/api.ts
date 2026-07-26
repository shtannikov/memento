import type {
  NewVocabularyItem,
  VocabularyData,
  VocabularyStatus,
} from "@/features/vocabulary/vocabulary.types";
import type { PreparedRound } from "@/features/quiz/quiz.types";
import { ClientError } from "./telegram";

export async function loadVocabulary(
  initData: string,
): Promise<VocabularyData> {
  return request(initData, "/api/vocabulary", { method: "GET" }, "vocabulary");
}

export async function addVocabularyItem(
  initData: string,
  item: NewVocabularyItem,
): Promise<VocabularyData> {
  return request(
    initData,
    "/api/vocabulary",
    { method: "POST", body: JSON.stringify(item) },
    "vocabulary",
  );
}

export async function changeVocabularyStatus(
  initData: string,
  id: string,
  status: VocabularyStatus,
): Promise<VocabularyData> {
  return request(
    initData,
    `/api/vocabulary/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        action: status === "learned" ? "learn" : "restore",
      }),
    },
    "vocabulary",
  );
}

export async function removeVocabularyItem(
  initData: string,
  id: string,
): Promise<VocabularyData> {
  return request(
    initData,
    `/api/vocabulary/${id}`,
    { method: "DELETE" },
    "vocabulary",
  );
}

export async function prepareRound(
  initData: string,
  retryRoundId?: string,
): Promise<PreparedRound> {
  return request(
    initData,
    "/api/rounds",
    {
      method: "POST",
      body: JSON.stringify(
        retryRoundId ? { retryRoundId } : {},
      ),
    },
    "round",
  );
}

export async function completeRound(
  initData: string,
  roundId: string,
  firstAttempts: Array<{ vocabularyId: string; correct: boolean }>,
  mistakes: number,
): Promise<void> {
  await request(
    initData,
    `/api/rounds/${roundId}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ firstAttempts, mistakes }),
    },
    "result",
  );
}

export async function failRound(
  initData: string,
  roundId: string,
): Promise<void> {
  await request(
    initData,
    `/api/rounds/${roundId}/fail`,
    { method: "POST" },
    "ok",
  );
}

async function request<T>(
  initData: string,
  path: string,
  init: RequestInit,
  key: string,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `tma ${initData}`,
      "Content-Type": "application/json",
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload !== "object") {
    const record =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    throw new ClientError(
      typeof record.code === "string" ? record.code : "REQUEST_FAILED",
      typeof record.message === "string"
        ? record.message
        : "Couldn’t reach Memento. Please try again.",
      response.status,
      typeof record.retryRoundId === "string"
        ? record.retryRoundId
        : undefined,
    );
  }
  const value = (payload as Record<string, unknown>)[key];
  return value as T;
}
