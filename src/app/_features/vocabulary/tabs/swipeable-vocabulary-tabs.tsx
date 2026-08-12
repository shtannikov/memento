import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";

import styles from "../vocabulary-screen.module.css";
import type { VocabularyStatus } from "../vocabulary.types";
import { VocabularyTabs } from "./vocabulary-tabs";

const TAB_SWIPE_AXIS_RATIO = 1.25;
const TAB_SWIPE_LOCK_DISTANCE = 8;
const TAB_SWIPE_MIN_FLICK_DISTANCE = 50;
const TAB_SWIPE_MAX_SETTLE_DISTANCE = 90;
const TAB_SWIPE_VELOCITY = 0.5;
const TAB_SWIPE_EDGE_RESISTANCE = 0.24;
const TAB_PAGE_GUTTER = 24;

type TabSwipe = {
  axis: "pending" | "horizontal" | "vertical";
  dragStarted: boolean;
  startX: number;
  startY: number;
  startedAt: number;
  width: number;
};

function resolveSwipeAxis(deltaX: number, deltaY: number): TabSwipe["axis"] {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < TAB_SWIPE_LOCK_DISTANCE) {
    return "pending";
  }

  return Math.abs(deltaX) > Math.abs(deltaY) * TAB_SWIPE_AXIS_RATIO
    ? "horizontal"
    : "vertical";
}

export type SwipeableVocabularyTabPage = {
  value: VocabularyStatus;
  content: ReactNode;
};

export function SwipeableVocabularyTabs({
  activeTab,
  pages,
  onChange,
  getScrollTop,
  restoreScrollTop,
}: {
  activeTab: VocabularyStatus;
  pages: readonly SwipeableVocabularyTabPage[];
  onChange: (tab: VocabularyStatus) => void;
  getScrollTop?: () => number;
  restoreScrollTop?: (scrollTop: number) => void;
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragWidth, setDragWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pagerRef = useRef<HTMLDivElement>(null);
  const pendingScrollTopRef = useRef<number | null>(null);
  const swipeRef = useRef<TabSwipe | null>(null);
  const activeIndex = pages.findIndex((page) => page.value === activeTab);
  const indicatorPosition = Math.min(
    pages.length - 1,
    Math.max(
      0,
      activeIndex -
        (dragWidth ? dragOffset / (dragWidth + TAB_PAGE_GUTTER) : 0),
    ),
  );

  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;

    function preventScrollDuringHorizontalSwipe(event: globalThis.TouchEvent) {
      const swipe = swipeRef.current;
      const touch = event.touches[0];
      if (!swipe || !touch || swipe.axis === "vertical") return;

      if (swipe.axis === "pending") {
        swipe.axis = resolveSwipeAxis(
          touch.clientX - swipe.startX,
          touch.clientY - swipe.startY,
        );
      }

      if (swipe.axis === "horizontal" && event.cancelable) {
        event.preventDefault();
      }
    }

    pager.addEventListener("touchmove", preventScrollDuringHorizontalSwipe, {
      passive: false,
    });
    return () => {
      pager.removeEventListener("touchmove", preventScrollDuringHorizontalSwipe);
    };
  }, []);

  useLayoutEffect(() => {
    const scrollTop = pendingScrollTopRef.current;
    if (scrollTop === null) return;

    pendingScrollTopRef.current = null;
    restoreScrollTop?.(scrollTop);
  }, [activeTab, restoreScrollTop]);

  function resetSwipe() {
    swipeRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  }

  function settleOnTab(tab: VocabularyStatus) {
    if (tab !== activeTab) {
      pendingScrollTopRef.current = getScrollTop?.() ?? null;
    }
    resetSwipe();
    onChange(tab);
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    swipeRef.current = null;
    if (event.touches.length !== 1) return;
    if (
      event.target instanceof Element &&
      event.target.closest("button, input, textarea, select, a, [role='button']")
    ) {
      return;
    }

    const touch = event.touches[0];
    const width =
      event.currentTarget.clientWidth || globalThis.innerWidth || 320;
    swipeRef.current = {
      axis: "pending",
      dragStarted: false,
      startX: touch.clientX,
      startY: touch.clientY,
      startedAt: Date.now(),
      width,
    };
    setDragWidth(width);
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    const touch = event.touches[0];
    if (!swipe || !touch || swipe.axis === "vertical") return;

    const deltaX = touch.clientX - swipe.startX;
    const deltaY = touch.clientY - swipe.startY;
    if (swipe.axis === "pending") {
      swipe.axis = resolveSwipeAxis(deltaX, deltaY);
    }
    if (swipe.axis !== "horizontal") return;

    if (!swipe.dragStarted) {
      swipe.dragStarted = true;
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        event.currentTarget.contains(activeElement) &&
        activeElement.matches("input, textarea, [contenteditable='true']")
      ) {
        activeElement.blur();
      }
      setIsDragging(true);
    }

    const pullingPastStart = activeIndex === 0 && deltaX > 0;
    const pullingPastEnd = activeIndex === pages.length - 1 && deltaX < 0;
    setDragOffset(
      pullingPastStart || pullingPastEnd
        ? deltaX * TAB_SWIPE_EDGE_RESISTANCE
        : deltaX,
    );
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    swipeRef.current = null;
    const touch = event.changedTouches[0];
    if (!swipe || !touch) {
      resetSwipe();
      return;
    }

    const deltaX = touch.clientX - swipe.startX;
    const deltaY = touch.clientY - swipe.startY;
    const horizontalDistance = Math.abs(deltaX);
    const isHorizontal =
      swipe.axis === "horizontal" ||
      (swipe.axis === "pending" &&
        horizontalDistance >= Math.abs(deltaY) * TAB_SWIPE_AXIS_RATIO);
    const elapsed = Math.max(1, Date.now() - swipe.startedAt);
    const settleDistance = Math.min(
      (swipe.width + TAB_PAGE_GUTTER) * 0.22,
      TAB_SWIPE_MAX_SETTLE_DISTANCE,
    );
    const shouldChangeTab =
      isHorizontal &&
      (horizontalDistance >= settleDistance ||
        (horizontalDistance >= TAB_SWIPE_MIN_FLICK_DISTANCE &&
          horizontalDistance / elapsed >= TAB_SWIPE_VELOCITY));
    const targetTab = shouldChangeTab
      ? pages[activeIndex + (deltaX < 0 ? 1 : -1)]?.value
      : undefined;

    if (targetTab) {
      settleOnTab(targetTab);
    } else {
      resetSwipe();
    }
  }

  return (
    <div
      ref={pagerRef}
      className={styles.tabPager}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetSwipe}
    >
      <VocabularyTabs
        activeTab={activeTab}
        onChange={settleOnTab}
        tabCount={pages.length}
        indicatorPosition={indicatorPosition}
        dragging={isDragging}
      />
      <div className={styles.tabViewport} data-dragging={isDragging}>
        {pages.map((page, index) => {
          const isActive = page.value === activeTab;
          const pageOffset = index - activeIndex;
          return (
            <div
              key={page.value}
              className={`${styles.tabPage} ${
                isActive ? styles.tabPageActive : ""
              }`}
              style={{
                transform: `translate3d(calc(${pageOffset * 100}% + ${pageOffset * TAB_PAGE_GUTTER}px + ${dragOffset}px), 0, 0)`,
              }}
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
