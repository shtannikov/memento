import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VocabularyScreen } from "./vocabulary-screen";
import type { VocabularyItem } from "./vocabulary.types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("VocabularyScreen", () => {
  it("disables phrase actions during a move without moving focus to the next phrase", async () => {
    const user = userEvent.setup();
    const mutation = Promise.withResolvers<void>();
    const learning: VocabularyItem[] = [
      {
        id: "1",
        term: "a cradle",
        definition: "люлька",
        status: "learning",
      },
      {
        id: "2",
        term: "a stroller",
        definition: "коляска",
        status: "learning",
      },
    ];

    function PendingMoveScreen() {
      const [items, setItems] = useState(learning);

      return (
        <VocabularyScreen
          learning={items}
          practicing={[]}
          learned={[]}
          speakingEnabled
          onAdd={vi.fn()}
          onRemove={vi.fn()}
          onChangeStatus={async (item) => {
            await mutation.promise;
            setItems((current) =>
              current.filter((candidate) => candidate.id !== item.id),
            );
            window.requestAnimationFrame(() => {
              document
                .querySelector<HTMLButtonElement>(
                  '[aria-label="Move a stroller to practicing"]',
                )
                ?.focus();
            });
          }}
          onReorderPracticing={vi.fn()}
          onStartQuiz={vi.fn()}
        />
      );
    }

    render(<PendingMoveScreen />);

    const moveButton = screen.getByRole("button", {
      name: "Move a cradle to practicing",
    });
    await user.click(moveButton);

    expect(moveButton).not.toHaveFocus();
    for (const button of screen.getAllByRole("button", {
      name: /^(Move|Delete) /,
    })) {
      expect(button).toBeDisabled();
    }
    expect(
      screen.getByRole("button", { name: "Add phrase" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Start quiz" }),
    ).toBeDisabled();

    mutation.resolve();

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "a cradle" }),
      ).not.toBeInTheDocument(),
    );
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => resolve()),
      ),
    );
    expect(
      screen.getByRole("button", {
        name: "Move a stroller to practicing",
      }),
    ).not.toHaveFocus();
  });

  it("disables phrase actions while deleting a phrase", async () => {
    const user = userEvent.setup();
    const mutation = Promise.withResolvers<void>();
    const learning: VocabularyItem[] = [
      {
        id: "1",
        term: "a cradle",
        definition: "люлька",
        status: "learning",
      },
      {
        id: "2",
        term: "a stroller",
        definition: "коляска",
        status: "learning",
      },
    ];
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);

    function PendingDeleteScreen() {
      const [items, setItems] = useState(learning);

      return (
        <VocabularyScreen
          learning={items}
          practicing={[]}
          learned={[]}
          speakingEnabled
          onAdd={vi.fn()}
          onRemove={async (item) => {
            await mutation.promise;
            setItems((current) =>
              current.filter((candidate) => candidate.id !== item.id),
            );
          }}
          onChangeStatus={vi.fn()}
          onReorderPracticing={vi.fn()}
          onStartQuiz={vi.fn()}
        />
      );
    }

    render(<PendingDeleteScreen />);
    await user.click(
      screen.getByRole("button", { name: "Delete a cradle" }),
    );

    for (const button of screen.getAllByRole("button", {
      name: /^(Move|Delete) /,
    })) {
      expect(button).toBeDisabled();
    }

    mutation.resolve();

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "a cradle" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("filters the active vocabulary tab by phrase or definition", async () => {
    const user = userEvent.setup();
    const learning: VocabularyItem[] = [
      {
        id: "1",
        term: "Follow up",
        definition: "continue checking",
        status: "learning",
        consecutiveCorrect: 2,
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
        onReorderPracticing={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    const search = screen.getByRole("searchbox", {
      name: "Search phrases",
    });

    expect(search).toHaveAttribute("placeholder", "Search phrases");
    expect(
      screen.getByText(
        "A phrase moves to Practicing after 3 correct answers.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("2/3 correct answers"),
    ).not.toBeInTheDocument();

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
        onReorderPracticing={vi.fn()}
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
        onReorderPracticing={vi.fn()}
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

  it("shows speaking mastery guidance without a direct completion action", async () => {
    const user = userEvent.setup();
    const onChangeStatus = vi.fn();
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
        onChangeStatus={onChangeStatus}
        onReorderPracticing={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Practicing" }));
    expect(
      screen.getByText(/Use a phrase correctly/),
    ).toHaveTextContent(
      "Use a phrase correctly in three speaking tasks to move it to Learned. Send /speaking in the chat to get your speaking task.",
    );
    expect(
      screen.queryByText("2/3 correct uses"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /mark .* learned/i }),
    ).not.toBeInTheDocument();
    const command = screen.getByRole("button", {
      name: "Copy /speaking command",
    });
    await user.click(command);
    expect(await navigator.clipboard.readText()).toBe("/speaking");
    expect(command).toHaveAttribute("data-copied", "true");
    expect(command).toHaveAccessibleName("/speaking copied");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
    await user.click(
      await screen.findByRole("button", {
        name: "Move make up my mind back to learning",
      }),
    );
    expect(onChangeStatus).toHaveBeenCalledWith(practicing[0], "learning");
  });

  it("highlights the first three practicing phrases as the next speaking task", async () => {
    const user = userEvent.setup();
    const practicing: VocabularyItem[] = Array.from({ length: 4 }, (_, index) => ({
      id: String(index + 1),
      term: `phrase ${index + 1}`,
      definition: `definition ${index + 1}`,
      status: "practicing",
      correctUses: 0,
      practiceRank: (index + 1) * 1024,
    }));

    render(
      <VocabularyScreen
        learning={[]}
        practicing={practicing}
        learned={[]}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn()}
        onReorderPracticing={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Practicing" }));
    const activePractice = await screen.findByRole("region", {
      name: "In active practice",
    });
    expect(
      within(activePractice).getByText(
        "These 3 phrases will come up in your next speaking task.",
      ),
    ).toBeInTheDocument();
    for (const item of practicing.slice(0, 3)) {
      expect(
        within(activePractice).getByRole("heading", { name: item.term }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: `Drag ${item.term} to reorder`,
        }),
      ).toBeInTheDocument();
    }
    expect(
      within(activePractice).queryByRole("heading", { name: "phrase 4" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "phrase 4" }),
    ).toBeInTheDocument();
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
        consecutiveCorrect: 2,
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
        onReorderPracticing={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    expect(screen.queryByRole("tab", { name: "Practicing" })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Send \/speaking in the chat/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/move it to Practicing/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("2/3 correct answers")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Mark zapamatovat si as learned" }),
    );
    expect(onChangeStatus).toHaveBeenCalledWith(learning[0], "learned");
  });
});
