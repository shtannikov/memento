"use client";

import { useState } from "react";

import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { HomeScreen } from "@/features/home/home-screen";
import { QuizRound } from "@/features/quiz/quiz-round";
import { useVocabulary } from "@/features/vocabulary/use-vocabulary";
import { VocabularyScreen } from "@/features/vocabulary/vocabulary-screen";

import styles from "./page.module.css";

type Destination = "home" | "vocabulary" | "quiz";

export default function Page() {
  const [destination, setDestination] = useState<Destination>("home");
  const vocabulary = useVocabulary();
  const showNavigation = destination !== "quiz";

  return (
    <main className={styles.canvas}>
      <section className={styles.mobileShell} aria-live="polite">
        {destination === "home" && (
          <HomeScreen
            learningCount={vocabulary.learning.length}
            learnedCount={vocabulary.learned.length}
            onStartRound={() => setDestination("quiz")}
            onOpenVocabulary={() => setDestination("vocabulary")}
          />
        )}

        {destination === "vocabulary" && (
          <VocabularyScreen
            learning={vocabulary.learning}
            learned={vocabulary.learned}
            onAdd={vocabulary.add}
            onRemove={vocabulary.remove}
          />
        )}

        {destination === "quiz" && (
          <QuizRound onExit={() => setDestination("home")} />
        )}

        {showNavigation && (
          <BottomNavigation
            activeDestination={destination}
            onNavigate={setDestination}
          />
        )}
      </section>
    </main>
  );
}
