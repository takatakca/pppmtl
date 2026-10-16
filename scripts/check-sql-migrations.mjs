/**
 * Fast dependency-free structural preflight for the PPP PostgreSQL migrations.
 * This is not a SQL parser: the disposable PostgreSQL CI service is still the
 * only authoritative syntax/permission check. This detects truncated/doubled
 * migration files before a psql run (incident: malformed 0002 on 2026-10-16).
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function migrationStructuralErrors(sql, filename = "migration") {
  const errors = [];
  const statements = sql.split("\n").map((line) => line.trim());
  const transactionStarts = statements.filter((line) => line === "BEGIN;").length;
  const transactionEnds = statements.filter((line) => line === "COMMIT;").length;

  if (transactionStarts !== 1 || transactionEnds !== 1) {
    errors.push(`${filename}: expected exactly one top-level BEGIN and COMMIT`);
  }
  if (!sql.trimEnd().endsWith("COMMIT;")) {
    errors.push(`${filename}: SQL after COMMIT or missing terminal COMMIT`);
  }
  const functions = (sql.match(/CREATE OR REPLACE FUNCTION\b/g) ?? []).length;
  const delimiters = (sql.match(/\$\$/g) ?? []).length;
  if (delimiters !== functions * 2) {
    errors.push(`${filename}: function body dollar quotes are not balanced`);
  }
  if (filename.includes("0002_ppp_atomic_payments")) {
    if (!sql.includes("coalesce(p_payload_digest, '') !~ '^[a-f0-9]{64}$' OR")) {
      errors.push(`${filename}: signed webhook digest validation is incomplete`);
    }
    if (!sql.includes("coalesce(p_result, '') NOT IN ('APPROVED', 'DECLINED') THEN")) {
      errors.push(`${filename}: payment result whitelist is incomplete`);
    }
  }
  return errors;
}

export function checkMigrations(directory) {
  const names = readdirSync(directory).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
  if (!names.length) return ["No numbered migrations found"];
  return names.flatMap((name) =>
    migrationStructuralErrors(readFileSync(resolve(directory, name), "utf8"), name),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkMigrations(resolve(process.cwd(), "db/migrations"));
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log("PPPMTL SQL migration structural preflight passed.");
  }
}
