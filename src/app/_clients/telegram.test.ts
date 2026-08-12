import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DIALOG_BACKDROP_SOLID,
  initializeTelegram,
  setTelegramColor,
  setTelegramVerticalSwipes,
} from "./telegram";

afterEach(() => {
  globalThis.Telegram = undefined;
});

describe("initializeTelegram", () => {
  it("readies, expands, enables vertical swipes, and requests fullscreen", () => {
    const ready = vi.fn();
    const expand = vi.fn();
    const enableVerticalSwipes = vi.fn();
    const requestFullscreen = vi.fn();
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready,
        expand,
        enableVerticalSwipes,
        requestFullscreen,
      },
    };
    expect(initializeTelegram("Memento")).toBe("signed");
    expect(ready).toHaveBeenCalledOnce();
    expect(expand).toHaveBeenCalledOnce();
    expect(enableVerticalSwipes).toHaveBeenCalledOnce();
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it("keeps older Telegram clients usable", () => {
    const enableVerticalSwipes = vi.fn();
    const requestFullscreen = vi.fn();
    const isVersionAtLeast = vi.fn(() => false);
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready: vi.fn(),
        expand: vi.fn(),
        enableVerticalSwipes,
        requestFullscreen,
        isVersionAtLeast,
      },
    };

    expect(initializeTelegram("Memento")).toBe("signed");
    expect(isVersionAtLeast).toHaveBeenCalledWith("7.7");
    expect(isVersionAtLeast).toHaveBeenCalledWith("8.0");
    expect(enableVerticalSwipes).not.toHaveBeenCalled();
    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("ignores unsupported Telegram method failures", () => {
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready: vi.fn(),
        expand: vi.fn(),
        enableVerticalSwipes: vi.fn(() => {
          throw new Error("unsupported");
        }),
        requestFullscreen: vi.fn(() => {
          throw new Error("unsupported");
        }),
      },
    };

    expect(initializeTelegram("Memento")).toBe("signed");
  });

  it("fails clearly outside Telegram", () => {
    expect(() => initializeTelegram("Memento")).toThrow("Open Memento");
    expect(() => initializeTelegram("Pomněnka")).toThrow("Open Pomněnka");
  });

  it("keeps Telegram chrome and the document theme color in sync", () => {
    const themeColor = document.createElement("meta");
    themeColor.name = "theme-color";
    themeColor.content = "#ffffff";
    document.head.append(themeColor);
    const setBackgroundColor = vi.fn();
    const setHeaderColor = vi.fn();
    const setBottomBarColor = vi.fn();
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready: vi.fn(),
        expand: vi.fn(),
        setBackgroundColor,
        setHeaderColor,
        setBottomBarColor,
      },
    };

    setTelegramColor(DIALOG_BACKDROP_SOLID);

    expect(themeColor).toHaveAttribute(
      "content",
      DIALOG_BACKDROP_SOLID,
    );
    expect(setBackgroundColor).toHaveBeenCalledWith(
      DIALOG_BACKDROP_SOLID,
    );
    expect(setHeaderColor).toHaveBeenCalledWith(
      DIALOG_BACKDROP_SOLID,
    );
    expect(setBottomBarColor).toHaveBeenCalledWith(
      DIALOG_BACKDROP_SOLID,
    );
    themeColor.remove();
  });

  it("controls Telegram vertical swipes when supported", () => {
    const disableVerticalSwipes = vi.fn();
    const enableVerticalSwipes = vi.fn();
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready: vi.fn(),
        expand: vi.fn(),
        disableVerticalSwipes,
        enableVerticalSwipes,
      },
    };

    setTelegramVerticalSwipes(false);
    expect(disableVerticalSwipes).toHaveBeenCalledOnce();
    expect(enableVerticalSwipes).not.toHaveBeenCalled();

    setTelegramVerticalSwipes(true);
    expect(enableVerticalSwipes).toHaveBeenCalledOnce();
  });

  it("ignores unavailable or failing vertical swipe controls", () => {
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready: vi.fn(),
        expand: vi.fn(),
        disableVerticalSwipes: vi.fn(() => {
          throw new Error("unsupported");
        }),
        isVersionAtLeast: vi.fn(() => false),
      },
    };

    expect(() => setTelegramVerticalSwipes(true)).not.toThrow();
    expect(() => setTelegramVerticalSwipes(false)).not.toThrow();
  });
});
