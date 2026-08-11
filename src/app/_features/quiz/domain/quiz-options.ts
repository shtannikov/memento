import { randomInt } from "node:crypto";

type QuizCardWithOptions = {
  answer: string;
  options: string[];
};

type RandomIndex = (maxExclusive: number) => number;

const OPTION_COUNT = 4;

export function randomizeQuizCards<T extends QuizCardWithOptions>(
  cards: T[],
  randomIndex: RandomIndex = randomInt,
): T[] {
  const correctPositions = shuffle(
    cards.map((_, index) => index % OPTION_COUNT),
    randomIndex,
  );

  const cardsWithRandomizedOptions = cards.map((card, cardIndex) => {
    const options = shuffle(card.options, randomIndex);
    const normalizedAnswer = normalizeOption(card.answer);
    const currentCorrectIndex = options.findIndex(
      (option) => normalizeOption(option) === normalizedAnswer,
    );
    if (currentCorrectIndex < 0) {
      throw new Error("Quiz card options do not contain its answer");
    }

    const targetCorrectIndex = correctPositions[cardIndex];
    [options[currentCorrectIndex], options[targetCorrectIndex]] = [
      options[targetCorrectIndex],
      options[currentCorrectIndex],
    ];
    return { ...card, options };
  });

  return shuffle(cardsWithRandomizedOptions, randomIndex);
}

function shuffle<T>(values: T[], randomIndex: RandomIndex): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function normalizeOption(option: string): string {
  return option.trim().toLocaleLowerCase("en");
}
