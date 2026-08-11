import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    "supabase/migrations/20260811200857_separate_admin_daily_activity.sql",
  ),
  "utf8",
);

describe("separate admin daily activity migration", () => {
  it("returns completed-today counts separately from generation usage", () => {
    expect(migration).toContain("quizzes_completed_today bigint");
    expect(migration).toContain("speaking_completed_today bigint");
    expect(migration).toContain("quiz_attempts_today integer");
    expect(migration).toContain("speaking_attempts_today bigint");
    expect(migration).toContain("round.status = 'succeeded'");
    expect(migration).toContain("task.status = 'completed'");
  });

  it("uses UTC boundaries for the requested date", () => {
    expect(migration.match(/requested_date::timestamp at time zone 'utc'/g))
      .toHaveLength(2);
    expect(
      migration.match(/\(requested_date \+ 1\)::timestamp at time zone 'utc'/g),
    ).toHaveLength(2);
  });

  it("keeps the statistics RPC restricted to the service role", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain(
      "revoke all on function memento.admin_list_user_app_stats(date)",
    );
    expect(migration).toContain(
      "grant execute on function memento.admin_list_user_app_stats(date)",
    );
  });
});
