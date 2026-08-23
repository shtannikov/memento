import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AmbientGlow, createAmbientGlowMotion } from "./ambient-glow";

describe("AmbientGlow", () => {
  it("keeps every randomized value inside the central motion bounds", () => {
    const minimum = createAmbientGlowMotion(() => 0);
    const maximum = createAmbientGlowMotion(() => 1);

    expect(minimum["--ambient-glow-x"]).toBe("42%");
    expect(maximum["--ambient-glow-x"]).toBe("58%");
    expect(minimum["--ambient-glow-y"]).toBe("36%");
    expect(maximum["--ambient-glow-y"]).toBe("58%");
    expect(minimum["--ambient-glow-drift-x"]).toBe("-12px");
    expect(maximum["--ambient-glow-drift-x"]).toBe("12px");
    expect(minimum["--ambient-glow-drift-y"]).toBe("-9px");
    expect(maximum["--ambient-glow-drift-y"]).toBe("9px");
    expect(minimum["--ambient-glow-duration"]).toBe("12s");
    expect(maximum["--ambient-glow-duration"]).toBe("18s");
  });

  it("chooses a new destination when its variation changes", () => {
    const random = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(1);
    const { container, rerender } = render(
      <AmbientGlow variation="first" />,
    );
    const field = container.querySelector<HTMLElement>("[data-ambient-glow]");

    expect(field?.style.getPropertyValue("--ambient-glow-x")).toBe("42%");
    expect(field?.style.getPropertyValue("--ambient-glow-y")).toBe("36%");

    rerender(<AmbientGlow variation="second" />);

    expect(field?.style.getPropertyValue("--ambient-glow-x")).toBe("58%");
    expect(field?.style.getPropertyValue("--ambient-glow-y")).toBe("58%");
    random.mockRestore();
  });
});
