"use client";

import { useState } from "react";

import { VocabularyScreen } from "@/features/vocabulary/vocabulary-screen";
import type {
  NewVocabularyItem,
  VocabularyItem,
  VocabularyStatus,
} from "@/features/vocabulary/vocabulary.types";

import styles from "../page.module.css";

type LearningLanguageId = "english" | "czech";

const LEARNING_LANGUAGES = [
  { id: "english", code: "EN", label: "English" },
  { id: "czech", code: "CS", label: "Czech" },
] satisfies {
  id: LearningLanguageId;
  code: string;
  label: string;
}[];

const INITIAL_VOCABULARY: Record<
  LearningLanguageId,
  VocabularyItem[]
> = {
  english: [
    {
      id: "english-1",
      term: "Follow up",
      definition: "continue checking",
      status: "learning",
    },
    {
      id: "english-2",
      term: "Take into account",
      definition: "consider carefully",
      status: "learning",
    },
    {
      id: "english-3",
      term: "Make the most of",
      definition: "use as well as possible",
      status: "learned",
    },
  ],
  czech: [
    {
      id: "czech-1",
      term: "Dát si kávu",
      definition: "have a coffee",
      status: "learning",
    },
    {
      id: "czech-2",
      term: "Těší mě",
      definition: "nice to meet you",
      status: "learning",
    },
    {
      id: "czech-3",
      term: "Měj se hezky",
      definition: "take care",
      status: "learning",
    },
    {
      id: "czech-4",
      term: "To dává smysl",
      definition: "that makes sense",
      status: "learned",
    },
  ],
};

export default function LanguagePreviewPage() {
  const [activeLanguage, setActiveLanguage] =
    useState<LearningLanguageId>("english");
  const [vocabulary, setVocabulary] = useState(INITIAL_VOCABULARY);
  const activeVocabulary = vocabulary[activeLanguage];
  const learning = activeVocabulary.filter(
    (item) => item.status === "learning",
  );
  const learned = activeVocabulary.filter(
    (item) => item.status === "learned",
  );

  function addPhrase(item: NewVocabularyItem) {
    setVocabulary((current) => ({
      ...current,
      [activeLanguage]: [
        {
          ...item,
          id: `${activeLanguage}-${Date.now()}`,
          status: "learning",
        },
        ...current[activeLanguage],
      ],
    }));
  }

  function removePhrase(item: VocabularyItem) {
    setVocabulary((current) => ({
      ...current,
      [activeLanguage]: current[activeLanguage].filter(
        (candidate) => candidate.id !== item.id,
      ),
    }));
  }

  function changeStatus(
    item: VocabularyItem,
    status: VocabularyStatus,
  ) {
    setVocabulary((current) => ({
      ...current,
      [activeLanguage]: current[activeLanguage].map((candidate) =>
        candidate.id === item.id ? { ...candidate, status } : candidate,
      ),
    }));
  }

  return (
    <main className={styles.canvas}>
      <section className={styles.mobileShell}>
        <VocabularyScreen
          key={activeLanguage}
          learning={learning}
          learned={learned}
          onAdd={addPhrase}
          onRemove={removePhrase}
          onChangeStatus={changeStatus}
          onStartQuiz={() =>
            globalThis.alert(
              `${activeLanguage === "english" ? "English" : "Czech"} quiz preview`,
            )
          }
          languages={LEARNING_LANGUAGES}
          activeLanguageId={activeLanguage}
          onLanguageChange={(languageId) =>
            setActiveLanguage(languageId as LearningLanguageId)
          }
        />
      </section>
    </main>
  );
}
