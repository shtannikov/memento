export const ITEMS_PER_EPISODE = 5;
export const FRAMES_PER_ITEM = 180;
export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_DURATION_IN_FRAMES = ITEMS_PER_EPISODE * FRAMES_PER_ITEM;
export const ANSWER_SPEECH_FRAME = 143;

const idPattern = /^[a-z][a-z0-9-]*$/;
const colorPattern = /^#[0-9a-fA-F]{6}$/;

export type VideoLanguagePack = {
  id: string;
  targetLanguage: string;
  locale: string;
  seriesLabel: string;
  questionText: string;
  tts: {voice: string; questionRate: number; answerRate: number};
};

export type EpisodeItem = {
  term: string;
  slug: string;
  visualPrompt: string;
  accent: string;
  pale: string;
};

export type EpisodeManifest = {
  id: string;
  languageId: string;
  topic: string;
  items: EpisodeItem[];
};

export type QuizVideoProps = {language: VideoLanguagePack; episode: EpisodeManifest};

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function id(value: unknown, label: string): string {
  const parsed = string(value, label);
  if (!idPattern.test(parsed)) throw new Error(`${label} must use lowercase kebab-case`);
  return parsed;
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function color(value: unknown, label: string): string {
  const parsed = string(value, label);
  if (!colorPattern.test(parsed)) throw new Error(`${label} must be a six-digit hex color`);
  return parsed;
}

export function parseLanguagePack(value: unknown): VideoLanguagePack {
  const input = object(value, 'Language pack');
  const tts = object(input.tts, 'Language pack tts');
  return {
    id: id(input.id, 'Language pack id'),
    targetLanguage: string(input.targetLanguage, 'Language pack targetLanguage'),
    locale: string(input.locale, 'Language pack locale'),
    seriesLabel: string(input.seriesLabel, 'Language pack seriesLabel'),
    questionText: string(input.questionText, 'Language pack questionText'),
    tts: {
      voice: string(tts.voice, 'Language pack tts.voice'),
      questionRate: positiveInteger(tts.questionRate, 'Language pack tts.questionRate'),
      answerRate: positiveInteger(tts.answerRate, 'Language pack tts.answerRate'),
    },
  };
}

export function parseEpisodeManifest(value: unknown): EpisodeManifest {
  const input = object(value, 'Episode manifest');
  if (!Array.isArray(input.items) || input.items.length !== ITEMS_PER_EPISODE) {
    throw new Error(`Episode manifest must contain exactly ${ITEMS_PER_EPISODE} items`);
  }
  const items = input.items.map((rawItem, index): EpisodeItem => {
    const item = object(rawItem, `Episode item ${index + 1}`);
    return {
      term: string(item.term, `Episode item ${index + 1} term`),
      slug: id(item.slug, `Episode item ${index + 1} slug`),
      visualPrompt: string(item.visualPrompt, `Episode item ${index + 1} visualPrompt`),
      accent: color(item.accent, `Episode item ${index + 1} accent`),
      pale: color(item.pale, `Episode item ${index + 1} pale`),
    };
  });
  if (new Set(items.map((item) => item.slug)).size !== items.length) {
    throw new Error('Episode item slugs must be unique');
  }
  return {
    id: id(input.id, 'Episode manifest id'),
    languageId: id(input.languageId, 'Episode manifest languageId'),
    topic: string(input.topic, 'Episode manifest topic'),
    items,
  };
}

export function resolveQuizVideoProps(languageValue: unknown, episodeValue: unknown): QuizVideoProps {
  const language = parseLanguagePack(languageValue);
  const episode = parseEpisodeManifest(episodeValue);
  if (language.id !== episode.languageId) {
    throw new Error(`Episode languageId ${episode.languageId} does not match language pack ${language.id}`);
  }
  return {language, episode};
}
