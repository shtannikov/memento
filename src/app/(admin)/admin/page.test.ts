import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateMetadata } from "./page";

const { requestHeaders } = vi.hoisted(() => ({
  requestHeaders: new Headers(),
}));

vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

describe("admin metadata", () => {
  beforeEach(() => requestHeaders.delete("x-memento-site"));

  it("uses the default brand on other domains", async () => {
    await expect(generateMetadata()).resolves.toMatchObject({
      title: "Memento Admin",
    });
  });

  it("uses the Pomnenka brand on its production domain", async () => {
    requestHeaders.set("x-memento-site", "pomnenka");

    await expect(generateMetadata()).resolves.toMatchObject({
      title: "Pomněnka Admin",
    });
  });
});
