import { STARTER_VOCABULARY } from "@/lib/domain/starter-vocabulary";
import type { VocabularyItem } from "./vocabulary.types";

export const starterVocabulary: VocabularyItem[] =
  STARTER_VOCABULARY.map((item, index) => ({
    id: `starter-${index + 1}`,
    ...item,
    status: "learning",
  }));
