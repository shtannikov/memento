import { ChatCommandHint } from "../chat-command-hint";
import type { VocabularyItem } from "../vocabulary.types";
import {
  VocabularyItemList,
  VocabularyTabPage,
  type ChangeVocabularyStatus,
  type VocabularyItemHandler,
} from "./vocabulary-tab-page";

export function LearningTab({
  items,
  speakingEnabled,
  searchQuery,
  onSearchChange,
  disabled,
  onChangeStatus,
  onDelete,
}: {
  items: VocabularyItem[];
  speakingEnabled: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  disabled: boolean;
  onChangeStatus: ChangeVocabularyStatus;
  onDelete: VocabularyItemHandler;
}) {
  return (
    <VocabularyTabPage
      status="learning"
      label="Learning"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      hint={
        <ChatCommandHint>
          A phrase moves to {speakingEnabled ? "Practicing" : "Learned"} after
          3 completed quizzes.
        </ChatCommandHint>
      }
    >
      <VocabularyItemList
        items={items}
        searchQuery={searchQuery}
        emptyTitle="Nothing to learn yet"
        emptyText="Add a phrase to start your list."
        speakingEnabled={speakingEnabled}
        disabled={disabled}
        onDone={(item) =>
          onChangeStatus(item, speakingEnabled ? "practicing" : "learned")
        }
        onDelete={onDelete}
      />
    </VocabularyTabPage>
  );
}
