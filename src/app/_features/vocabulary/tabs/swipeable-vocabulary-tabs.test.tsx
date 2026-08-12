import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { VocabularyStatus } from "../vocabulary.types";
import {
  SwipeableVocabularyTabs,
  type SwipeableVocabularyTabPage,
} from "./swipeable-vocabulary-tabs";

afterEach(cleanup);

function Pager({ statuses }: { statuses: VocabularyStatus[] }) {
  const [activeTab, setActiveTab] = useState(statuses[0]);
  const pages: SwipeableVocabularyTabPage[] = statuses.map((status) => ({
    value: status,
    content: (
      <section role="tabpanel" aria-label={status}>
        <input aria-label={`${status} search`} />
      </section>
    ),
  }));

  return (
    <SwipeableVocabularyTabs
      activeTab={activeTab}
      pages={pages}
      onChange={setActiveTab}
    />
  );
}

function swipe(startX: number, endX: number) {
  const panel = screen.getByRole("tabpanel");
  fireEvent.touchStart(panel, {
    touches: [{ clientX: startX, clientY: 100 }],
  });
  fireEvent.touchEnd(panel, {
    changedTouches: [{ clientX: endX, clientY: 105 }],
  });
}

describe("SwipeableVocabularyTabs", () => {
  it("switches through the ordered pages in both directions", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    swipe(250, 100);
    expect(screen.getByRole("tabpanel", { name: "practicing" })).toBeVisible();

    swipe(250, 100);
    expect(screen.getByRole("tabpanel", { name: "learned" })).toBeVisible();

    swipe(100, 250);
    expect(screen.getByRole("tabpanel", { name: "practicing" })).toBeVisible();
  });

  it("moves adjacent pages with the finger and preserves the gutter", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    const learningPanel = screen.getByRole("tabpanel", { name: "learning" });
    const practicingPanel = screen.getByRole("tabpanel", {
      name: "practicing",
      hidden: true,
    });
    fireEvent.touchStart(learningPanel, {
      touches: [{ clientX: 250, clientY: 100 }],
    });
    fireEvent.touchMove(learningPanel, {
      touches: [{ clientX: 160, clientY: 104 }],
    });

    const learningPage = learningPanel.parentElement;
    const practicingPage = practicingPanel.parentElement;
    expect(learningPage).toHaveStyle({
      transform: "translate3d(calc(0% + 0px + -90px), 0, 0)",
    });
    expect(practicingPage).toHaveStyle({
      transform: "translate3d(calc(100% + 24px + -90px), 0, 0)",
    });
    expect(learningPage?.parentElement).toHaveAttribute(
      "data-dragging",
      "true",
    );
  });

  it("prevents native scrolling only during a horizontal swipe", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    const panel = screen.getByRole("tabpanel", { name: "learning" });
    fireEvent.touchStart(panel, {
      touches: [{ clientX: 250, clientY: 100 }],
    });
    const horizontalMoveWasNotCancelled = fireEvent.touchMove(panel, {
      cancelable: true,
      touches: [{ clientX: 160, clientY: 104 }],
    });
    expect(horizontalMoveWasNotCancelled).toBe(false);

    fireEvent.touchCancel(panel);
    fireEvent.touchStart(panel, {
      touches: [{ clientX: 250, clientY: 100 }],
    });
    const verticalMoveWasNotCancelled = fireEvent.touchMove(panel, {
      cancelable: true,
      touches: [{ clientX: 246, clientY: 160 }],
    });
    expect(verticalMoveWasNotCancelled).toBe(true);
  });

  it("removes text-input focus once a horizontal swipe starts", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    const input = screen.getByRole("textbox", { name: "learning search" });
    const panel = screen.getByRole("tabpanel", { name: "learning" });
    input.focus();
    expect(input).toHaveFocus();

    fireEvent.touchStart(panel, {
      touches: [{ clientX: 250, clientY: 100 }],
    });
    fireEvent.touchMove(panel, {
      touches: [{ clientX: 160, clientY: 104 }],
    });

    expect(input).not.toHaveFocus();
  });

  it("ignores short, vertical, and interactive-control gestures", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    const panel = screen.getByRole("tabpanel", { name: "learning" });
    fireEvent.touchStart(panel, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(panel, {
      changedTouches: [{ clientX: 165, clientY: 102 }],
    });
    fireEvent.touchStart(panel, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(panel, {
      changedTouches: [{ clientX: 120, clientY: 220 }],
    });

    const input = screen.getByRole("textbox", { name: "learning search" });
    fireEvent.touchStart(input, {
      touches: [{ clientX: 200, clientY: 100 }],
    });
    fireEvent.touchEnd(input, {
      changedTouches: [{ clientX: 80, clientY: 100 }],
    });

    expect(screen.getByRole("tabpanel", { name: "learning" })).toBeVisible();
  });

  it("supports a two-page flow without a practicing page", () => {
    render(<Pager statuses={["learning", "learned"]} />);

    swipe(220, 100);

    expect(screen.getByRole("tabpanel", { name: "learned" })).toBeVisible();
  });
});
