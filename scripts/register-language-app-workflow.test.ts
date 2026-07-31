import { describe, expect, it, vi } from "vitest";

import { registerLanguageApp } from "./register-language-app-workflow";

describe("language app registration workflow", () => {
  it("registers and verifies the requested app ID", async () => {
    const catalog = {
      register: vi.fn().mockResolvedValue(undefined),
      find: vi.fn().mockResolvedValue("cz"),
    };

    await registerLanguageApp(catalog, "cz");

    expect(catalog.register).toHaveBeenCalledWith("cz");
    expect(catalog.find).toHaveBeenCalledWith("cz");
  });

  it("fails when the resulting catalog row cannot be verified", async () => {
    const catalog = {
      register: vi.fn().mockResolvedValue(undefined),
      find: vi.fn().mockResolvedValue(null),
    };

    await expect(registerLanguageApp(catalog, "ar")).rejects.toThrow(
      "Could not verify ar in memento.language_apps.",
    );
  });
});
