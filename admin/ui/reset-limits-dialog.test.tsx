import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminUserAppRow } from "./admin.types";
import { ResetLimitsDialog } from "./reset-limits-dialog";

const row: AdminUserAppRow = {
  telegramUserId: 42,
  appId: "en",
  username: "ada",
  firstName: "Ada",
  lastName: "Lovelace",
  joinedAt: "2026-08-01T10:00:00Z",
  lastUsedAt: "2026-08-09T10:00:00Z",
  vocabularyTotal: 12,
  vocabularyLearning: 5,
  vocabularyPracticing: 4,
  vocabularyLearned: 3,
  quizzesCompleted: 8,
  lastQuizCompletedAt: null,
  speakingCompleted: 2,
  lastSpeakingCompletedAt: null,
  quizAttemptsToday: 4,
  speakingAttemptsToday: 1,
};

describe("reset limits dialog", () => {
  it("identifies the user and app without exposing the Telegram ID", () => {
    render(
      <ResetLimitsDialog
        row={row}
        pending={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Ada Lovelace · Memento")).toBeInTheDocument();
    expect(screen.queryByText(/Telegram ID/i)).not.toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
    expect(
      screen.getByText("Resetting limits doesn’t delete data."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Words, rounds/i)).not.toBeInTheDocument();
  });
});
