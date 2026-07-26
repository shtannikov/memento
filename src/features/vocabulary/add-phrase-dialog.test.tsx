import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  APP_BACKGROUND,
  DIALOG_BACKDROP_SOLID,
} from "@/lib/client/telegram";

import { AddPhraseDialog } from "./add-phrase-dialog";

afterEach(() => {
  cleanup();
  delete globalThis.Telegram;
});

describe("AddPhraseDialog", () => {
  it("stays open after outside taps and Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <AddPhraseDialog
        open
        onOpenChange={onOpenChange}
        onAdd={vi.fn()}
      />,
    );

    const term = screen.getByPlaceholderText(
      "e.g. to be in charge of sth",
    );
    await user.type(term, "to follow up sth");
    fireEvent.pointerDown(document.body);
    await user.keyboard("{Escape}");

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(term).toHaveValue("to follow up sth");
  });

  it("closes through the close button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <AddPhraseDialog
        open
        onOpenChange={onOpenChange}
        onAdd={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Close add word dialog",
      }),
    );
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("adds a valid phrase and closes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onAdd = vi.fn();
    render(
      <AddPhraseDialog
        open
        onOpenChange={onOpenChange}
        onAdd={onAdd}
      />,
    );
    await user.type(
      screen.getByPlaceholderText("e.g. to be in charge of sth"),
      "to follow up sth",
    );
    await user.type(
      screen.getByPlaceholderText(
        "e.g. to have responsibility for sth",
      ),
      "to continue checking something",
    );
    await user.click(
      screen.getByRole("button", { name: "Add to vocabulary" }),
    );

    expect(onAdd).toHaveBeenCalledWith({
      term: "to follow up sth",
      definition: "to continue checking something",
    });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("uses the Monolog backdrop tint that composites to Telegram chrome", () => {
    const globals = readFileSync(
      join(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    const dialogStyles = readFileSync(
      join(
        process.cwd(),
        "src/features/vocabulary/add-phrase-dialog.module.css",
      ),
      "utf8",
    );

    expect(globals).toContain(
      "--dialog-backdrop: rgb(15 15 35 / 35%);",
    );
    expect(globals).toContain("--dialog-backdrop-solid: #ababb2;");
    expect(dialogStyles).toContain(
      "background: var(--dialog-backdrop);",
    );
  });

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
