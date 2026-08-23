import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";

import { AddPhraseDialog } from "./add-phrase-dialog";
import { LearnedTab } from "./tabs/learned-tab";
import { LearningTab } from "./tabs/learning-tab";
import { PracticingTab } from "./tabs/practicing-tab";
import {
  SwipeableVocabularyTabs,
  type SwipeableVocabularyTabPage,
} from "./tabs/swipeable-vocabulary-tabs";
import { VocabularyHeader } from "./vocabulary-header";
import { CheckIcon, PlayIcon, PlusIcon } from "@/app/_components/icons";
import { setTelegramVerticalSwipes } from "@/app/_clients/telegram";
import styles from "./vocabulary-screen.module.css";
import type {
  NewVocabularyItem,
  VocabularyItem,
  VocabularyStatus,
} from "./vocabulary.types";
import type { AddPhrasePlaceholders } from "@/app/_languages/types";

type VocabularyScreenProps = {
  learning: VocabularyItem[];
  practicing: VocabularyItem[];
  learned: VocabularyItem[];
  speakingEnabled: boolean;
  addPhrasePlaceholders?: AddPhrasePlaceholders;
  onAdd: (item: NewVocabularyItem) => void;
  onRemove: (
    item: VocabularyItem,
  ) => Promise<boolean | void> | boolean | void;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => Promise<boolean | void> | boolean | void;
  onReorderPracticing: (items: VocabularyItem[]) => void;
  mutating?: boolean;
  reordering?: boolean;
  onStartQuiz: () => void;
};

export function VocabularyScreen({
  learning,
  practicing,
  learned,
  speakingEnabled,
  addPhrasePlaceholders,
  onAdd,
  onRemove,
  onChangeStatus,
  onReorderPracticing,
  mutating = false,
  reordering = false,
  onStartQuiz,
}: VocabularyScreenProps) {
  const [activeTab, setActiveTab] =
    useState<VocabularyStatus>("learning");
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const screenRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    return () => setTelegramVerticalSwipes(true);
  }, []);

  const updateListGesture = useCallback((active: boolean) => {
    setTelegramVerticalSwipes(!active);
  }, []);

  function showToast(message: string) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message }));
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 1800);
  }

  async function removeConfirmedItem(item: VocabularyItem) {
    const succeeded = await onRemove(item);
    if (succeeded !== false) showToast("Removed");
  }

  function removeItem(item: VocabularyItem) {
    if (
      globalThis.confirm(
        `Delete “${item.term}” from your vocabulary?`,
      )
    ) {
      void removeConfirmedItem(item);
    }
  }

  async function changeItemStatus(
    item: VocabularyItem,
    status: VocabularyStatus,
  ) {
    const succeeded = await onChangeStatus(item, status);
    if (succeeded !== false) {
      showToast(
        status === "practicing"
          ? "Moved to Practicing"
          : status === "learning"
            ? "Moved to Learning"
            : "Moved to Learned",
      );
    }
  }

  function changeTab(tab: VocabularyStatus) {
    setActiveTab(tab);
    setSearchQuery("");
  }

  const updateLearningActions = useCallback((position: number) => {
    const screen = screenRef.current;
    if (!screen) return;

    const progress = Math.max(0, Math.min(1, 1 - position));
    screen.style.setProperty("--learning-actions-opacity", String(progress));
    screen.style.setProperty(
      "--learning-actions-scale",
      String(0.96 + progress * 0.04),
    );
    screen.style.setProperty(
      "--learning-actions-y",
      `${Math.round((1 - progress) * 16)}px`,
    );
    screen.dataset.learningActionsVisible = String(progress >= 0.5);
  }, []);

  function updateSearchFocus(event: FocusEvent<HTMLDivElement>) {
    const screen = screenRef.current;
    if (!screen || !(event.target instanceof HTMLInputElement)) return;
    if (event.target.type !== "search") return;

    screen.dataset.searchFocused = String(event.type === "focus");
  }

  const disabled = mutating || reordering;
  const pages: SwipeableVocabularyTabPage[] = [
    {
      value: "learning",
      content: (
        <LearningTab
          items={learning}
          searchQuery={activeTab === "learning" ? searchQuery : ""}
          speakingEnabled={speakingEnabled}
          disabled={disabled}
          onSearchChange={setSearchQuery}
          onChangeStatus={changeItemStatus}
          onDelete={removeItem}
        />
      ),
    },
    ...(speakingEnabled
      ? [
          {
            value: "practicing" as const,
            content: (
              <PracticingTab
                items={practicing}
                searchQuery={activeTab === "practicing" ? searchQuery : ""}
                disabled={disabled}
                onSearchChange={setSearchQuery}
                reordering={reordering}
                onChangeStatus={changeItemStatus}
                onDelete={removeItem}
                onReorder={onReorderPracticing}
              />
            ),
          },
        ]
      : []),
    {
      value: "learned",
      content: (
        <LearnedTab
          items={learned}
          searchQuery={activeTab === "learned" ? searchQuery : ""}
          speakingEnabled={speakingEnabled}
          disabled={disabled}
          onSearchChange={setSearchQuery}
          onChangeStatus={changeItemStatus}
          onDelete={removeItem}
        />
      ),
    },
  ];

  return (
    <>
      <div
        ref={screenRef}
        className={styles.screen}
        data-learning-actions-visible={activeTab === "learning"}
        data-search-focused="false"
        data-testid="vocabulary-screen"
        onFocusCapture={updateSearchFocus}
        onBlurCapture={updateSearchFocus}
      >
        <VocabularyHeader
          learningCount={learning.length}
          practicingCount={practicing.length}
          learnedCount={learned.length}
          speakingEnabled={speakingEnabled}
          activeTab={activeTab}
          onTabChange={changeTab}
        />

        <div
          className={
            activeTab === "learning"
              ? `${styles.content} ${styles.contentWithActions}`
              : styles.content
            }
        >
          <SwipeableVocabularyTabs
            activeTab={activeTab}
            pages={pages}
            onChange={changeTab}
            onProgress={updateLearningActions}
            onListGestureActiveChange={updateListGesture}
          />
        </div>

        <div
          className={`${styles.floatingActions} ${
            addOpen ? styles.floatingActionsDialogOpen : ""
          }`}
          data-testid="learning-actions"
          inert={activeTab !== "learning" || addOpen}
          aria-hidden={activeTab !== "learning" || addOpen}
        >
          <button
            className={styles.floatingButton}
            disabled={mutating}
            aria-busy={mutating}
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon />
            Add phrase
          </button>
          <button
            className={styles.floatingButton}
            disabled={mutating || learning.length < 2}
            aria-busy={mutating}
            onClick={onStartQuiz}
          >
            <PlayIcon />
            Start quiz
          </button>
        </div>
      </div>

      <AddPhraseDialog
        open={addOpen}
        placeholders={addPhrasePlaceholders}
        onOpenChange={setAddOpen}
        onAdd={(item) => {
          onAdd(item);
          setActiveTab("learning");
        }}
      />
      {toast &&
        createPortal(
          <div
            key={toast.id}
            className={styles.mutationToast}
            role="status"
            aria-live="polite"
          >
            <CheckIcon />
            <span>{toast.message}</span>
          </div>,
          document.body,
        )}
    </>
  );
}
