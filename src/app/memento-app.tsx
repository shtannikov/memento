"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { QuizRound } from "@/features/quiz/quiz-round";
import { useVocabulary } from "@/features/vocabulary/use-vocabulary";
import { VocabularyScreen } from "@/features/vocabulary/vocabulary-screen";
import { initializeTelegram } from "@/lib/client/telegram";
import type { AppId } from "@/lib/domain/app";
import { StatusScreen } from "@/ui/status-screen";

type Destination = "vocabulary" | "quiz";

export function MementoApp({
  appId,
  appName,
  speakingEnabled,
}: {
  appId: AppId;
  appName: string;
  speakingEnabled: boolean;
}) {
  const [destination, setDestination] = useState<Destination>("vocabulary");
  const [initData, setInitData] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const vocabulary = useVocabulary(initData, appId);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setInitData(initializeTelegram(appName));
      } catch (error) {
        setStartupError(
          error instanceof Error
            ? error.message
            : `Open ${appName} in Telegram.`,
        );
      }
    });
    return () => {
      active = false;
    };
  }, [appName]);

  useEffect(() => {
    const viewport = globalThis.visualViewport;
    const root = document.documentElement;
    let baselineHeight = Math.max(
      globalThis.innerHeight,
      (viewport?.offsetTop ?? 0) + (viewport?.height ?? 0),
    );

    function syncViewport() {
      const height = viewport?.height ?? globalThis.innerHeight;
      const visibleBottom = (viewport?.offsetTop ?? 0) + height;
      baselineHeight = Math.max(baselineHeight, visibleBottom);
      root.style.setProperty("--visual-viewport-height", `${height}px`);
      root.style.setProperty("--visual-viewport-bottom", `${visibleBottom}px`);
      root.classList.toggle("keyboard-open", baselineHeight - visibleBottom >= 80);
    }
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      root.classList.remove("keyboard-open");
      root.style.removeProperty("--visual-viewport-height");
      root.style.removeProperty("--visual-viewport-bottom");
    };
  }, []);

  return (
    <main className={styles.canvas}>
      <section className={styles.mobileShell}>
        {(startupError || vocabulary.error) && (
          <StatusScreen
            title={appName}
            supportingCopy={
              startupError ?? vocabulary.error ?? "Something went wrong."
            }
            animatedEllipsis={false}
            onAction={
              vocabulary.error ? () => void vocabulary.refresh() : undefined
            }
            actionLabel="Try again"
            role="alert"
          />
        )}

        {!startupError &&
          !vocabulary.error &&
          (!initData || vocabulary.loading) && (
            <StatusScreen
              title={`Loading ${appName}`}
              supportingCopy="Getting your vocabulary ready."
              role="status"
            />
          )}

        {!startupError &&
          !vocabulary.error &&
          !vocabulary.loading &&
          initData &&
          destination === "vocabulary" && (
            <VocabularyScreen
              learning={vocabulary.learning}
              practicing={vocabulary.practicing}
              learned={vocabulary.learned}
              speakingEnabled={speakingEnabled}
              onAdd={vocabulary.add}
              onRemove={vocabulary.remove}
              onChangeStatus={vocabulary.changeStatus}
              onReorderPracticing={vocabulary.reorderPracticing}
              mutating={vocabulary.mutating}
              reordering={vocabulary.reordering}
              onStartQuiz={() => setDestination("quiz")}
            />
          )}

        {!startupError &&
          !vocabulary.error &&
          initData &&
          destination === "quiz" && (
            <QuizRound
              appId={appId}
              initData={initData}
              onVocabularyChanged={vocabulary.refresh}
              onExit={() => setDestination("vocabulary")}
            />
          )}
      </section>
    </main>
  );
}
