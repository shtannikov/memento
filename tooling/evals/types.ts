import type { AppId } from "../../src/app/_languages/registry";
import type {
  LanguageRecentSentence,
  LanguageVocabularyItem,
} from "../../src/app/_languages/types";
import type {
  SpeakingTask,
  TopicGenerationInput,
} from "../../src/app/_features/speaking/domain";

export type EvalCase = {
  id: string;
  description: string;
  appId: AppId;
  items: LanguageVocabularyItem[];
  recentSentences?: LanguageRecentSentence[];
};

export type SpeakingEvalCase =
  | {
      kind: "topic";
      id: string;
      description: string;
      appId: AppId;
      input: TopicGenerationInput;
    }
  | {
      kind: "answer";
      id: string;
      description: string;
      appId: AppId;
      task: SpeakingTask;
      transcript: string;
      expectedUsage: Record<string, "used_correctly" | "used_incorrectly" | "missed">;
      expectedSubstantiveSpeech?: boolean;
      expectedCorrectionFragments?: string[];
      expectGrammarPriority?: boolean;
    };
