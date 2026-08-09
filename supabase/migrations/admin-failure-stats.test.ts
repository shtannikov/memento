import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260809152803_add_admin_failure_stats.sql"),
  "utf8",
);

describe("admin failure statistics migration", () => {
  it("is a comment-only reserved migration", () => {
    const executableLines = migration
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("--"));

    expect(executableLines).toEqual([]);
  });
});
