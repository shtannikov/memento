import * as Tabs from "@radix-ui/react-tabs";

import styles from "./vocabulary-screen.module.css";
import type { VocabularyStatus } from "./vocabulary.types";

export function VocabularyTabs({
  activeTab,
  onChange,
}: {
  activeTab: VocabularyStatus;
  onChange: (tab: VocabularyStatus) => void;
}) {
  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(value) => onChange(value as VocabularyStatus)}
    >
      <Tabs.List
        className={styles.tabs}
        aria-label="Vocabulary status"
      >
        <Tabs.Trigger value="learning">Learning</Tabs.Trigger>
        <Tabs.Trigger value="learned">Learned</Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  );
}
