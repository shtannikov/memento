import { useCallback, useEffect, useState } from "react";

import {
  addVocabularyItem,
  changeVocabularyStatus,
  loadVocabulary,
  removeVocabularyItem,
} from "@/lib/client/api";
import type {
  NewVocabularyItem,
  VocabularyItem,
  VocabularyData,
} from "./vocabulary.types";

export function useVocabulary(initData: string | null) {
  const [data, setData] = useState<VocabularyData>({
    learning: [],
    learned: [],
  });
  const [loading, setLoading] = useState(Boolean(initData));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!initData) return;
    setLoading(true);
    setError(null);
    try {
      setData(await loadVocabulary(initData));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Couldn’t load your vocabulary.",
      );
    } finally {
      setLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    const task = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  async function add(item: NewVocabularyItem) {
    if (!initData) return;
    await mutate(() => addVocabularyItem(initData, item));
  }

  async function remove(item: VocabularyItem) {
    if (!initData) return;
    await mutate(() => removeVocabularyItem(initData, item.id));
  }

  async function changeStatus(
    item: VocabularyItem,
    status: VocabularyItem["status"],
  ) {
    if (!initData) return;
    await mutate(() =>
      changeVocabularyStatus(initData, item.id, status),
    );
  }

  async function mutate(operation: () => Promise<VocabularyData>) {
    setError(null);
    try {
      setData(await operation());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Couldn’t update your vocabulary.",
      );
    }
  }

  return {
    ...data,
    loading,
    error,
    add,
    remove,
    changeStatus,
    refresh,
  };
}
