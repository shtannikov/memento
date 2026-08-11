import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DIALOG_BACKDROP_SOLID,
  initializeTelegram,
  setTelegramColor,
} from "./telegram";

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
    expect(initializeTelegram("Memento")).toBe("signed");
    expect(ready).toHaveBeenCalledOnce();
    expect(expand).toHaveBeenCalledOnce();
    expect(requestFullscreen).toHaveBeenCalledOnce();
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
});
