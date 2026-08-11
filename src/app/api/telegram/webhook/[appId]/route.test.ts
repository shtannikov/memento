// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { handleTelegramWebhook } = vi.hoisted(() => ({
  handleTelegramWebhook: vi.fn(),
}));

vi.mock("@/app/_server/telegram/route", () => ({ handleTelegramWebhook }));

import { POST } from "./route";

describe("language Telegram webhook route", () => {
  beforeEach(() => {
    handleTelegramWebhook.mockReset();
    handleTelegramWebhook.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it("dispatches a registered non-English language", async () => {
    const request = new Request("https://example.test/api/telegram/webhook/cz", {
      method: "POST",
    });
    const response = await POST(request, {
      params: Promise.resolve({ appId: "cz" }),
    });

    expect(response.status).toBe(200);
    expect(handleTelegramWebhook).toHaveBeenCalledWith(request, "cz");
  });

  it("rejects unknown and legacy-English dynamic routes", async () => {
    const request = new Request("https://example.test/api/telegram/webhook/no", {
      method: "POST",
    });
    expect(
      (await POST(request, { params: Promise.resolve({ appId: "no" }) })).status,
    ).toBe(404);
    expect(
      (await POST(request, { params: Promise.resolve({ appId: "en" }) })).status,
    ).toBe(404);
    expect(handleTelegramWebhook).not.toHaveBeenCalled();
  });
});
