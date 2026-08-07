// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "./20260804132633_preserve_practicing_queue_after_speaking.sql",
      import.meta.url,
    ),
  ),
  "utf8",
).toLowerCase();

describe("preserve Practicing queue after speaking", () => {
  it("keeps user-controlled practice ranks unchanged on task completion", () => {
    expect(migration).toContain(
      "create or replace function memento.complete_speaking_task",
    );
    expect(migration).not.toContain("set practice_rank");
    expect(migration).not.toContain("next_rank");
  });

  it("still records speaking progress and promotes mastered phrases", () => {
    expect(migration).toContain("correct_uses = correct_uses + case");
    expect(migration).toContain("incorrect_uses = incorrect_uses + case");
    expect(migration).toContain("missed = missed + case");
    expect(migration).toContain("if new_correct >= 3 then");
    expect(migration).toContain("set status = 'learned'");
  });

  it("keeps the completion RPC service-role only", () => {
    expect(migration).toContain(
      "revoke all on function memento.complete_speaking_task",
    );
    expect(migration).toContain(
      "grant execute on function memento.complete_speaking_task",
    );
    expect(migration).toContain("to service_role;");
  });
});
