import * as Tabs from "@radix-ui/react-tabs";
import type { CSSProperties } from "react";

import styles from "../vocabulary-screen.module.css";
import type { VocabularyStatus } from "../vocabulary.types";

export function VocabularyTabs({
  activeTab,
  onChange,
  tabCount,
}: {
  activeTab: VocabularyStatus;
  onChange: (tab: VocabularyStatus) => void;
  tabCount: number;
}) {
  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(value) => onChange(value as VocabularyStatus)}
    >
      <Tabs.List
        className={styles.tabs}
        aria-label="Vocabulary status"
        data-dragging="false"
        style={
          {
            "--tab-count": tabCount,
          } as CSSProperties
        }
      >
        <span className={styles.tabIndicator} aria-hidden="true" />
        <Tabs.Trigger
          value="learning"
          data-visual-state={activeTab === "learning" ? "active" : "inactive"}
        >
          Learning
        </Tabs.Trigger>
        {tabCount === 3 && (
          <Tabs.Trigger
            value="practicing"
            data-visual-state={
              activeTab === "practicing" ? "active" : "inactive"
            }
          >
            Practicing
          </Tabs.Trigger>
        )}
        <Tabs.Trigger
          value="learned"
          data-visual-state={activeTab === "learned" ? "active" : "inactive"}
        >
          Learned
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  );
}
