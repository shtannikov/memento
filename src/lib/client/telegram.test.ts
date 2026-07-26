import { afterEach, describe, expect, it, vi } from "vitest";

import { initializeTelegram } from "./telegram";

afterEach(() => {
  globalThis.Telegram = undefined;
});

describe("initializeTelegram", () => {
  it("readies, expands, and requests fullscreen", () => {
    const ready = vi.fn();
    const expand = vi.fn();
    const requestFullscreen = vi.fn();
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready,
        expand,
        requestFullscreen,
      },
    };
    expect(initializeTelegram()).toBe("signed");
    expect(ready).toHaveBeenCalledOnce();
    expect(expand).toHaveBeenCalledOnce();
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it("fails clearly outside Telegram", () => {
    expect(() => initializeTelegram()).toThrow("Open Memento");
  });
});
