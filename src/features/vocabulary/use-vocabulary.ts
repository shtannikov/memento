import { useState } from "react";

import { starterVocabulary } from "./starter-vocabulary";
import type {
  NewVocabularyItem,
  VocabularyItem,
} from "./vocabulary.types";

export function useVocabulary() {
  const [items, setItems] = useState(starterVocabulary);

  const learning = items.filter((item) => item.status === "learning");
  const learned = items.filter((item) => item.status === "learned");

  function add(item: NewVocabularyItem) {
    setItems((currentItems) => [
      {
        id: Date.now(),
        term: item.term,
        definition: item.definition,
        status: "learning",
        due: "Later",
      },
      ...currentItems,
    ]);
  }

  function remove(item: VocabularyItem) {
    setItems((currentItems) =>
      currentItems.filter((currentItem) => currentItem.id !== item.id),
    );
  }

  return { items, learning, learned, add, remove };
}
