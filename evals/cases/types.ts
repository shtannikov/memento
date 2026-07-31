import type { AppId } from "../../src/lib/domain/app";
import type {
  GenerationVocabularyItem,
  RecentQuizSentence,
} from "../../src/lib/server/openai";

export type EvalCase = {
  id: string;
  description: string;
  appId: AppId;
  items: GenerationVocabularyItem[];
  recentSentences?: RecentQuizSentence[];
};
