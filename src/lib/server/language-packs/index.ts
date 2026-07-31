import type { AppId } from "@/lib/domain/app";
import {
  buildCzechQuizPrompt,
  CZECH_GRADER_PROMPT,
  CZECH_QUIZ_SYSTEM_PROMPT,
} from "./cz";
import {
  buildEnglishQuizPrompt,
  ENGLISH_GRADER_PROMPT,
  ENGLISH_QUIZ_SYSTEM_PROMPT,
} from "./en";

export function getLanguagePack(appId: AppId) {
  return appId === "cz"
    ? {
        buildQuizPrompt: buildCzechQuizPrompt,
        graderPrompt: CZECH_GRADER_PROMPT,
        quizSystemPrompt: CZECH_QUIZ_SYSTEM_PROMPT,
      }
    : {
        buildQuizPrompt: buildEnglishQuizPrompt,
        graderPrompt: ENGLISH_GRADER_PROMPT,
        quizSystemPrompt: ENGLISH_QUIZ_SYSTEM_PROMPT,
      };
}
