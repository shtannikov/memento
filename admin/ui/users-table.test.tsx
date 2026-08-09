import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AdminUserAppRow } from "./admin.types";
import { UsersTable } from "./users-table";

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
  quizFailuresTotal: 3,
  quizFailuresToday: 1,
  lastQuizCompletedAt: null,
  speakingCompleted: 2,
  speakingFailuresTotal: 1,
  speakingFailuresToday: 0,
  lastSpeakingCompletedAt: null,
  quizAttemptsToday: 4,
  speakingAttemptsToday: 1,
};

describe("admin users table", () => {
  it("shows one user-app row and reveals its reset action", () => {
    const onToggle = vi.fn();
    const onReset = vi.fn();
    const { rerender } = render(
      <UsersTable
        rows={[row]}
        expandedKey={null}
        onToggle={onToggle}
        onReset={onReset}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ada Lovelace/i }));
    expect(onToggle).toHaveBeenCalledWith("42:en");

    rerender(
      <UsersTable
        rows={[row]}
        expandedKey="42:en"
        onToggle={onToggle}
        onReset={onReset}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset limits" }));
    expect(onReset).toHaveBeenCalledWith(row);
    expect(screen.getByText("12 total")).toBeInTheDocument();
    expect(screen.queryByText("Telegram ID")).not.toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Quizzes" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Speaking" })).toBeInTheDocument();
    expect(screen.getAllByText("Failed")).toHaveLength(2);
  });
});
