"use client";

import { useState } from "react";

import { QuizRound } from "@/features/quiz/quiz-round";
import { useVocabulary } from "@/features/vocabulary/use-vocabulary";
import { VocabularyScreen } from "@/features/vocabulary/vocabulary-screen";

import styles from "./page.module.css";

type Destination = "vocabulary" | "quiz";

export default function Page() {
  const [destination, setDestination] =
    useState<Destination>("vocabulary");
  const vocabulary = useVocabulary();

  return (
    <main className={styles.canvas}>
      <section className={styles.mobileShell} aria-live="polite">
        {destination === "vocabulary" && (
          <VocabularyScreen
            learning={vocabulary.learning}
            learned={vocabulary.learned}
            onAdd={vocabulary.add}
            onRemove={vocabulary.remove}
            onStartQuiz={() => setDestination("quiz")}
          />
        )}

        {destination === "quiz" && (
          <QuizRound onExit={() => setDestination("vocabulary")} />
        )}
      </section>
    </main>
  );
}
