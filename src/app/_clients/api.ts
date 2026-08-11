import type {
  NewVocabularyItem,
  VocabularyData,
  VocabularyStatus,
} from "@/app/_features/vocabulary/vocabulary.types";
import type { PreparedRound } from "@/app/_features/quiz/quiz.types";
import { APP_HEADER, type AppId } from "@/app/app-config";
import { ClientError } from "./telegram";

export async function loadVocabulary(
  initData: string,
  appId: AppId,
): Promise<VocabularyData> {
  return request(initData, appId, "/api/vocabulary", { method: "GET" }, "vocabulary");
}

export async function addVocabularyItem(
  initData: string,
  appId: AppId,
  item: NewVocabularyItem,
): Promise<VocabularyData> {
  return request(
    initData,
    appId,
    "/api/vocabulary",
    { method: "POST", body: JSON.stringify(item) },
    "vocabulary",
  );
}

export async function changeVocabularyStatus(
  initData: string,
  appId: AppId,
  id: string,
  currentStatus: VocabularyStatus,
  status: VocabularyStatus,
): Promise<VocabularyData> {
  return request(
    initData,
    appId,
    `/api/vocabulary/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        action:
          currentStatus === "practicing" && status === "learning"
            ? "return"
            : status === "learned"
            ? "learn"
            : currentStatus === "learned"
              ? "restore"
              : "practice",
      }),
    },
    "vocabulary",
  );
}

export async function reorderPracticingVocabulary(
  initData: string,
  appId: AppId,
  ids: string[],
): Promise<VocabularyData> {
  return request(
    initData,
    appId,
    "/api/vocabulary/order",
    { method: "PUT", body: JSON.stringify({ ids }) },
    "vocabulary",
  );
}

export async function removeVocabularyItem(
  initData: string,
  appId: AppId,
  id: string,
): Promise<VocabularyData> {
  return request(
    initData,
    appId,
    `/api/vocabulary/${id}`,
    { method: "DELETE" },
    "vocabulary",
  );
}

export async function prepareRound(
  initData: string,
  appId: AppId,
  retryRoundId?: string,
): Promise<PreparedRound> {
  return request(
    initData,
    appId,
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
  appId: AppId,
  roundId: string,
  firstAttempts: Array<{ vocabularyId: string; correct: boolean }>,
  mistakes: number,
): Promise<void> {
  await request(
    initData,
    appId,
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
  appId: AppId,
  roundId: string,
): Promise<void> {
  await request(
    initData,
    appId,
    `/api/rounds/${roundId}/fail`,
    { method: "POST" },
    "ok",
  );
}

async function request<T>(
  initData: string,
  appId: AppId,
  path: string,
  init: RequestInit,
  key: string,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `tma ${initData}`,
      [APP_HEADER]: appId,
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
        : "Couldn’t reach the app. Please try again.",
      response.status,
      typeof record.retryRoundId === "string"
        ? record.retryRoundId
        : undefined,
    );
  }
  const value = (payload as Record<string, unknown>)[key];
  return value as T;
}
