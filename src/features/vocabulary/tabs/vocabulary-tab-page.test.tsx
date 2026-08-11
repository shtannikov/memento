import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VocabularyItem } from "../vocabulary.types";
import { VocabularyItemList, VocabularyTabPage } from "./vocabulary-tab-page";

afterEach(cleanup);

const items: VocabularyItem[] = [
  {
    id: "1",
    term: "Follow up",
    definition: "continue checking",
    status: "learning",
  },
  {
    id: "2",
    term: "take into account",
    definition: "consider carefully",
    status: "learning",
  },
];

function SearchablePage() {
  const [query, setQuery] = useState("");
  return (
    <VocabularyTabPage
      status="learning"
      label="Learning"
      searchQuery={query}
      onSearchChange={setQuery}
    >
      <VocabularyItemList
        items={items}
        searchQuery={query}
        emptyTitle="Nothing to learn yet"
        emptyText="Add a phrase to start your list."
        speakingEnabled
        disabled={false}
        onLearn={vi.fn()}
        onDelete={vi.fn()}
      />
    </VocabularyTabPage>
  );
}

describe("VocabularyTabPage", () => {
  it("filters by term or definition and clears the query with focus restored", async () => {
    const user = userEvent.setup();
    render(<SearchablePage />);
    const search = screen.getByRole("searchbox", { name: "Search phrases" });

    await user.click(search);
    expect(search.parentElement).toHaveAttribute("data-focused", "true");

    await user.type(search, "FOLLOW");
    expect(screen.getByRole("heading", { name: "Follow up" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "take into account" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();

    await user.type(search, "missing phrase");
    expect(screen.getByText("No matches found")).toBeInTheDocument();
    expect(
      screen.getByText("Try a different word or definition."),
    ).toBeInTheDocument();
  });
});
