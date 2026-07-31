export type LanguageVocabularyItem = {
  id: string;
  term: string;
  definition: string;
};

export type LanguageRecentSentence = {
  vocabularyId: string;
  sentence: string;
};

export type LanguageDefinition<Id extends string = string> = {
  id: Id;
  appName: string;
  locale: string;
  targetLanguage: string;
  appPath: string;
  webhookPath: string;
  botTokenEnv: string;
  webhookSecretEnv: string;
  starterVocabulary: readonly { term: string; definition: string }[];
  quizSystemPrompt: string;
  graderPrompt: string;
  buildQuizPrompt: (
    items: LanguageVocabularyItem[],
    recentSentences: LanguageRecentSentence[],
  ) => string;
};
