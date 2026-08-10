import { describe, expect, it, vi } from "vitest";

const { authenticate, load } = vi.hoisted(() => ({
  authenticate: vi.fn(),
  load: vi.fn(),
}));

vi.mock("../auth", () => ({ authenticateAdminRequest: authenticate }));
vi.mock("../statistics", () => ({ loadAdminStatistics: load }));

import { GET } from "./list-users";

describe("admin user list route", () => {
  it("authenticates before returning the database-ordered rows", async () => {
    authenticate.mockResolvedValueOnce({ id: 7 });
    load.mockResolvedValueOnce([{ telegramUserId: 42, appId: "en" }]);

    const response = await GET(new Request("https://example.test/api/admin/users"));

    expect(response.status).toBe(200);
    expect(authenticate).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      users: [{ telegramUserId: 42, appId: "en" }],
    });
  });
});
