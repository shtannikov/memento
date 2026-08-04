export const MAX_SPEAKING_TASKS_PER_DAY = 5;
export const SPEAKING_TASK_SIZE = 3;
export const MIN_VOICE_DURATION_SECONDS = 30;
export const MAX_VOICE_DURATION_SECONDS = 180;
export const TRANSCRIPT_RETENTION_DAYS = 30;

export type SpeakingVocabularyItem = {
  vocabularyId: string;
  term: string;
  definition: string;
};

export type SpeakingTask = {
  id: string;
  topic: string;
  domain: string;
  grammarFocus: string;
  prompt: string;
  items: SpeakingVocabularyItem[];
};

export type RequiredPhraseUsage = {
  vocabularyId: string;
  phrase: string;
  status: "used_correctly" | "used_incorrectly" | "missed";
  matchedText: string | null;
};

export type AnswerEvaluation = {
  coverageScore: number;
  taskRelevance: "on_topic" | "off_topic";
  corrections: Array<{
    category: string;
    original: string;
    corrected: string;
    why: string;
    severity: number;
  }>;
  requiredPhraseUsage: RequiredPhraseUsage[];
  grammarPriority: {
    explanation: string;
    example: string;
  } | null;
  telegramFeedback: string;
};

export type TopicGenerationInput = {
  targetDomain: string;
  targetGrammarFocus: string;
  previousTask?: {
    title: string;
    speakingPrompt: string;
    domain: string;
    grammarFocus: string;
  };
  recentTopics: Array<{
    topic: string;
    domain: string | null;
    grammarFocus: string | null;
  }>;
  recentLearnerExcerpts: string[];
  requiredPhrases: string[];
};

export type GeneratedTopic = {
  title: string;
  speakingPrompt: string;
  domain: string;
  grammarFocus: string;
};

export function selectLeastPracticed<T extends string>(
  options: readonly T[],
  history: Array<string | null>,
  rotationKey: string,
): T {
  if (options.length === 0) {
    throw new Error("selectLeastPracticed requires at least one option");
  }
  const counts = new Map(options.map((option) => [option.toLowerCase(), 0]));
  for (const value of history) {
    const normalized = value?.trim().toLowerCase();
    if (normalized && counts.has(normalized)) {
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  const minimum = Math.min(...counts.values());
  const candidates = options.filter(
    (option) => counts.get(option.toLowerCase()) === minimum,
  );
  return candidates[stableHash(rotationKey) % candidates.length];
}

function stableHash(value: string): number {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}
