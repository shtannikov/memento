import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableVocabularyCard } from "./sortable-vocabulary-card";
import styles from "./vocabulary-screen.module.css";
import type { VocabularyItem } from "./vocabulary.types";

const ACTIVE_PRACTICE_LIMIT = 3;

export function canAutoScrollPracticingQueue(element: Element): boolean {
  return element.classList.contains(styles.tabPage);
}

const PRACTICING_AUTO_SCROLL = {
  canScroll: canAutoScrollPracticingQueue,
};

export function reorderPracticingItems(
  items: VocabularyItem[],
  activeId: string | number,
  overId: string | number,
): VocabularyItem[] {
  if (activeId === overId) return items;
  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);
  if (oldIndex < 0 || newIndex < 0) return items;
  return arrayMove(items, oldIndex, newIndex);
}

export function PracticingQueue({
  items,
  reordering,
  onReorder,
  onLearn,
  onRestore,
  onDelete,
}: {
  items: VocabularyItem[];
  reordering: boolean;
  onReorder: (items: VocabularyItem[]) => void;
  onLearn: (item: VocabularyItem) => void;
  onRestore: (item: VocabularyItem) => void;
  onDelete: (item: VocabularyItem) => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const activePractice = items.slice(0, ACTIVE_PRACTICE_LIMIT);
  const laterPractice = items.slice(ACTIVE_PRACTICE_LIMIT);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const reordered = reorderPracticingItems(items, active.id, over.id);
    if (reordered !== items) onReorder(reordered);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={PRACTICING_AUTO_SCROLL}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={styles.activePractice}
          role="region"
          aria-label="In active practice"
        >
          <div className={styles.activePracticeTitle}>
            <span aria-hidden="true" />
            In active practice
          </div>
          <p className={styles.activePracticeDescription}>
            {activePractice.length === 1
              ? "This phrase will come up in your next speaking task."
              : `These ${activePractice.length} phrases will come up in your next speaking task.`}
          </p>
          <div className={styles.activePracticeItems}>
            {activePractice.map((item) => (
              <SortableVocabularyCard
                key={item.id}
                item={item}
                disabled={reordering}
                onLearn={() => onLearn(item)}
                onRestore={() => onRestore(item)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </div>
        </div>
        {laterPractice.map((item) => (
          <SortableVocabularyCard
            key={item.id}
            item={item}
            disabled={reordering}
            onLearn={() => onLearn(item)}
            onRestore={() => onRestore(item)}
            onDelete={() => onDelete(item)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
