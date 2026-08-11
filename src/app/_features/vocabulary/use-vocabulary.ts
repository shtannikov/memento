import { useCallback, useEffect, useState } from "react";

import {
  addVocabularyItem,
  changeVocabularyStatus,
  loadVocabulary,
  removeVocabularyItem,
  reorderPracticingVocabulary,
} from "@/app/_clients/api";
import type { AppId } from "@/app/app-config";
import type {
  NewVocabularyItem,
  VocabularyItem,
  VocabularyData,
} from "./vocabulary.types";

export function useVocabulary(initData: string | null, appId: AppId) {
  const [data, setData] = useState<VocabularyData>({
    learning: [],
    practicing: [],
    learned: [],
  });
  const [loading, setLoading] = useState(Boolean(initData));
  const [mutating, setMutating] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!initData) return;
    setLoading(true);
    setError(null);
    try {
      setData(await loadVocabulary(initData, appId));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Couldn’t load your vocabulary.",
      );
    } finally {
      setLoading(false);
    }
  }, [appId, initData]);

  useEffect(() => {
    const task = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  async function add(item: NewVocabularyItem) {
    if (!initData) return;
    await mutate(() => addVocabularyItem(initData, appId, item));
  }

  async function remove(item: VocabularyItem) {
    if (!initData) return false;
    return mutate(() => removeVocabularyItem(initData, appId, item.id));
  }

  async function changeStatus(
    item: VocabularyItem,
    status: VocabularyItem["status"],
  ) {
    if (!initData) return false;
    return mutate(() =>
      changeVocabularyStatus(
        initData,
        appId,
        item.id,
        item.status,
        status,
      ),
    );
  }

  async function reorderPracticing(items: VocabularyItem[]) {
    if (!initData || reordering) return;
    const previous = data;
    setData((current) => ({ ...current, practicing: items }));
    setReordering(true);
    setError(null);
    try {
      setData(
        await reorderPracticingVocabulary(
          initData,
          appId,
          items.map((item) => item.id),
        ),
      );
    } catch (caught) {
      setData(previous);
      setError(
        caught instanceof Error
          ? caught.message
          : "Couldn’t reorder your practice phrases.",
      );
    } finally {
      setReordering(false);
    }
  }

  async function mutate(operation: () => Promise<VocabularyData>) {
    if (mutating) return false;
    setMutating(true);
    setError(null);
    try {
      setData(await operation());
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Couldn’t update your vocabulary.",
      );
      return false;
    } finally {
      setMutating(false);
    }
  }

  return {
    ...data,
    loading,
    mutating,
    reordering,
    error,
    add,
    remove,
    changeStatus,
    reorderPracticing,
    refresh,
  };
}
