// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL("./20260802182737_practicing_queue_order.sql", import.meta.url),
  ),
  "utf8",
).toLowerCase();

describe("practicing queue order migration", () => {
  it("persists the full owned Practicing queue in the requested order", () => {
    expect(migration).toContain(
      "create or replace function memento.reorder_practicing_vocabulary",
    );
    expect(migration).toContain("status = 'practicing'");
    expect(migration).toContain("and not is_removed");
    expect(migration).toContain("count(distinct vocabulary_id)");
    expect(migration).toContain("with ordinality");
    expect(migration).toContain("practice_rank = requested.rank * 1024");
    expect(migration).toContain("updated_count <> expected_count");
  });

  it("returns a phrase to a fresh Learning cycle", () => {
    expect(migration).toContain(
      "create or replace function memento.return_vocabulary_to_learning",
    );
    expect(migration).toContain("set status = 'learning'");
    expect(migration).toContain("consecutive_correct = 0");
    expect(migration).toContain("next_review_at = null");
    expect(migration).toContain("delete from memento.speaking_states");
  });

  it("keeps both queue RPCs service-role only", () => {
    expect(migration).toContain(
      "revoke all on function memento.reorder_practicing_vocabulary",
    );
    expect(migration).toContain(
      "revoke all on function memento.return_vocabulary_to_learning",
    );
    expect(migration.match(/to service_role;/g)).toHaveLength(2);
  });
});
