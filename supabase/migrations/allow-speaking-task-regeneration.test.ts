// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "./20260804142120_allow_speaking_task_regeneration.sql",
      import.meta.url,
    ),
  ),
  "utf8",
).toLowerCase();

describe("speaking task regeneration migration", () => {
  it("adds a terminal status for replaced speaking tasks", () => {
    expect(migration).toContain("drop constraint speaking_tasks_status_check");
    expect(migration).toContain("'superseded'");
  });
});
