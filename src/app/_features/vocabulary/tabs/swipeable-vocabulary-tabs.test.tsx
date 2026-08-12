import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VocabularyStatus } from "../vocabulary.types";
import {
  SwipeableVocabularyTabs,
  type SwipeableVocabularyTabPage,
} from "./swipeable-vocabulary-tabs";

const VIEWPORT_WIDTH = 320;
const PAGE_STEP = VIEWPORT_WIDTH + 24;

afterEach(() => {
  cleanup();
});

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

function getViewport() {
  const viewport = screen.getByTestId("tab-viewport");
  Object.defineProperty(viewport, "clientWidth", {
    configurable: true,
    value: VIEWPORT_WIDTH,
  });
  return viewport;
}

function scrollToPage(index: number) {
  const viewport = getViewport();
  viewport.scrollLeft = index * PAGE_STEP;
  fireEvent.scroll(viewport);
  fireEvent(viewport, new Event("scrollend"));
}

describe("SwipeableVocabularyTabs", () => {
  it("switches through the ordered pages in both directions", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    scrollToPage(1);
    expect(screen.getByRole("tabpanel", { name: "practicing" })).toBeVisible();

    scrollToPage(2);
    expect(screen.getByRole("tabpanel", { name: "learned" })).toBeVisible();

    scrollToPage(1);
    expect(screen.getByRole("tabpanel", { name: "practicing" })).toBeVisible();
  });

  it("tracks the tab indicator during native horizontal scrolling", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    const viewport = getViewport();
    viewport.scrollLeft = PAGE_STEP / 2;
    fireEvent.scroll(viewport);

    expect(screen.getByTestId("tab-pager")).toHaveStyle({
      "--tab-position": "0.5",
    });
    expect(viewport).toHaveAttribute("data-scrolling", "true");
    expect(screen.getByRole("tabpanel", { name: "learning" })).toBeVisible();

    fireEvent(viewport, new Event("scrollend"));
    expect(screen.getByRole("tabpanel", { name: "practicing" })).toBeVisible();
    expect(viewport).toHaveAttribute("data-scrolling", "false");
  });

  it("preserves an independent vertical scroll position for every page", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    const learningPage = screen.getByRole("tabpanel", {
      name: "learning",
    }).parentElement as HTMLDivElement;
    const practicingPage = screen.getByRole("tabpanel", {
      name: "practicing",
      hidden: true,
    }).parentElement as HTMLDivElement;
    learningPage.scrollTop = 900;
    practicingPage.scrollTop = 0;

    scrollToPage(1);

    expect(learningPage.scrollTop).toBe(900);
    expect(practicingPage.scrollTop).toBe(0);
    expect(screen.getByRole("tabpanel", { name: "practicing" })).toBeVisible();

    practicingPage.scrollTop = 120;
    scrollToPage(0);

    expect(learningPage.scrollTop).toBe(900);
    expect(practicingPage.scrollTop).toBe(120);
  });

  it("removes text-input focus once horizontal scrolling starts", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    const input = screen.getByRole("textbox", { name: "learning search" });
    input.focus();
    expect(input).toHaveFocus();

    const viewport = getViewport();
    viewport.scrollLeft = 90;
    fireEvent.scroll(viewport);

    expect(input).not.toHaveFocus();
  });

  it("keeps the current tab when native snapping returns to its page", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    const viewport = getViewport();
    viewport.scrollLeft = 100;
    fireEvent.scroll(viewport);
    viewport.scrollLeft = 0;
    fireEvent.scroll(viewport);
    fireEvent(viewport, new Event("scrollend"));

    expect(screen.getByRole("tabpanel", { name: "learning" })).toBeVisible();
  });

  it("scrolls to a tab selected with the tab controls", () => {
    render(<Pager statuses={["learning", "practicing", "learned"]} />);

    const viewport = getViewport();
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Learned" }), {
      button: 0,
      ctrlKey: false,
    });

    expect(scrollTo).toHaveBeenLastCalledWith({
      behavior: "smooth",
      left: PAGE_STEP * 2,
    });
    expect(screen.getByRole("tabpanel", { name: "learned" })).toBeVisible();
  });

  it("supports a two-page flow without a practicing page", () => {
    render(<Pager statuses={["learning", "learned"]} />);

    scrollToPage(1);

    expect(screen.getByRole("tabpanel", { name: "learned" })).toBeVisible();
  });
});
