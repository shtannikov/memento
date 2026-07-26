"use client";

import { useEffect, useState } from "react";

import { QuizRound } from "@/features/quiz/quiz-round";
import { useVocabulary } from "@/features/vocabulary/use-vocabulary";
import { VocabularyScreen } from "@/features/vocabulary/vocabulary-screen";
import { initializeTelegram } from "@/lib/client/telegram";

import styles from "./page.module.css";

type Destination = "vocabulary" | "quiz";

export default function Page() {
  const [destination, setDestination] =
    useState<Destination>("vocabulary");
  const [initData, setInitData] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const vocabulary = useVocabulary(initData);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setInitData(initializeTelegram());
      } catch (error) {
        setStartupError(
          error instanceof Error
            ? error.message
            : "Open Memento in Telegram.",
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const viewport = globalThis.visualViewport;
    function syncViewport() {
      const height = viewport?.height ?? globalThis.innerHeight;
      document.documentElement.style.setProperty(
        "--visual-viewport-height",
        `${height}px`,
      );
      document.documentElement.classList.toggle(
        "keyboard-open",
        height < globalThis.innerHeight * 0.78,
      );
    }
    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      document.documentElement.classList.remove("keyboard-open");
    };
  }, []);

  return (
    <main className={styles.canvas}>
      <section className={styles.mobileShell} aria-live="polite">
        {(startupError || vocabulary.error) && (
          <div className={styles.stateScreen}>
            <h1>Memento</h1>
            <p>{startupError ?? vocabulary.error}</p>
            {vocabulary.error && (
              <button onClick={() => void vocabulary.refresh()}>
                Try again
              </button>
            )}
          </div>
        )}

        {!startupError && !vocabulary.error && vocabulary.loading && (
          <div className={styles.stateScreen}>
            <h1>Loading Memento…</h1>
          </div>
        )}

        {!startupError &&
          !vocabulary.error &&
          !vocabulary.loading &&
          initData &&
          destination === "vocabulary" && (
            <VocabularyScreen
              learning={vocabulary.learning}
              learned={vocabulary.learned}
              onAdd={vocabulary.add}
              onRemove={vocabulary.remove}
              onChangeStatus={vocabulary.changeStatus}
              onStartQuiz={() => setDestination("quiz")}
            />
          )}

        {!startupError &&
          !vocabulary.error &&
          initData &&
          destination === "quiz" && (
            <QuizRound
              initData={initData}
              onVocabularyChanged={vocabulary.refresh}
              onExit={() => setDestination("vocabulary")}
            />
          )}
      </section>
    </main>
  );
}
