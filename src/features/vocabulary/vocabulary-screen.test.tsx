import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VocabularyScreen } from "./vocabulary-screen";
import type { VocabularyItem } from "./vocabulary.types";

afterEach(cleanup);

describe("VocabularyScreen", () => {
  it("filters the active vocabulary tab by phrase or definition", async () => {
    const user = userEvent.setup();
    const learning: VocabularyItem[] = [
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

    render(
      <VocabularyScreen
        learning={learning}
        learned={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    const search = screen.getByRole("searchbox", {
      name: "Search vocabulary",
    });

    await user.type(search, "FOLLOW");

    expect(
      screen.getByRole("heading", { name: "Follow up" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "take into account" }),
    ).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "carefully");

    expect(
      screen.queryByRole("heading", { name: "Follow up" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "take into account" }),
    ).toBeInTheDocument();
  });

  it("keeps the search query across tabs and shows a search empty state", async () => {
    const user = userEvent.setup();
    const learning: VocabularyItem[] = [
      {
        id: "1",
        term: "follow up",
        definition: "continue checking",
        status: "learning",
      },
    ];
    const learned: VocabularyItem[] = [
      {
        id: "2",
        term: "take into account",
        definition: "consider",
        status: "learned",
      },
    ];

    render(
      <VocabularyScreen
        learning={learning}
        learned={learned}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", {
        name: "Search vocabulary",
      }),
      "follow",
    );
    await user.click(screen.getByRole("tab", { name: "Learned" }));

    expect(
      screen.getByRole("searchbox", {
        name: "Search vocabulary",
      }),
    ).toHaveValue("follow");
    expect(
      screen.getByText("No matches found"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Try a different word or definition."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No learned words yet"),
    ).not.toBeInTheDocument();
  });

  it("stays on Learned while restoring several phrases", async () => {
    const user = userEvent.setup();
    const onChangeStatus = vi.fn();
    const learned: VocabularyItem[] = [
      {
        id: "1",
        term: "follow up",
        definition: "continue checking",
        status: "learned",
      },
      {
        id: "2",
        term: "take into account",
        definition: "consider",
        status: "learned",
      },
    ];

    render(
      <VocabularyScreen
        learning={[]}
        learned={learned}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={onChangeStatus}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Learned" }));
    await user.click(
      screen.getByRole("button", {
        name: "Move follow up back to learning",
      }),
    );

    expect(
      screen.getByRole("tabpanel", { name: "Learned" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Move take into account back to learning",
      }),
    );

    expect(onChangeStatus).toHaveBeenNthCalledWith(
      1,
      learned[0],
      "learning",
    );
    expect(onChangeStatus).toHaveBeenNthCalledWith(
      2,
      learned[1],
      "learning",
    );
  });
});
