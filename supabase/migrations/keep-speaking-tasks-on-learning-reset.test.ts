// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "./20260802181147_keep_speaking_tasks_on_learning_reset.sql",
      import.meta.url,
    ),
  ),
  "utf8",
).toLowerCase();

describe("Learning reset without speaking cancellation", () => {
  it("redefines reset around Learning phrases only", () => {
    expect(migration).toContain(
      "create or replace function memento.prepare_learning_reset",
    );
    expect(migration).toContain(
      "create or replace function memento.confirm_learning_reset",
    );
    expect(migration).toContain("and status = 'learning' and not is_removed");
    expect(migration).not.toContain("delete from memento.speaking_tasks");
    expect(migration).not.toContain("'taskcancelled'");
  });
});
