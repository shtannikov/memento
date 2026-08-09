import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260809142531_add_admin_access.sql"),
  "utf8",
);

describe("admin access migration", () => {
  it("keeps the allowlist and RPCs service-role-only", () => {
    expect(migration).toContain("alter table memento.admin_users enable row level security");
    expect(migration).toContain(
      "revoke all on table memento.admin_users from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select on table memento.admin_users to service_role",
    );
    expect(migration).toContain("security invoker");
    expect(migration).not.toContain("security definer");
  });

  it("returns one app row ordered by its last use", () => {
    expect(migration).toContain("from memento.user_apps as user_app");
    expect(migration).toContain("and not item.is_removed");
    expect(migration).toContain("and round.status = 'succeeded'");
    expect(migration).toContain("and task.status = 'completed'");
    expect(migration).toContain(
      "order by user_app.updated_at desc, users.telegram_user_id, user_app.app_id",
    );
  });

  it("resets only the requested user, app, and UTC quota date", () => {
    expect(migration).toContain("where user_id = requested_user_id");
    expect(migration).toContain("and app_id = requested_app_id");
    expect(migration).toContain("and usage_date = requested_date");
    expect(migration).toContain("set task_date = requested_date - 1");
    expect(migration).not.toContain("delete from memento.speaking_tasks");
  });
});
