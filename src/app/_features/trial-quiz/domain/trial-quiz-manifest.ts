import { z } from "zod";

import { isAppId } from "@/app/_languages/registry";
import type {
  TrialQuizCard,
  TrialQuizManifest,
} from "@/app/_features/trial-quiz/trial-quiz.types";

const TRIAL_EPISODE_COUNT = 7;
const TRIAL_SOURCE_ITEM_COUNT = 35;
const TRIAL_CARD_COUNT = 10;
const TRIAL_OPTION_COUNT = 4;

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const episodeSchema = z.object({
  id: idSchema,
  languageId: idSchema,
  items: z.array(
    z.object({
      term: z.string().trim().min(1),
      slug: idSchema,
    }),
  ).length(5),
});

const trialCardInputSchema = z.object({
  source: z.object({
    episodeId: idSchema,
    itemSlug: idSchema,
  }),
  sentence: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  options: z.array(z.string().trim().min(1)).length(TRIAL_OPTION_COUNT),
});

const trialManifestInputSchema = z.object({
  id: idSchema,
  languageId: idSchema,
  episodeIds: z.array(idSchema).length(TRIAL_EPISODE_COUNT),
  cards: z.array(trialCardInputSchema).length(TRIAL_CARD_COUNT),
});

type Episode = z.infer<typeof episodeSchema>;
type TrialManifestInput = z.infer<typeof trialManifestInputSchema>;

export function parseTrialQuizManifest(
  value: unknown,
  episodeValues: unknown[],
): TrialQuizManifest {
  const input = trialManifestInputSchema.parse(value);
  if (!isAppId(input.languageId)) {
    throw new Error(`Unknown Trial language ${input.languageId}`);
  }
  assertUnique(input.episodeIds, "Trial episode ids");

  const episodes = episodeValues.map((episode) => episodeSchema.parse(episode));
  const episodesById = new Map(episodes.map((episode) => [episode.id, episode]));
  if (
    episodes.length !== TRIAL_EPISODE_COUNT ||
    episodesById.size !== TRIAL_EPISODE_COUNT ||
    input.episodeIds.some((episodeId) => !episodesById.has(episodeId))
  ) {
    throw new Error("Trial must resolve its seven declared episodes exactly once");
  }
  for (const episode of episodes) {
    if (episode.languageId !== input.languageId) {
      throw new Error(`Trial episode ${episode.id} uses another language`);
    }
  }

  const sourceItems = episodes.flatMap((episode) =>
    episode.items.map((item) => ({
      ref: sourceRef(episode.id, item.slug),
      term: normalize(item.term),
    })),
  );
  if (sourceItems.length !== TRIAL_SOURCE_ITEM_COUNT) {
    throw new Error("Trial source must contain exactly 35 words");
  }
  assertUnique(sourceItems.map((item) => item.ref), "Trial source references");
  assertUnique(sourceItems.map((item) => item.term), "Trial source terms");
  const availableSources = new Set(sourceItems.map((item) => item.ref));

  const cards = input.cards.map((card): TrialQuizCard => {
    const id = sourceRef(card.source.episodeId, card.source.itemSlug);
    if (!availableSources.has(id)) {
      throw new Error(`Trial card ${id} does not reference a source word`);
    }
    if (card.sentence.split("___").length !== 2) {
      throw new Error(`Trial card ${id} must contain ___ exactly once`);
    }
    const normalizedOptions = card.options.map(normalize);
    assertUnique(normalizedOptions, `Trial card ${id} options`);
    if (
      normalizedOptions.filter((option) => option === normalize(card.answer))
        .length !== 1
    ) {
      throw new Error(`Trial card ${id} must contain its answer exactly once`);
    }
    return { id, ...card };
  });

  assertUnique(cards.map((card) => card.id), "Trial card ids");
  const coveredEpisodes = new Set(cards.map((card) => card.source.episodeId));
  if (input.episodeIds.some((episodeId) => !coveredEpisodes.has(episodeId))) {
    throw new Error("Trial cards must cover every episode");
  }

  return {
    id: input.id,
    languageId: input.languageId,
    episodeIds: [...input.episodeIds],
    cards,
  };
}

function sourceRef(episodeId: string, itemSlug: string): string {
  return `${episodeId}/${itemSlug}`;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function assertUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must be unique`);
  }
}

export type { Episode, TrialManifestInput };
