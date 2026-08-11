import { fireEvent, render, screen, within } from "@testing-library/react";
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
  quizzesCompletedToday: 1,
  lastQuizCompletedAt: null,
  speakingCompleted: 2,
  speakingCompletedToday: 0,
  lastSpeakingCompletedAt: null,
  quizGenerationsToday: 4,
  speakingGenerationsToday: 1,
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
    expect(screen.getByText("8 completed")).toBeInTheDocument();
    expect(screen.getByText("1 completed · 4/5 generated")).toBeInTheDocument();
    expect(screen.getByText("0 completed · 1/5 generated")).toBeInTheDocument();
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
    expect(screen.getByText(/Aug 1, 2026/)).toHaveAttribute(
      "data-emphasized",
      "true",
    );
    expect(screen.queryByText("Never completed")).not.toBeInTheDocument();
  });

  it("marks speaking activity unavailable for an app without speaking", () => {
    const { container } = render(
      <UsersTable
        rows={[{ ...row, appId: "cz" }]}
        expandedKey="42:cz"
        onToggle={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const speaking = within(container).getByRole("region", { name: "Speaking" });
    expect(speaking).toHaveTextContent("Not available");
    expect(speaking).not.toHaveTextContent("generated");
  });
});
