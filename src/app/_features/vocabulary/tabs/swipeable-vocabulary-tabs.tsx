import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";

import styles from "../vocabulary-screen.module.css";
import type { VocabularyStatus } from "../vocabulary.types";
import { VocabularyTabs } from "./vocabulary-tabs";

const TAB_PAGE_GUTTER = 24;
const TAB_SCROLL_SETTLE_DELAY_MS = 120;

export type SwipeableVocabularyTabPage = {
  value: VocabularyStatus;
  content: ReactNode;
};

export function SwipeableVocabularyTabs({
  activeTab,
  pages,
  onChange,
}: {
  activeTab: VocabularyStatus;
  pages: readonly SwipeableVocabularyTabPage[];
  onChange: (tab: VocabularyStatus) => void;
}) {
  const activeIndex = pages.findIndex((page) => page.value === activeTab);
  const [indicatorPosition, setIndicatorPosition] = useState(activeIndex);
  const [isScrolling, setIsScrolling] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPositionedViewportRef = useRef(false);

  function pageStep(viewport: HTMLDivElement) {
    return viewport.clientWidth + TAB_PAGE_GUTTER;
  }

  function pagePosition(viewport: HTMLDivElement) {
    const step = pageStep(viewport);
    if (!step) return 0;

    return Math.min(
      pages.length - 1,
      Math.max(0, viewport.scrollLeft / step),
    );
  }

  function settleScroll(viewport: HTMLDivElement) {
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }

    const index = Math.round(pagePosition(viewport));
    const destination = pages[index];
    setIndicatorPosition(index);
    setIsScrolling(false);
    if (destination && destination.value !== activeTab) {
      onChange(destination.value);
    }
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const viewport = event.currentTarget;
    setIndicatorPosition(pagePosition(viewport));
    setIsScrolling(true);

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      viewport.contains(activeElement) &&
      activeElement.matches("input, textarea, [contenteditable='true']")
    ) {
      activeElement.blur();
    }

    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = setTimeout(
      () => settleScroll(viewport),
      TAB_SCROLL_SETTLE_DELAY_MS,
    );
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || activeIndex < 0) return;

    const left = activeIndex * pageStep(viewport);
    const behavior = hasPositionedViewportRef.current ? "smooth" : "auto";
    hasPositionedViewportRef.current = true;
    setIndicatorPosition(activeIndex);

    if (typeof viewport.scrollTo === "function") {
      viewport.scrollTo({ left, behavior });
    } else {
      viewport.scrollLeft = left;
    }
  }, [activeIndex]);

  useEffect(
    () => () => {
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    },
    [],
  );

  return (
    <div className={styles.tabPager}>
      <VocabularyTabs
        activeTab={activeTab}
        onChange={onChange}
        tabCount={pages.length}
        indicatorPosition={indicatorPosition}
        dragging={isScrolling}
      />
      <div
        ref={viewportRef}
        className={styles.tabViewport}
        data-scrolling={isScrolling}
        data-testid="tab-viewport"
        onScroll={handleScroll}
      >
        {pages.map((page) => {
          const isActive = page.value === activeTab;
          return (
            <div
              key={page.value}
              className={`${styles.tabPage} ${
                isActive ? styles.tabPageActive : ""
              }`}
              aria-hidden={!isActive}
              inert={!isActive}
            >
              {page.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
