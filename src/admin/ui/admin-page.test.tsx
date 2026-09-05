import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminClientError, loadAdminUsers } from "@admin/client/api";
import { initializeAdminTelegram } from "@admin/client/telegram";
import { AdminPage } from "./admin-page";

vi.mock("@admin/client/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@admin/client/api")>();
  return {
    ...original,
    loadAdminUsers: vi.fn(),
    resetAdminLimits: vi.fn(),
  };
});

vi.mock("@admin/client/telegram", () => ({
  initializeAdminTelegram: vi.fn(),
}));

const initialize = vi.mocked(initializeAdminTelegram);
const load = vi.mocked(loadAdminUsers);

afterEach(cleanup);

describe("AdminPage access gate", () => {
  beforeEach(() => {
    initialize.mockReset();
    load.mockReset();
  });

  it("shows the public fallback outside Telegram without revealing admin UI", async () => {
    initialize.mockReturnValue(null);

    render(<AdminPage publicFallback={<h1>Meet Pomněnka.</h1>} />);

    expect(
      await screen.findByRole("heading", { name: "Meet Pomněnka." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Admin" })).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it("reveals the admin interface only after authenticated data loads", async () => {
    initialize.mockReturnValue("signed-admin-data");
    load.mockResolvedValue([]);

    render(<AdminPage publicFallback={<h1>Page not found</h1>} />);

    expect(
      await screen.findByRole("heading", { name: "Admin" }),
    ).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("signed-admin-data");
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
  });

  it("returns unauthorized Telegram users to the public fallback", async () => {
    initialize.mockReturnValue("signed-non-admin-data");
    load.mockRejectedValue(new AdminClientError("FORBIDDEN", "Access denied.", 403));

    render(<AdminPage publicFallback={<h1>Page not found</h1>} />);

    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Admin" })).not.toBeInTheDocument();
    });
  });
});
