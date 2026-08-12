import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from "react";

import styles from "../vocabulary-screen.module.css";
import type { VocabularyStatus } from "../vocabulary.types";
import { VocabularyTabs } from "./vocabulary-tabs";

const TAB_PAGE_GUTTER = 24;

export type SwipeableVocabularyTabPage = {
  value: VocabularyStatus;
  content: ReactNode;
};

export function SwipeableVocabularyTabs({
  activeTab,
  pages,
  onChange,
  onProgress,
}: {
  activeTab: VocabularyStatus;
  pages: readonly SwipeableVocabularyTabPage[];
  onChange: (tab: VocabularyStatus) => void;
  onProgress?: (position: number) => void;
}) {
  const activeIndex = pages.findIndex((page) => page.value === activeTab);
  const [initialIndex] = useState(activeIndex);
  const pagerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasPositionedViewportRef = useRef(false);

  const setIndicatorPosition = useCallback(
    (position: number) => {
      const pager = pagerRef.current;
      pager?.style.setProperty("--tab-position", String(position));
      const visualIndex = Math.round(position);
      pager?.querySelectorAll<HTMLElement>("[role='tab']").forEach((tab, index) => {
        tab.dataset.visualState = index === visualIndex ? "active" : "inactive";
      });
      onProgress?.(position);
    },
    [onProgress],
  );

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
    const index = Math.round(pagePosition(viewport));
    const destination = pages[index];
    setIndicatorPosition(index);
    setScrolling(false, viewport);
    if (destination && destination.value !== activeTab) {
      onChange(destination.value);
    }
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const viewport = event.currentTarget;
    setIndicatorPosition(pagePosition(viewport));
    setScrolling(true, viewport);

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      viewport.contains(activeElement) &&
      activeElement.matches("input, textarea, [contenteditable='true']")
    ) {
      activeElement.blur();
    }
  }

  function setScrolling(scrolling: boolean, viewport: HTMLDivElement) {
    viewport.dataset.scrolling = String(scrolling);
    const tabList = pagerRef.current?.querySelector<HTMLElement>("[role='tablist']");
    if (tabList) tabList.dataset.dragging = String(scrolling);
  }

  function handlePageScroll(event: UIEvent<HTMLDivElement>) {
    event.currentTarget.dataset.scrolled = String(
      event.currentTarget.scrollTop > 2,
    );
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || activeIndex < 0) return;

    const left = activeIndex * pageStep(viewport);
    const behavior = hasPositionedViewportRef.current ? "smooth" : "auto";
    hasPositionedViewportRef.current = true;
    if (Math.abs(viewport.scrollLeft - left) < 1) {
      setIndicatorPosition(activeIndex);
      return;
    }

    if (typeof viewport.scrollTo === "function") {
      viewport.scrollTo({ left, behavior });
    } else {
      viewport.scrollLeft = left;
    }
  }, [activeIndex, setIndicatorPosition]);

  return (
    <div
      ref={pagerRef}
      className={styles.tabPager}
      data-testid="tab-pager"
      style={
        {
          "--tab-position": initialIndex,
        } as CSSProperties
      }
    >
      <VocabularyTabs
        activeTab={activeTab}
        onChange={onChange}
        tabCount={pages.length}
      />
      <div
        ref={viewportRef}
        className={styles.tabViewport}
        data-scrolling="false"
        data-testid="tab-viewport"
        onScroll={handleScroll}
        onScrollEnd={(event) => settleScroll(event.currentTarget)}
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
              data-scrolled="false"
              onScroll={handlePageScroll}
            >
              {page.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
