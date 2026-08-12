import { describe, expect, it } from "vitest";

import {
  canAutoScrollPracticingQueue,
  reorderPracticingItems,
} from "./practicing-queue";
import type { VocabularyItem } from "./vocabulary.types";
import styles from "./vocabulary-screen.module.css";

const items: VocabularyItem[] = ["1", "2", "3", "4"].map((id) => ({
  id,
  term: `phrase ${id}`,
  definition: `definition ${id}`,
  status: "practicing",
}));

describe("reorderPracticingItems", () => {
  it("auto-scrolls only the vertical tab page, not the horizontal pager", () => {
    const tabPage = document.createElement("div");
    tabPage.classList.add(styles.tabPage);
    const tabViewport = document.createElement("div");
    tabViewport.classList.add(styles.tabViewport);

    expect(canAutoScrollPracticingQueue(tabPage)).toBe(true);
    expect(canAutoScrollPracticingQueue(tabViewport)).toBe(false);
    expect(canAutoScrollPracticingQueue(document.documentElement)).toBe(false);
  });

  it("moves a phrase across the active-practice boundary", () => {
    expect(
      reorderPracticingItems(items, "4", "2").map((item) => item.id),
    ).toEqual(["1", "4", "2", "3"]);
  });

  it("leaves the queue untouched for a missing or unchanged target", () => {
    expect(reorderPracticingItems(items, "1", "1")).toBe(items);
    expect(reorderPracticingItems(items, "missing", "2")).toBe(items);
    expect(reorderPracticingItems(items, "1", "missing")).toBe(items);
  });
});
