import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DIALOG_BACKDROP_SOLID,
  initializeTelegram,
  registerTelegramBackButton,
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

  it("registers and cleans up the native Telegram back button", () => {
    const onBack = vi.fn();
    const onClick = vi.fn();
    const offClick = vi.fn();
    const show = vi.fn();
    const hide = vi.fn();
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready: vi.fn(),
        expand: vi.fn(),
        BackButton: { onClick, offClick, show, hide },
      },
    };

    const cleanup = registerTelegramBackButton(onBack);

    expect(onClick).toHaveBeenCalledWith(onBack);
    expect(show).toHaveBeenCalledOnce();

    cleanup();
    expect(offClick).toHaveBeenCalledWith(onBack);
    expect(hide).toHaveBeenCalledOnce();
  });

  it("keeps unsupported or failing back-button bridges usable", () => {
    const unsupportedShow = vi.fn();
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready: vi.fn(),
        expand: vi.fn(),
        isVersionAtLeast: vi.fn(() => false),
        BackButton: {
          onClick: vi.fn(),
          offClick: vi.fn(),
          show: unsupportedShow,
          hide: vi.fn(),
        },
      },
    };

    expect(() => registerTelegramBackButton(vi.fn())()).not.toThrow();
    expect(unsupportedShow).not.toHaveBeenCalled();

    const offClick = vi.fn(() => {
      throw new Error("stale bridge");
    });
    const hide = vi.fn(() => {
      throw new Error("stale bridge");
    });
    globalThis.Telegram.WebApp = {
      initData: "signed",
      ready: vi.fn(),
      expand: vi.fn(),
      BackButton: {
        onClick: vi.fn(),
        offClick,
        show: vi.fn(() => {
          throw new Error("stale bridge");
        }),
        hide,
      },
    };

    expect(() => registerTelegramBackButton(vi.fn())()).not.toThrow();
    expect(offClick).toHaveBeenCalledOnce();
    expect(hide).toHaveBeenCalledOnce();
  });
});
