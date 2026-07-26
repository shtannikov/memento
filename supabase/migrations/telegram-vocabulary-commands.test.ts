// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "./20260726204403_telegram_vocabulary_commands.sql",
      import.meta.url,
    ),
  ),
  "utf8",
).toLowerCase();

describe("Telegram vocabulary command migration", () => {
  it("validates the batch and locks the user before enforcing capacity", () => {
    expect(migration).toContain(
      "jsonb_array_length(requested_items) > 50",
    );
    expect(migration).toContain(
      "char_length(btrim(item.term)) not between 1 and 35",
    );
    expect(migration).toContain(
      "char_length(btrim(item.definition)) not between 1 and 45",
    );
    expect(migration).toContain(
      "where telegram_user_id = requested_user_id\n  for update",
    );
    expect(migration).toContain(
      "if current_count + additional_count > 500",
    );
  });

  it("reactivates imports and resets every scheduling state atomically", () => {
    expect(migration).toContain(
      "on conflict (user_id, normalized_term) do update",
    );
    expect(migration).toContain("status = 'learning'");
    expect(migration).toContain("is_removed = false");
    expect(migration).toContain(
      "on conflict (vocabulary_id) do update",
    );
    expect(migration).toContain("consecutive_correct = 0");
    expect(migration).toContain("next_review_at = null");
  });

  it("removes dependent rounds before hard-deleting vocabulary", () => {
    const roundsDelete = migration.indexOf(
      "delete from memento.rounds",
    );
    const vocabularyDelete = migration.indexOf(
      "delete from memento.vocabulary_items",
    );
    expect(roundsDelete).toBeGreaterThan(-1);
    expect(vocabularyDelete).toBeGreaterThan(roundsDelete);
    expect(migration).not.toContain(
      "delete from memento.app_users",
    );
  });

  it("keeps both RPCs invoker-only and service-role scoped", () => {
    expect(migration.match(/security invoker/g)).toHaveLength(2);
    expect(migration).toContain(
      "revoke all on function memento.import_vocabulary_items(bigint, jsonb)",
    );
    expect(migration).toContain(
      "grant execute on function memento.import_vocabulary_items(bigint, jsonb)\n  to service_role",
    );
    expect(migration).toContain(
      "grant execute on function memento.reset_vocabulary(bigint)\n  to service_role",
    );
  });
});
