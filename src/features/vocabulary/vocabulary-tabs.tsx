import * as Tabs from "@radix-ui/react-tabs";
import type { CSSProperties } from "react";

import styles from "./vocabulary-screen.module.css";
import type { VocabularyStatus } from "./vocabulary.types";

export function VocabularyTabs({
  activeTab,
  onChange,
  speakingEnabled,
  indicatorPosition,
  dragging,
}: {
  activeTab: VocabularyStatus;
  onChange: (tab: VocabularyStatus) => void;
  speakingEnabled: boolean;
  indicatorPosition: number;
  dragging: boolean;
}) {
  const tabCount = speakingEnabled ? 3 : 2;

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(value) => onChange(value as VocabularyStatus)}
    >
      <Tabs.List
        className={styles.tabs}
        aria-label="Vocabulary status"
        data-dragging={dragging}
        style={
          {
            "--tab-count": tabCount,
            "--tab-position": indicatorPosition,
          } as CSSProperties
        }
      >
        <span className={styles.tabIndicator} aria-hidden="true" />
        <Tabs.Trigger value="learning">Learning</Tabs.Trigger>
        {speakingEnabled && (
          <Tabs.Trigger value="practicing">Practicing</Tabs.Trigger>
        )}
        <Tabs.Trigger value="learned">Learned</Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  );
}
