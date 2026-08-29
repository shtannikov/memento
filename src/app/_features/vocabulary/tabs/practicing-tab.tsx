import dynamic from "next/dynamic";

import { ChatCommand, ChatCommandHint } from "../chat-command-hint";
import type { VocabularyItem } from "../vocabulary.types";
import {
  VocabularyItemList,
  VocabularyTabPage,
  type ChangeVocabularyStatus,
  type VocabularyItemHandler,
} from "./vocabulary-tab-page";

const PracticingQueue = dynamic(() =>
  import("../practicing-queue").then((module) => module.PracticingQueue),
);

export function PracticingTab({
  items,
  searchQuery,
  onSearchChange,
  disabled,
  reordering,
  onChangeStatus,
  onDelete,
  onReorder,
}: {
  items: VocabularyItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  disabled: boolean;
  reordering: boolean;
  onChangeStatus: ChangeVocabularyStatus;
  onDelete: VocabularyItemHandler;
  onReorder: (items: VocabularyItem[]) => void;
}) {
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <VocabularyTabPage
      status="practicing"
      label="Practicing"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      hint={
        <ChatCommandHint>
          Use a phrase correctly in three speaking tasks to move it to Learned.
          Send <ChatCommand>/speaking</ChatCommand> in the chat to get your
          speaking task.
        </ChatCommandHint>
      }
    >
      {!hasSearchQuery && items.length > 0 ? (
        <PracticingQueue
          items={items}
          reordering={reordering || disabled}
          onReorder={onReorder}
          onDone={(item) => onChangeStatus(item, "learned")}
          onRestore={(item) => onChangeStatus(item, "learning")}
          onDelete={onDelete}
        />
      ) : (
        <VocabularyItemList
          items={items}
          searchQuery={searchQuery}
          emptyTitle="Nothing to practice yet"
          emptyText="Keep practicing in quizzes, or tap Done on a Learning phrase when it feels ready."
          speakingEnabled
          disabled={disabled}
          onDone={(item) => onChangeStatus(item, "learned")}
          onRestore={(item) => onChangeStatus(item, "learning")}
          onDelete={onDelete}
        />
      )}
    </VocabularyTabPage>
  );
}
