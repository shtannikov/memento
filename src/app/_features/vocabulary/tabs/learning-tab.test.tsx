import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VocabularyItem } from "../vocabulary.types";
import { LearningTab } from "./learning-tab";

afterEach(cleanup);

const item: VocabularyItem = {
  id: "learning-1",
  term: "follow up",
  definition: "continue checking",
  status: "learning",
};

describe("LearningTab", () => {
  it.each([
    [true, "Practicing", "practicing"],
    [false, "Learned", "learned"],
  ] as const)(
    "targets %s flow's next stage",
    async (speakingEnabled, destinationLabel, destination) => {
      const user = userEvent.setup();
      const onChangeStatus = vi.fn();
      render(
        <LearningTab
          items={[item]}
          speakingEnabled={speakingEnabled}
          searchQuery=""
          onSearchChange={vi.fn()}
          disabled={false}
          onChangeStatus={onChangeStatus}
          onDelete={vi.fn()}
        />,
      );

      expect(
        screen.getByText(
          `A phrase moves to ${destinationLabel} after 3 completed quizzes.`,
        ),
      ).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", {
          name: speakingEnabled
            ? "Move follow up to practicing"
            : "Mark 'follow up' as learned",
        }),
      );
      expect(onChangeStatus).toHaveBeenCalledWith(item, destination);
    },
  );
});
