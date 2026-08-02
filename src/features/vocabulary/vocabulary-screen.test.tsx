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
        practicing={[]}
        learned={[]}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    const search = screen.getByRole("searchbox", {
      name: "Search phrases",
    });

    expect(search).toHaveAttribute("placeholder", "Search phrases");

    await user.type(search, "FOLLOW");

    expect(
      screen.getByRole("heading", { name: "Follow up" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "take into account" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Clear search" }),
    );

    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "Clear search" }),
    ).not.toBeInTheDocument();

    await user.type(search, "carefully");

    expect(
      screen.queryByRole("heading", { name: "Follow up" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "take into account" }),
    ).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "missing phrase");

    expect(screen.getByText("No matches found")).toBeInTheDocument();
    expect(
      screen.getByText("Try a different word or definition."),
    ).toBeInTheDocument();
  });

  it("clears the search query when switching tabs", async () => {
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
        practicing={[]}
        learned={learned}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", {
        name: "Search phrases",
      }),
      "follow",
    );
    await user.click(screen.getByRole("tab", { name: "Learned" }));

    expect(
      screen.getByRole("searchbox", {
        name: "Search phrases",
      }),
    ).toHaveValue("");
    expect(
      screen.getByRole("heading", { name: "take into account" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No matches found"),
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
        practicing={[]}
        learned={learned}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={onChangeStatus}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Learned" }));
    await user.click(
      screen.getByRole("button", {
        name: "Move follow up back to practicing",
      }),
    );

    expect(
      screen.getByRole("tabpanel", { name: "Learned" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Move take into account back to practicing",
      }),
    );

    expect(onChangeStatus).toHaveBeenNthCalledWith(
      1,
      learned[0],
      "practicing",
    );
    expect(onChangeStatus).toHaveBeenNthCalledWith(
      2,
      learned[1],
      "practicing",
    );
  });

  it("shows speaking mastery progress without a direct completion action", async () => {
    const user = userEvent.setup();
    const practicing: VocabularyItem[] = [
      {
        id: "3",
        term: "make up my mind",
        definition: "decide",
        status: "practicing",
        correctUses: 2,
      },
    ];
    render(
      <VocabularyScreen
        learning={[]}
        practicing={practicing}
        learned={[]}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Practicing" }));
    expect(screen.getByText("2/3 correct uses")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /mark .* learned/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the two-stage flow when speaking is unavailable", async () => {
    const user = userEvent.setup();
    const onChangeStatus = vi.fn();
    const learning: VocabularyItem[] = [
      {
        id: "4",
        term: "zapamatovat si",
        definition: "to remember",
        status: "learning",
      },
    ];
    render(
      <VocabularyScreen
        learning={learning}
        practicing={[]}
        learned={[]}
        speakingEnabled={false}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={onChangeStatus}
        onStartQuiz={vi.fn()}
      />,
    );

    expect(screen.queryByRole("tab", { name: "Practicing" })).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Mark zapamatovat si as learned" }),
    );
    expect(onChangeStatus).toHaveBeenCalledWith(learning[0], "learned");
  });
});
