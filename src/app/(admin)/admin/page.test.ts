import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateMetadata } from "./page";

const { requestHeaders } = vi.hoisted(() => ({
  requestHeaders: new Headers(),
}));

vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

describe("admin metadata", () => {
  beforeEach(() => requestHeaders.delete("x-memento-site-app"));

  it("does not reveal the admin surface on other domains", async () => {
    await expect(generateMetadata()).resolves.toMatchObject({
      title: "Memento",
    });
  });

  it("does not reveal the admin surface on the Pomnenka domain", async () => {
    requestHeaders.set("x-memento-site-app", "cz");

    await expect(generateMetadata()).resolves.toMatchObject({
      title: "Pomněnka",
    });
  });
});
