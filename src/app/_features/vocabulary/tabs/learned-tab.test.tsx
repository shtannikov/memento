import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VocabularyItem } from "../vocabulary.types";
import { LearnedTab } from "./learned-tab";

afterEach(cleanup);

const item: VocabularyItem = {
  id: "learned-1",
  term: "make up my mind",
  definition: "decide",
  status: "learned",
};

describe("LearnedTab", () => {
  it.each([
    [true, "practicing"],
    [false, "learning"],
  ] as const)(
    "restores to the previous stage when speakingEnabled is %s",
    async (speakingEnabled, destination) => {
      const user = userEvent.setup();
      const onChangeStatus = vi.fn();
      render(
        <LearnedTab
          items={[item]}
          speakingEnabled={speakingEnabled}
          searchQuery=""
          onSearchChange={vi.fn()}
          disabled={false}
          onChangeStatus={onChangeStatus}
          onDelete={vi.fn()}
        />,
      );

      await user.click(
        screen.getByRole("button", {
          name: `Move make up my mind back to ${destination}`,
        }),
      );
      expect(onChangeStatus).toHaveBeenCalledWith(item, destination);
    },
  );
});
