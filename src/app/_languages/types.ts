export type LanguageVocabularyItem = {
  id: string;
  term: string;
  definition: string;
};

export type LanguageRecentSentence = {
  vocabularyId: string;
  sentence: string;
};

export type SpeakingLanguageDefinition = {
  lifeDomains: readonly string[];
  grammarFocuses: readonly string[];
  topicSystemPrompt: string;
  topicGraderPrompt: string;
  answerEvaluationPrompt: string;
};

export type AddPhrasePlaceholders = {
  term: string;
  definition: string;
};

export type LanguageSiteDefinition = {
  hostname: string;
  productionBotUsername: string;
  previewBotUsernameEnv: string;
  coverImage: string;
  trial?: {
    publicPath: string;
    routePath: string;
    startPayload: string;
  };
};

export type LanguageDefinition<Id extends string = string> = {
  id: Id;
  appName: string;
  locale: string;
  targetLanguage: string;
  transcriptionLanguage: string;
  transcriptionPrompt: string;
  appPath: string;
  webhookPath: string;
  botTokenEnv: string;
  webhookSecretEnv: string;
  site?: LanguageSiteDefinition;
  addPhrasePlaceholders: AddPhrasePlaceholders;
  starterVocabulary: readonly { term: string; definition: string }[];
  quizSystemPrompt: string;
  graderPrompt: string;
  speaking?: SpeakingLanguageDefinition;
  buildQuizPrompt: (
    items: LanguageVocabularyItem[],
    recentSentences: LanguageRecentSentence[],
  ) => string;
};
