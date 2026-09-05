import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateMetadata } from "./layout";

const { requestHeaders } = vi.hoisted(() => ({
  requestHeaders: new Headers(),
}));

vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

describe("root metadata", () => {
  beforeEach(() => requestHeaders.delete("x-memento-site"));

  it("uses Memento by default", async () => {
    await expect(generateMetadata()).resolves.toMatchObject({
      title: "Memento",
    });
  });

  it("uses Pomnenka throughout its production domain", async () => {
    requestHeaders.set("x-memento-site", "pomnenka");

    await expect(generateMetadata()).resolves.toMatchObject({
      title: "Pomněnka",
    });
  });
});
