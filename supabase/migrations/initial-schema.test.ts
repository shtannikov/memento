// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL("./20260726125317_initial_memento_schema.sql", import.meta.url),
  ),
  "utf8",
).toLowerCase();

describe("initial Supabase schema", () => {
  it("isolates Memento in its own server-only API schema", () => {
    expect(migration).toContain("create schema if not exists memento");
    expect(migration).toContain(
      "revoke all on schema memento from public, anon, authenticated",
    );
    expect(migration).toContain(
      "alter role authenticator set pgrst.db_schemas = 'public, graphql_public, memento'",
    );
    expect(migration).not.toContain("create table public.");
  });

  it("enables RLS and removes browser grants on every user-data table", () => {
    for (const table of [
      "app_users",
      "vocabulary_items",
      "scheduling_states",
      "rounds",
      "round_cards",
      "generation_usage",
    ]) {
      expect(migration).toContain(
        `alter table memento.${table} enable row level security`,
      );
      expect(migration).toContain(
        `revoke all on table memento.${table} from anon, authenticated`,
      );
    }
  });

  it("enforces the five-attempt quota atomically", () => {
    expect(migration).toContain(
      "where memento.generation_usage.attempts < 5",
    );
    expect(migration).toContain(
      "check (attempts between 0 and 5)",
    );
  });

  it("keeps completion ownership-scoped, idempotent, and mastery-aware", () => {
    expect(migration).toContain(
      "where id = requested_round_id and user_id = requested_user_id",
    );
    expect(migration).toContain(
      "if target_round.status = 'succeeded'",
    );
    expect(migration).toContain(
      "if new_consecutive >= 3 and new_interval >= 14",
    );
  });

  it("allows only the service role to invoke transactional functions", () => {
    expect(migration).toContain(
      "grant execute on function memento.reserve_generation_attempt(bigint, date) to service_role",
    );
    expect(migration).toContain(
      "grant execute on function memento.complete_round(uuid, bigint, jsonb, integer, timestamptz) to service_role",
    );
  });
});
