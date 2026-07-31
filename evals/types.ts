import type { AppId } from "../src/languages/registry";
import type {
  LanguageRecentSentence,
  LanguageVocabularyItem,
} from "../src/languages/types";

export type EvalCase = {
  id: string;
  description: string;
  appId: AppId;
  items: LanguageVocabularyItem[];
  recentSentences?: LanguageRecentSentence[];
};
