import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VocabularyItem } from "../vocabulary.types";
import { PracticingTab } from "./practicing-tab";

afterEach(cleanup);

const item: VocabularyItem = {
  id: "practicing-1",
  term: "take into account",
  definition: "consider",
  status: "practicing",
};

describe("PracticingTab", () => {
  it("shows speaking guidance and restores a filtered phrase to Learning", async () => {
    const user = userEvent.setup();
    const onChangeStatus = vi.fn();
    render(
      <PracticingTab
        items={[item]}
        searchQuery="take"
        onSearchChange={vi.fn()}
        disabled={false}
        reordering={false}
        onChangeStatus={onChangeStatus}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    expect(screen.getByText("/speaking")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Move take into account back to learning",
      }),
    );
    expect(onChangeStatus).toHaveBeenCalledWith(item, "learning");
  });
});
