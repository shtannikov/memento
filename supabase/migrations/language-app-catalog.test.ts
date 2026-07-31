import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    "supabase/migrations/20260731131527_add_language_app_catalog.sql",
  ),
  "utf8",
);
const indexMigration = readFileSync(
  resolve(
    "supabase/migrations/20260731132103_index_user_apps_language.sql",
  ),
  "utf8",
);

describe("language app catalog migration", () => {
  it("moves supported app IDs from schema checks into catalog rows", () => {
    expect(migration).toContain("create table memento.language_apps");
    expect(migration).toContain(
      "insert into memento.language_apps (app_id) values ('en'), ('cz')",
    );
    expect(migration).toContain("drop constraint user_apps_app_id_check");
    expect(migration).toContain("references memento.language_apps (app_id)");
    expect(migration).not.toContain("requested_app_id not in ('en', 'cz')");
  });

  it("keeps every user-owned row attached to one registered user app", () => {
    expect(migration).toContain("vocabulary_items_user_app_fkey");
    expect(migration).toContain("rounds_user_app_fkey");
    expect(migration).toContain("generation_usage_user_app_fkey");
    expect(migration.match(/references memento\.user_apps/g)).toHaveLength(3);
  });

  it("validates RPC app IDs against data without replacing them per language", () => {
    expect(
      migration.match(/select 1 from memento\.language_apps/g),
    ).toHaveLength(3);
    expect(migration.match(/raise exception 'INVALID_APP'/g)).toHaveLength(3);
  });

  it("keeps the catalog service-role-only", () => {
    expect(migration).toContain(
      "revoke all on table memento.language_apps from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert on table memento.language_apps to service_role",
    );
  });

  it("indexes the catalog foreign key", () => {
    expect(indexMigration).toContain(
      "on memento.user_apps (app_id)",
    );
  });
});
