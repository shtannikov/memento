import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260809152803_add_admin_failure_stats.sql"),
  "utf8",
);

describe("admin failure statistics migration", () => {
  it("counts total and UTC-today failures for quizzes and speaking", () => {
    expect(migration).toContain("quiz_failures_total bigint");
    expect(migration).toContain("quiz_failures_today bigint");
    expect(migration).toContain("speaking_failures_total bigint");
    expect(migration).toContain("speaking_failures_today bigint");
    expect(migration).toContain("where round.status = 'failed'");
    expect(migration).toContain("where task.status = 'failed'");
    expect(migration).toContain("requested_date::timestamp at time zone 'utc'");
  });

  it("keeps the replaced RPC service-role-only and security-invoker", () => {
    expect(migration).toContain("security invoker");
    expect(migration).not.toContain("security definer");
    expect(migration).toContain(
      "revoke all on function memento.admin_list_user_app_stats(date)",
    );
    expect(migration).toContain(
      "grant execute on function memento.admin_list_user_app_stats(date)",
    );
  });
});
