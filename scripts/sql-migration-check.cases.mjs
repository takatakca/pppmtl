import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrationStructuralErrors } from "./check-sql-migrations.mjs";

const valid = `BEGIN;
CREATE OR REPLACE FUNCTION public.sample() RETURNS integer
LANGUAGE plpgsql AS $$
BEGIN
  RETURN 1;
END;
$;
COMMIT;
`;

describe("PPPMTL PostgreSQL migration integrity", () => {
  it("accepts balanced transactional functions", () => {
    assert.deepEqual(migrationStructuralErrors(valid), []);
  });
  it("rejects an accidental duplicate after COMMIT", () => {
    const bad = valid + "OR unexpected SQL after commit;";
    assert.notEqual(migrationStructuralErrors(bad).length, 0);
  });
  it("rejects a truncated PL/pgSQL dollar quote", () => {
    const bad = valid.replace("$$;", "");
    assert.ok(migrationStructuralErrors(bad).some((error) => error.includes("dollar")));
  });
  it("rejects a missing terminal COMMIT", () => {
    const bad = valid.slice(0, valid.lastIndexOf("COMMIT;"));
    assert.ok(migrationStructuralErrors(bad).length > 0);
  });
  it("rejects incomplete Clover digest validation", () => {
    assert.ok(
      migrationStructuralErrors(valid, "0002_ppp_atomic_payments.sql").some((error) =>
        error.includes("digest validation"),
      ),
    );
  });
});
