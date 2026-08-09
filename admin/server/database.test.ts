import { beforeEach, describe, expect, it, vi } from "vitest";

const schema = vi.fn(() => ({ schema: "memento" }));
const createClient = vi.fn(() => ({ schema }));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

describe("admin database", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret");
    createClient.mockClear();
    schema.mockClear();
  });

  it("keeps every cached client access scoped to the memento schema", async () => {
    const { getAdminDatabase } = await import("./database");

    expect(getAdminDatabase()).toEqual({ schema: "memento" });
    expect(getAdminDatabase()).toEqual({ schema: "memento" });
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(schema).toHaveBeenNthCalledWith(1, "memento");
    expect(schema).toHaveBeenNthCalledWith(2, "memento");
  });
});
