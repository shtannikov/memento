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
} from "@/app/_clients/telegram";

import { AddPhraseDialog } from "./add-phrase-dialog";
import styles from "./add-phrase-dialog.module.css";

afterEach(() => {
  cleanup();
  delete globalThis.Telegram;
});

describe("AddPhraseDialog", () => {
  it("points bulk additions to a copyable import chat command", async () => {
    const user = userEvent.setup();
    render(
      <AddPhraseDialog
        open
        onOpenChange={vi.fn()}
        onAdd={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Want to add several phrases\?/),
    ).toHaveTextContent(
      "Want to add several phrases? Send /import in the chat to add them all at once.",
    );
    const command = screen.getByRole("button", {
      name: "Copy /import command",
    });
    await user.click(command);
    expect(await navigator.clipboard.readText()).toBe("/import");
    expect(command).toHaveAttribute("data-copied", "true");
    expect(command).toHaveAccessibleName("/import copied");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

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

  it("limits phrases to 35 characters and definitions to 45", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <AddPhraseDialog
        open
        onOpenChange={vi.fn()}
        onAdd={onAdd}
      />,
    );
    const term = screen.getByLabelText("Word or phrase");
    const definition = screen.getByLabelText("Definition");
    const longTerm = "p".repeat(36);
    const longDefinition = "d".repeat(46);

    expect(term).toHaveAttribute("maxlength", "35");
    expect(definition).toHaveAttribute("maxlength", "45");
    expect(term).toHaveAccessibleDescription("0 / 35");
    expect(definition).toHaveAccessibleDescription("0 / 45");

    await user.type(term, longTerm);
    await user.type(definition, longDefinition);

    expect(term).toHaveAccessibleDescription("35 / 35");
    expect(definition).toHaveAccessibleDescription("45 / 45");
    expect(screen.getByText("35 / 35")).toHaveClass(styles.limitReached);
    expect(screen.getByText("45 / 45")).toHaveClass(
      styles.limitReached,
    );

    await user.click(
      screen.getByRole("button", { name: "Add to vocabulary" }),
    );

    expect(onAdd).toHaveBeenCalledWith({
      term: longTerm.slice(0, 35),
      definition: longDefinition.slice(0, 45),
    });
  });

  it("uses the Monolog backdrop tint that composites to Telegram chrome", () => {
    const globals = readFileSync(
      join(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    const dialogStyles = readFileSync(
      join(
        process.cwd(),
        "src/app/_features/vocabulary/add-phrase-dialog.module.css",
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
    expect(dialogStyles).toContain(
      "height: calc(var(--dialog-background-height, 100dvh) + 200px);",
    );
    expect(dialogStyles).not.toContain("backdrop-filter:");
    expect(dialogStyles).toContain(".overlay {\n  position: absolute;");
    expect(dialogStyles).toContain("top: -100px;");
    expect(dialogStyles).toContain(".addDialog {\n  position: absolute;");
    expect(dialogStyles).toContain("\n  position: absolute;\n  z-index: 31;");
  });

  it("anchors the mobile dialog below Telegram chrome", () => {
    const dialogStyles = readFileSync(
      join(
        process.cwd(),
        "src/app/_features/vocabulary/add-phrase-dialog.module.css",
      ),
      "utf8",
    );

    expect(dialogStyles).toContain("--dialog-top-clearance: max(");
    expect(dialogStyles).toContain(
      "var(--tg-content-safe-area-inset-top, 0px) + 44px",
    );
    expect(dialogStyles).toContain(
      "top: var(--dialog-top-clearance);",
    );
    expect(dialogStyles).toContain("animation-name: dialog-in-mobile;");
  });

  it("keeps the phrase list behind the keyboard while the dialog is open", () => {
    const pageStyles = readFileSync(
      join(process.cwd(), "src/app/page.module.css"),
      "utf8",
    );

    expect(pageStyles).toContain(
      ":global(html.dialog-open) .mobileShell",
    );
    expect(pageStyles).toContain(
      "height: var(--dialog-background-height, 100dvh);",
    );
    expect(pageStyles).toContain(
      "min-height: var(--dialog-background-height, 100dvh);",
    );
    expect(pageStyles).toContain(
      ":global(html.dialog-open) .mobileShell {\n  filter: blur(4px);",
    );
    expect(pageStyles).not.toContain("transform: scale(1.03);");
  });

  it("prevents focus changes from panning the iOS visual viewport", async () => {
    const visualViewport = Object.assign(new EventTarget(), {
      height: 520,
      width: 390,
      offsetTop: 8,
      offsetLeft: 0,
      pageTop: 8,
      pageLeft: 0,
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
    const addViewportListener = vi.spyOn(
      visualViewport,
      "addEventListener",
    );
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
    const definition = screen.getByLabelText("Definition");

    await waitFor(() => {
      expect(overlay).toHaveStyle({ pointerEvents: "auto" });
      expect((overlay as HTMLElement).style.top).toBe("");
      expect((overlay as HTMLElement).style.left).toBe("");
      expect((overlay as HTMLElement).style.width).toBe("");
      expect((overlay as HTMLElement).style.height).toBe("");
      expect(dialog.style.top).toBe("");
      expect(document.documentElement).not.toHaveClass("keyboard-open");
      expect(document.documentElement).toHaveClass("dialog-open");
      expect(
        document.documentElement.style.getPropertyValue(
          "--visual-viewport-bottom",
        ),
      ).toBe("");
      expect(
        document.documentElement.style.getPropertyValue(
          "--dialog-background-height",
        ),
      ).toBe("844px");
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
    expect(addViewportListener).not.toHaveBeenCalled();

    const focus = vi.spyOn(definition, "focus");
    expect(fireEvent.pointerDown(definition)).toBe(false);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(definition).toHaveFocus();
    expect(dialog.style.getPropertyValue("--dialog-viewport-top")).toBe("");
    expect(dialog.style.getPropertyValue("--dialog-viewport-height")).toBe("");
    expect(document.documentElement).not.toHaveClass("keyboard-open");
    expect(
      document.documentElement.style.getPropertyValue(
        "--dialog-background-height",
      ),
    ).toBe("844px");

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement).not.toHaveClass("keyboard-open");
    expect(document.documentElement).not.toHaveClass("dialog-open");
    expect(
      document.documentElement.style.getPropertyValue(
        "--visual-viewport-bottom",
      ),
    ).toBe("");
    expect(
      document.documentElement.style.getPropertyValue(
        "--dialog-background-height",
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
