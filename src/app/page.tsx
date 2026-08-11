import { MementoApp } from "@/app/memento-app";
import { ENGLISH_LANGUAGE } from "@/app/_languages/en";

export default function Page() {
  return (
    <MementoApp
      appId={ENGLISH_LANGUAGE.id}
      appName={ENGLISH_LANGUAGE.appName}
      speakingEnabled={Boolean(ENGLISH_LANGUAGE.speaking)}
    />
  );
}
