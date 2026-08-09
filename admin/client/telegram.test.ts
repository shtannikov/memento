import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeAdminTelegram } from "./telegram";

afterEach(() => {
  delete (globalThis as unknown as { Telegram?: unknown }).Telegram;
});

describe("admin Telegram client", () => {
  it("initializes the Mini App and returns signed init data", () => {
    const ready = vi.fn();
    const expand = vi.fn();
    (globalThis as unknown as { Telegram: unknown }).Telegram = {
      WebApp: { initData: " signed-admin-data ", ready, expand },
    };

    expect(initializeAdminTelegram()).toBe("signed-admin-data");
    expect(ready).toHaveBeenCalledOnce();
    expect(expand).toHaveBeenCalledOnce();
  });

  it("refuses to run outside the admin Telegram bot", () => {
    expect(() => initializeAdminTelegram()).toThrow("Open Memento Admin");
  });
});
