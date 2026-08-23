import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatusScreen } from "./status-screen";

describe("StatusScreen", () => {
  it("renders an animated loading status without navigation", () => {
    render(
      <StatusScreen
        title="Loading Pomněnka"
        supportingCopy="Getting your vocabulary ready."
        role="status"
      />,
    );

    const heading = screen.getByRole("heading", {
      name: "Loading Pomněnka...",
    });
    const ellipsis = heading.querySelector("[aria-hidden='true']");

    expect(ellipsis).toHaveTextContent("...");
    expect(ellipsis?.children).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Getting your vocabulary ready.",
    );
    expect(
      screen.getByRole("status").querySelector("[data-ambient-glow]"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders static multiline feedback with navigation and an action", () => {
    const onBack = vi.fn();
    const onAction = vi.fn();

    render(
      <StatusScreen
        title="Quiz unavailable"
        supportingCopy={"Couldn’t prepare this quiz.\nPlease try again."}
        animatedEllipsis={false}
        onBack={onBack}
        backLabel="Vocabulary"
        onAction={onAction}
        actionLabel="Try again"
        role="alert"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Quiz unavailable" }),
    ).toBeVisible();
    expect(screen.getByRole("alert").querySelector("br")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vocabulary" }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledOnce();
  });
});
