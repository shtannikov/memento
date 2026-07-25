"use client";

import { useState } from "react";

import { HomeScreen } from "@/features/home/home-screen";
import { QuizRound } from "@/features/quiz/quiz-round";
import { useVocabulary } from "@/features/vocabulary/use-vocabulary";
import { VocabularyScreen } from "@/features/vocabulary/vocabulary-screen";
import type { VocabularyStatus } from "@/features/vocabulary/vocabulary.types";

import styles from "./page.module.css";

type Destination = "home" | "vocabulary" | "quiz";

export default function Page() {
  const [destination, setDestination] = useState<Destination>("home");
  const [vocabularyTab, setVocabularyTab] =
    useState<VocabularyStatus>("learning");
  const vocabulary = useVocabulary();

  function openVocabulary(tab: VocabularyStatus) {
    setVocabularyTab(tab);
    setDestination("vocabulary");
  }

  return (
    <main className={styles.canvas}>
      <section className={styles.mobileShell} aria-live="polite">
        {destination === "home" && (
          <HomeScreen
            learningCount={vocabulary.learning.length}
            learnedCount={vocabulary.learned.length}
            onStartRound={() => setDestination("quiz")}
            onOpenVocabulary={openVocabulary}
          />
        )}

        {destination === "vocabulary" && (
          <VocabularyScreen
            initialTab={vocabularyTab}
            learning={vocabulary.learning}
            learned={vocabulary.learned}
            onAdd={vocabulary.add}
            onRemove={vocabulary.remove}
            onBack={() => setDestination("home")}
          />
        )}

        {destination === "quiz" && (
          <QuizRound onExit={() => setDestination("home")} />
        )}
      </section>
    </main>
  );
}
