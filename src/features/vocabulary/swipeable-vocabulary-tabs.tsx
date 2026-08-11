import {
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";

import styles from "./vocabulary-screen.module.css";
import { VocabularyTabs } from "./vocabulary-tabs";
import type { VocabularyStatus } from "./vocabulary.types";

const TAB_SWIPE_AXIS_RATIO = 1.25;
const TAB_SWIPE_LOCK_DISTANCE = 8;
const TAB_SWIPE_MIN_FLICK_DISTANCE = 50;
const TAB_SWIPE_MAX_SETTLE_DISTANCE = 90;
const TAB_SWIPE_VELOCITY = 0.5;
const TAB_SWIPE_EDGE_RESISTANCE = 0.24;
const TAB_PAGE_GUTTER = 16;

type TabSwipe = {
  axis: "pending" | "horizontal" | "vertical";
  startX: number;
  startY: number;
  startedAt: number;
  width: number;
};

export function SwipeableVocabularyTabs({
  activeTab,
  tabs,
  speakingEnabled,
  onChange,
  children,
}: {
  activeTab: VocabularyStatus;
  tabs: VocabularyStatus[];
  speakingEnabled: boolean;
  onChange: (tab: VocabularyStatus) => void;
  children: ReactNode[];
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragWidth, setDragWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const swipeRef = useRef<TabSwipe | null>(null);
  const activeIndex = tabs.indexOf(activeTab);
  const indicatorPosition = Math.min(
    tabs.length - 1,
    Math.max(
      0,
      activeIndex -
        (dragWidth ? dragOffset / (dragWidth + TAB_PAGE_GUTTER) : 0),
    ),
  );

  function resetSwipe() {
    swipeRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  }

  function settleOnTab(tab: VocabularyStatus) {
    resetSwipe();
    onChange(tab);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
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
      startX: touch.clientX,
      startY: touch.clientY,
      startedAt: Date.now(),
      width,
    };
    setDragWidth(width);
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    const touch = event.touches[0];
    if (!swipe || !touch || swipe.axis === "vertical") return;

    const deltaX = touch.clientX - swipe.startX;
    const deltaY = touch.clientY - swipe.startY;
    if (swipe.axis === "pending") {
      if (
        Math.max(Math.abs(deltaX), Math.abs(deltaY)) <
        TAB_SWIPE_LOCK_DISTANCE
      ) {
        return;
      }
      swipe.axis =
        Math.abs(deltaX) > Math.abs(deltaY) * TAB_SWIPE_AXIS_RATIO
          ? "horizontal"
          : "vertical";
      if (swipe.axis === "vertical") return;
      setIsDragging(true);
    }

    const pullingPastStart = activeIndex === 0 && deltaX > 0;
    const pullingPastEnd = activeIndex === tabs.length - 1 && deltaX < 0;
    setDragOffset(
      pullingPastStart || pullingPastEnd
        ? deltaX * TAB_SWIPE_EDGE_RESISTANCE
        : deltaX,
    );
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
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
      ? tabs[activeIndex + (deltaX < 0 ? 1 : -1)]
      : undefined;

    if (targetTab) {
      settleOnTab(targetTab);
    } else {
      resetSwipe();
    }
  }

  return (
    <div
      className={styles.tabPager}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetSwipe}
    >
      <VocabularyTabs
        activeTab={activeTab}
        onChange={settleOnTab}
        speakingEnabled={speakingEnabled}
        indicatorPosition={indicatorPosition}
        dragging={isDragging}
      />
      <div className={styles.tabViewport} data-dragging={isDragging}>
        {tabs.map((tab, index) => {
          const isActive = tab === activeTab;
          const pageOffset = index - activeIndex;
          return (
            <div
              key={tab}
              className={`${styles.tabPage} ${
                isActive ? styles.tabPageActive : ""
              }`}
              style={{
                transform: `translate3d(calc(${pageOffset * 100}% + ${pageOffset * TAB_PAGE_GUTTER}px + ${dragOffset}px), 0, 0)`,
              }}
              aria-hidden={!isActive}
              inert={!isActive}
            >
              {children[index]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
