// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL("./20260726134347_index_round_cards_vocabulary.sql", import.meta.url),
  ),
  "utf8",
).toLowerCase();

describe("round card vocabulary index migration", () => {
  it("covers the round_cards vocabulary foreign key", () => {
    expect(migration).toContain(
      "on memento.round_cards (vocabulary_id)",
    );
  });
});
