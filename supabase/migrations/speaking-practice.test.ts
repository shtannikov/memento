// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL("./20260802082745_add_speaking_practice.sql", import.meta.url),
  ),
  "utf8",
).toLowerCase();

describe("speaking practice migration", () => {
  it("adds the three-stage vocabulary lifecycle and one open task", () => {
    expect(migration).toContain(
      "check (status in ('learning', 'practicing', 'learned'))",
    );
    expect(migration).toContain("speaking_tasks_one_open_per_user_app_idx");
    expect(migration).toContain(
      "where status in ('preparing', 'ready', 'active')",
    );
  });

  it("promotes quiz mastery to practicing and spoken mastery to learned", () => {
    expect(migration).toContain("perform memento.promote_vocabulary_to_practicing");
    expect(migration).toContain("if new_correct >= 3 then");
    expect(migration).toContain("set status = 'learned'");
    expect(migration).toContain('usage."vocabularyid" = item.vocabulary_id::text');
  });

  it("keeps reset scoped to Learning and an unfinished speaking task", () => {
    expect(migration).toContain("create or replace function memento.prepare_learning_reset");
    expect(migration).toContain("create or replace function memento.confirm_learning_reset");
    expect(migration).toContain("and status = 'learning' and not is_removed");
    expect(migration).toContain("and status in ('preparing', 'ready', 'active')");
    expect(migration).not.toContain("delete from memento.speaking_lessons");
  });

  it("expires transcript evidence while retaining aggregate evaluation", () => {
    expect(migration).toContain("finished_at + interval '30 days'");
    expect(migration).toContain("value - 'original'");
    expect(migration).toContain("value - 'evidence'");
    expect(migration).toContain("feedback_html = coalesce(evaluation->>'telegramfeedback', '')");
  });

  it("keeps speaking tables and RPCs service-role only", () => {
    expect(migration).toContain(
      "revoke all on table memento.speaking_lessons from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function memento.complete_speaking_task",
    );
    expect(migration).toContain("to service_role");
  });
});
