import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { proxy } from "./proxy";

const originalVercelEnvironment = process.env.VERCEL_ENV;

afterEach(() => {
  process.env.VERCEL_ENV = originalVercelEnvironment;
});

describe("Pomnenka production routing", () => {
  it("internally serves the Czech trial at /trial", () => {
    process.env.VERCEL_ENV = "production";

    const response = proxy(new NextRequest("https://pomnenka.me/trial"));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://pomnenka.me/cz/trial",
    );
    expect(response.headers.get("x-middleware-request-x-memento-site")).toBe(
      "pomnenka",
    );
  });

  it("marks every page on the Pomnenka production domain", () => {
    process.env.VERCEL_ENV = "production";

    const response = proxy(new NextRequest("https://pomnenka.me/admin"));

    expect(response.headers.get("x-middleware-request-x-memento-site")).toBe(
      "pomnenka",
    );
  });

  it("does not rewrite a Preview request", () => {
    process.env.VERCEL_ENV = "preview";

    const response = proxy(new NextRequest("https://pomnenka.me/trial"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
