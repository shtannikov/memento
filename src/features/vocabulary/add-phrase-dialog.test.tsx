import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  APP_BACKGROUND,
  DIALOG_BACKDROP_SOLID,
} from "@/lib/client/telegram";

import { AddPhraseDialog } from "./add-phrase-dialog";

afterEach(() => {
  delete globalThis.Telegram;
});

describe("AddPhraseDialog", () => {
  it("clips the app shell and matches Telegram chrome above the iOS keyboard", async () => {
    const visualViewport = Object.assign(new EventTarget(), {
      height: 520,
      width: 390,
      offsetTop: 8,
      offsetLeft: 0,
    });
    const viewportDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "visualViewport",
    );
    const innerHeightDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "innerHeight",
    );
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: visualViewport,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 844,
    });
    const setBackgroundColor = vi.fn();
    const setHeaderColor = vi.fn();
    const setBottomBarColor = vi.fn();
    globalThis.Telegram = {
      WebApp: {
        initData: "signed=data",
        ready: vi.fn(),
        expand: vi.fn(),
        setBackgroundColor,
        setHeaderColor,
        setBottomBarColor,
      },
    };

    const { unmount } = render(
      <AddPhraseDialog
        open
        onOpenChange={vi.fn()}
        onAdd={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const overlay = dialog.previousElementSibling;

    await waitFor(() => {
      expect(overlay).toHaveStyle({
        top: "8px",
        width: "390px",
        height: "520px",
      });
      expect(document.documentElement).toHaveClass("keyboard-open");
      expect(document.documentElement).toHaveClass("dialog-open");
      expect(
        document.documentElement.style.getPropertyValue(
          "--visual-viewport-bottom",
        ),
      ).toBe("528px");
      expect(setBackgroundColor).toHaveBeenCalledWith(
        DIALOG_BACKDROP_SOLID,
      );
      expect(setHeaderColor).toHaveBeenCalledWith(
        DIALOG_BACKDROP_SOLID,
      );
      expect(setBottomBarColor).toHaveBeenCalledWith(
        DIALOG_BACKDROP_SOLID,
      );
    });
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    visualViewport.height = 480;
    visualViewport.dispatchEvent(new Event("resize"));
    await waitFor(() => {
      expect(overlay).toHaveStyle({ height: "480px" });
      expect(
        document.documentElement.style.getPropertyValue(
          "--visual-viewport-bottom",
        ),
      ).toBe("488px");
    });

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement).not.toHaveClass("keyboard-open");
    expect(document.documentElement).not.toHaveClass("dialog-open");
    expect(
      document.documentElement.style.getPropertyValue(
        "--visual-viewport-bottom",
      ),
    ).toBe("");
    expect(setBackgroundColor).toHaveBeenLastCalledWith(APP_BACKGROUND);
    expect(setHeaderColor).toHaveBeenLastCalledWith(APP_BACKGROUND);
    expect(setBottomBarColor).toHaveBeenLastCalledWith(APP_BACKGROUND);

    if (viewportDescriptor) {
      Object.defineProperty(window, "visualViewport", viewportDescriptor);
    } else {
      delete (window as { visualViewport?: unknown }).visualViewport;
    }
    if (innerHeightDescriptor) {
      Object.defineProperty(window, "innerHeight", innerHeightDescriptor);
    }
  });
});
