import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { VocabularyCard } from "./vocabulary-card";
import { GripIcon } from "@/app/_components/icons";
import styles from "./vocabulary-screen.module.css";
import type { VocabularyItem } from "./vocabulary.types";

export function SortableVocabularyCard({
  item,
  disabled,
  onLearn,
  onRestore,
  onDelete,
}: {
  item: VocabularyItem;
  disabled: boolean;
  onLearn: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id, disabled });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.sortableItem}${isDragging ? ` ${styles.sortableDragging}` : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <VocabularyCard
        item={item}
        speakingEnabled
        onLearn={onLearn}
        onRestore={onRestore}
        onDelete={onDelete}
        disabled={disabled}
        leadingAction={
          <button
            ref={setActivatorNodeRef}
            type="button"
            className={styles.dragHandle}
            aria-label={`Drag ${item.term} to reorder`}
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
        }
      />
    </div>
  );
}
