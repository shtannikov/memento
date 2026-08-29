import {
  cleanup,
  fireEvent,
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
import styles from "./vocabulary-screen.module.css";

afterEach(() => {
  cleanup();
  globalThis.Telegram = undefined;
  vi.restoreAllMocks();
});

describe("VocabularyScreen", () => {
  it("keeps the adjacent tab search empty while swiping", async () => {
    const user = userEvent.setup();
    render(
      <VocabularyScreen
        learning={[]}
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

    const learningSearch = screen.getByRole("searchbox", {
      name: "Search phrases",
    });
    await user.type(learningSearch, "follow");

    const viewport = screen.getByTestId("tab-viewport");
    Object.defineProperty(viewport, "clientWidth", { value: 320 });
    viewport.scrollLeft = 90;
    fireEvent.scroll(viewport);

    const searches = screen.getAllByRole("searchbox", {
      name: "Search phrases",
      hidden: true,
    });
    expect(searches[0]).toHaveValue("follow");
    expect(searches[1]).toHaveValue("");
  });

  it("animates the Learning actions continuously with tab progress", () => {
    render(
      <VocabularyScreen
        learning={[]}
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

    const viewport = screen.getByTestId("tab-viewport");
    const vocabularyScreen = screen.getByTestId("vocabulary-screen");
    const actions = screen.getByTestId("learning-actions");
    Object.defineProperty(viewport, "clientWidth", { value: 320 });

    viewport.scrollLeft = 172;
    fireEvent.scroll(viewport);

    expect(vocabularyScreen).toHaveStyle({
      "--learning-actions-opacity": "0.5",
      "--learning-actions-scale": "0.98",
      "--learning-actions-y": "8px",
    });
    expect(actions).not.toHaveAttribute("aria-hidden", "true");

    viewport.scrollLeft = 344;
    fireEvent.scroll(viewport);
    fireEvent(viewport, new Event("scrollend"));

    expect(vocabularyScreen).toHaveStyle({
      "--learning-actions-opacity": "0",
      "--learning-actions-scale": "0.96",
      "--learning-actions-y": "16px",
    });
    expect(actions).toHaveAttribute("aria-hidden", "true");
    expect(actions).toHaveAttribute("inert");
  });

  it("marks the screen while a search input is focused", () => {
    render(
      <VocabularyScreen
        learning={[]}
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

    const vocabularyScreen = screen.getByTestId("vocabulary-screen");
    const search = screen.getByRole("searchbox", { name: "Search phrases" });
    expect(vocabularyScreen).toHaveAttribute("data-search-focused", "false");

    fireEvent.focus(search);
    expect(vocabularyScreen).toHaveAttribute("data-search-focused", "true");

    fireEvent.blur(search);
    expect(vocabularyScreen).toHaveAttribute("data-search-focused", "false");
  });

  it("hides the Learning actions before the Add Phrase keyboard opens", async () => {
    const user = userEvent.setup();
    render(
      <VocabularyScreen
        learning={[]}
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

    const actions = screen.getByTestId("learning-actions");
    await user.click(screen.getByRole("button", { name: "Add phrase" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(actions).toHaveClass(styles.floatingActionsDialogOpen);
    expect(actions).toHaveAttribute("aria-hidden", "true");
    expect(actions).toHaveAttribute("inert");

    await user.click(
      screen.getByRole("button", { name: "Close add word dialog" }),
    );
    expect(actions).not.toHaveClass(styles.floatingActionsDialogOpen);
  });

  it("gives list gestures to the app and header gestures to Telegram", () => {
    const disableVerticalSwipes = vi.fn();
    const enableVerticalSwipes = vi.fn();
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready: vi.fn(),
        expand: vi.fn(),
        disableVerticalSwipes,
        enableVerticalSwipes,
      },
    };

    const { unmount } = render(
      <VocabularyScreen
        learning={[]}
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

    expect(disableVerticalSwipes).not.toHaveBeenCalled();
    expect(enableVerticalSwipes).not.toHaveBeenCalled();

    const header = screen.getByRole("banner");
    fireEvent.touchStart(header);
    fireEvent.touchEnd(header, { touches: [] });
    expect(disableVerticalSwipes).not.toHaveBeenCalled();
    expect(enableVerticalSwipes).not.toHaveBeenCalled();

    const viewport = screen.getByTestId("tab-viewport");
    fireEvent.touchStart(viewport, { touches: [{ identifier: 1 }] });
    expect(disableVerticalSwipes).toHaveBeenCalledOnce();
    expect(enableVerticalSwipes).not.toHaveBeenCalled();

    fireEvent.touchEnd(viewport, { touches: [] });
    expect(enableVerticalSwipes).toHaveBeenCalledOnce();

    unmount();
    expect(enableVerticalSwipes).toHaveBeenCalledTimes(2);
    globalThis.Telegram = undefined;
  });

  it("disables the quiz action when Learning has fewer than two phrases", async () => {
    const onStartQuiz = vi.fn();
    const learning: VocabularyItem = {
      id: "1",
      term: "follow up",
      definition: "continue checking",
      status: "learning",
    };

    const { rerender } = render(
      <VocabularyScreen
        learning={[]}
        practicing={[]}
        learned={[]}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn()}
        onReorderPracticing={vi.fn()}
        onStartQuiz={onStartQuiz}
      />,
    );

    const quizButton = screen.getByRole("button", { name: "Start quiz" });
    expect(quizButton).toBeDisabled();
    expect(quizButton).toHaveAttribute("aria-busy", "false");
    expect(onStartQuiz).not.toHaveBeenCalled();

    rerender(
      <VocabularyScreen
        learning={[learning]}
        practicing={[]}
        learned={[]}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn()}
        onReorderPracticing={vi.fn()}
        onStartQuiz={onStartQuiz}
      />,
    );

    expect(screen.getByRole("button", { name: "Start quiz" })).toBeDisabled();
    expect(onStartQuiz).not.toHaveBeenCalled();
  });

  it("enables the quiz action when Learning has two phrases", async () => {
    const user = userEvent.setup();
    const onStartQuiz = vi.fn();
    const learning: VocabularyItem[] = [
      {
        id: "1",
        term: "follow up",
        definition: "continue checking",
        status: "learning",
      },
      {
        id: "2",
        term: "take into account",
        definition: "consider",
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
        onStartQuiz={onStartQuiz}
      />,
    );

    const quizButton = screen.getByRole("button", { name: "Start quiz" });
    expect(quizButton).toBeEnabled();

    await user.click(quizButton);
    expect(onStartQuiz).toHaveBeenCalledOnce();
  });

  it("shows a toast after successful phrase moves and removal", async () => {
    const user = userEvent.setup();
    const learning: VocabularyItem = {
      id: "1",
      term: "follow up",
      definition: "continue checking",
      status: "learning",
    };
    const practicing: VocabularyItem = {
      id: "2",
      term: "take into account",
      definition: "consider",
      status: "practicing",
    };
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);

    render(
      <VocabularyScreen
        learning={[learning]}
        practicing={[practicing]}
        learned={[]}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn().mockResolvedValue(true)}
        onChangeStatus={vi.fn().mockResolvedValue(true)}
        onReorderPracticing={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Move follow up to practicing" }),
    );
    expect(screen.getByText("Moved to Practicing")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Practicing" }));
    await user.click(
      await screen.findByRole("button", {
        name: "Move take into account back to learning",
      }),
    );
    expect(screen.getByText("Moved to Learning")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Delete take into account" }),
    );
    expect(screen.getByText("Removed")).toBeInTheDocument();
  });

  it("uses the Learned destination for the Czech two-stage flow", async () => {
    const user = userEvent.setup();
    const item: VocabularyItem = {
      id: "1",
      term: "zapamatovat si",
      definition: "to remember",
      status: "learning",
    };

    render(
      <VocabularyScreen
        learning={[item]}
        practicing={[]}
        learned={[]}
        speakingEnabled={false}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn().mockResolvedValue(true)}
        onReorderPracticing={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Mark zapamatovat si as learned" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("Moved to Learned");
  });

  it("does not show a toast when a mutation is unsuccessful", async () => {
    const user = userEvent.setup();
    const item: VocabularyItem = {
      id: "1",
      term: "follow up",
      definition: "continue checking",
      status: "learning",
    };

    render(
      <VocabularyScreen
        learning={[item]}
        practicing={[]}
        learned={[]}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn().mockResolvedValue(false)}
        onReorderPracticing={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Move follow up to practicing" }),
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

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
      const [mutating, setMutating] = useState(false);

      return (
        <VocabularyScreen
          learning={items}
          practicing={[]}
          learned={[]}
          speakingEnabled
          mutating={mutating}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
          onChangeStatus={async (item) => {
            setMutating(true);
            await mutation.promise;
            setItems((current) =>
              current.filter((candidate) => candidate.id !== item.id),
            );
            setMutating(false);
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
    const nextMoveButton = screen.getByRole("button", {
      name: "Move a stroller to practicing",
    });
    expect(nextMoveButton).toBeEnabled();
    expect(nextMoveButton).not.toHaveFocus();
    expect(document.activeElement).toBe(document.body);
    expect(
      screen.getByRole("button", { name: "Add phrase" }),
    ).toHaveAttribute("aria-busy", "false");
  });

  it("shows opaque disabled Add and Quiz actions during a mutation", async () => {
    const user = userEvent.setup();
    const mutation = Promise.withResolvers<void>();
    const learning: VocabularyItem[] = [
      {
        id: "1",
        term: "a cradle",
        definition: "люлька",
        status: "learning",
      },
    ];

    function PendingMoveScreen() {
      const [mutating, setMutating] = useState(false);

      return (
        <VocabularyScreen
          learning={learning}
          practicing={[]}
          learned={[]}
          speakingEnabled
          mutating={mutating}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
          onChangeStatus={async () => {
            setMutating(true);
            await mutation.promise;
            setMutating(false);
          }}
          onReorderPracticing={vi.fn()}
          onStartQuiz={vi.fn()}
        />
      );
    }

    render(<PendingMoveScreen />);

    await user.click(
      screen.getByRole("button", {
        name: "Move a cradle to practicing",
      }),
    );

    for (const name of ["Add phrase", "Start quiz"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
    }
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
      const [mutating, setMutating] = useState(false);

      return (
        <VocabularyScreen
          learning={items}
          practicing={[]}
          learned={[]}
          speakingEnabled
          mutating={mutating}
          onAdd={vi.fn()}
          onRemove={async (item) => {
            setMutating(true);
            await mutation.promise;
            setItems((current) =>
              current.filter((candidate) => candidate.id !== item.id),
            );
            setMutating(false);
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
        "A phrase moves to Practicing after 3 completed quizzes.",
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

    const activePanel = screen.getByRole("tabpanel", { name: "Learning" });
    expect(within(activePanel).getByText("No matches found")).toBeInTheDocument();
    expect(
      within(activePanel).getByText("Try a different word or definition."),
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

  it("switches tabs from the vocabulary totals", async () => {
    const user = userEvent.setup();
    const learning: VocabularyItem = {
      id: "1",
      term: "follow up",
      definition: "continue checking",
      status: "learning",
    };
    const practicing: VocabularyItem = {
      id: "2",
      term: "make up my mind",
      definition: "decide",
      status: "practicing",
    };
    const learned: VocabularyItem = {
      id: "3",
      term: "take into account",
      definition: "consider",
      status: "learned",
    };

    render(
      <VocabularyScreen
        learning={[learning]}
        practicing={[practicing]}
        learned={[learned]}
        speakingEnabled
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onChangeStatus={vi.fn()}
        onReorderPracticing={vi.fn()}
        onStartQuiz={vi.fn()}
      />,
    );

    const learningTotal = screen.getByRole("button", {
      name: "Show learning phrases (1)",
    });
    const practicingTotal = screen.getByRole("button", {
      name: "Show practicing phrases (1)",
    });
    const learnedTotal = screen.getByRole("button", {
      name: "Show learned phrases (1)",
    });

    expect(learningTotal).toHaveAttribute("aria-pressed", "true");

    await user.click(practicingTotal);
    expect(practicingTotal).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("tabpanel", { name: "Practicing" }),
    ).toBeInTheDocument();

    await user.click(learnedTotal);
    expect(learnedTotal).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("tabpanel", { name: "Learned" }),
    ).toBeInTheDocument();
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

  it("shows speaking mastery guidance with a direct completion action", async () => {
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
    await user.click(
      screen.getByRole("button", {
        name: "Mark make up my mind as learned",
      }),
    );
    expect(onChangeStatus).toHaveBeenCalledWith(practicing[0], "learned");
    const command = screen.getByRole("button", {
      name: "Copy /speaking command",
    });
    await user.click(command);
    expect(await navigator.clipboard.readText()).toBe("/speaking");
    expect(command).toHaveAttribute("data-copied", "true");
    expect(command).toHaveAccessibleName("/speaking copied");
    expect(screen.getByText("Copied")).toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", {
        name: "Move make up my mind back to learning",
      }),
    );
    expect(onChangeStatus).toHaveBeenLastCalledWith(practicing[0], "learning");
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
      screen.getByText(
        "A phrase moves to Learned after 3 completed quizzes.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/correct answers/)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Mark zapamatovat si as learned" }),
    );
    expect(onChangeStatus).toHaveBeenCalledWith(learning[0], "learned");
  });
});
