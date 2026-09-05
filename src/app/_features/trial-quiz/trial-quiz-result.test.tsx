import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrialQuizResult } from "./trial-quiz-result";

describe("TrialQuizResult", () => {
  it.each([true, false])(
    "leads every %s result to Telegram and offers another Trial",
    (success) => {
      const onRestart = vi.fn();
      const view = render(
        <TrialQuizResult
          success={success}
          accuracy={80}
          mistakes={success ? 2 : 3}
          completed={success ? 10 : 4}
          total={10}
          telegramUrl="https://t.me/stagebot?start=tiktok_trial"
          onRestart={onRestart}
        />,
      );
      const result = within(view.container);

      expect(
        result.getByRole("link", { name: "Continue in Telegram" }),
      ).toHaveAttribute(
        "href",
        "https://t.me/stagebot?start=tiktok_trial",
      );
      fireEvent.click(result.getByRole("button", { name: "Try again" }));
      expect(onRestart).toHaveBeenCalledOnce();
    },
  );
});
