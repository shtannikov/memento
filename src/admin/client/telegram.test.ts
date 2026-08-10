import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeAdminTelegram } from "./telegram";

afterEach(() => {
  delete (globalThis as unknown as { Telegram?: unknown }).Telegram;
});

describe("admin Telegram client", () => {
  it("initializes the Mini App in fullscreen and returns signed init data", () => {
    const ready = vi.fn();
    const expand = vi.fn();
    const requestFullscreen = vi.fn();
    (globalThis as unknown as { Telegram: unknown }).Telegram = {
      WebApp: {
        initData: " signed-admin-data ",
        ready,
        expand,
        requestFullscreen,
      },
    };

    expect(initializeAdminTelegram()).toBe("signed-admin-data");
    expect(ready).toHaveBeenCalledOnce();
    expect(expand).toHaveBeenCalledOnce();
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it("keeps expanded mode on Telegram clients before fullscreen support", () => {
    const expand = vi.fn();
    const requestFullscreen = vi.fn();
    (globalThis as unknown as { Telegram: unknown }).Telegram = {
      WebApp: {
        initData: "signed-admin-data",
        ready: vi.fn(),
        expand,
        requestFullscreen,
        isVersionAtLeast: () => false,
      },
    };

    expect(initializeAdminTelegram()).toBe("signed-admin-data");
    expect(expand).toHaveBeenCalledOnce();
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("refuses to run outside the admin Telegram bot", () => {
    expect(() => initializeAdminTelegram()).toThrow("Open Memento Admin");
  });
});
