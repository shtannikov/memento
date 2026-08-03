// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL("./20260803205529_remove_speaking_quick_stats.sql", import.meta.url),
  ),
  "utf8",
).toLowerCase();

describe("remove speaking quick stats migration", () => {
  it("removes stored speech stats and historical proficiency rubrics", () => {
    expect(migration).toContain("drop column speech_stats");
    expect(migration).toContain("evaluation = evaluation - 'rubric'");
  });

  it("replaces the completion RPC without the speech stats parameter", () => {
    const replacement = migration.slice(
      migration.indexOf("create function memento.complete_speaking_task"),
    );
    expect(replacement).not.toContain("requested_speech_stats");
    expect(replacement).not.toContain("speech_stats, evaluation");
    expect(replacement).toContain(
      "grant execute on function memento.complete_speaking_task",
    );
    expect(replacement).toContain("to service_role");
  });
});
