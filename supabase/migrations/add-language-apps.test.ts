import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260731115028_add_language_apps.sql"),
  "utf8",
);

describe("language app migration", () => {
  it("backfills the English app and isolates user data by app", () => {
    expect(migration).toContain("create table memento.user_apps");
    expect(migration).toContain("select telegram_user_id, 'en'");
    expect(migration).toContain("unique (user_id, app_id, normalized_term)");
    expect(migration).toContain("primary key (user_id, app_id, usage_date)");
    expect(migration).toContain("on memento.rounds (user_id, app_id)");
  });

  it("keeps English RPC wrappers while adding app-aware overloads", () => {
    expect(migration).toContain(
      "select memento.reserve_generation_attempt(requested_user_id, 'en', requested_date)",
    );
    expect(migration).toContain(
      "select memento.import_vocabulary_items(requested_user_id, 'en', requested_items)",
    );
    expect(migration).toContain(
      "select memento.reset_vocabulary(requested_user_id, 'en')",
    );
    expect(migration).toContain(
      "grant execute on function memento.import_vocabulary_items(bigint, text, jsonb)",
    );
  });

  it("applies limits and destructive resets within one app", () => {
    expect(migration).toContain("and app_id = requested_app_id");
    expect(migration).toContain(
      "on conflict (user_id, app_id, usage_date) do update",
    );
    expect(migration).toContain(
      "where user_id = requested_user_id and app_id = requested_app_id",
    );
  });
});
