import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CYCLE_SEEDS,
  COMPETITION_TEMPLATE_SEEDS,
  SCHEMA_STATEMENTS,
} from "./schema";

const resolveDatabasePath = (): string => {
  const explicitPath = process.env.SQLITE_PATH || process.env.DATABASE_URL;

  if (explicitPath) {
    if (explicitPath.startsWith("file:")) {
      return fileURLToPath(explicitPath);
    }

    if (!explicitPath.includes("://")) {
      return isAbsolute(explicitPath)
        ? explicitPath
        : resolve(process.cwd(), explicitPath);
    }
  }

  return resolve(process.cwd(), "data", "artistic-gymnastics-sim.sqlite");
};

const databasePath = resolveDatabasePath();
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);

db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");

for (const statement of SCHEMA_STATEMENTS) {
  db.exec(statement);
}

export const execute = (sql: string, params: readonly unknown[] = []): void => {
  db.prepare(sql).run(...(params as never[]));
};

export const queryAll = <T>(sql: string, params: readonly unknown[] = []): T[] =>
  db.prepare(sql).all(...(params as never[])) as T[];

export const queryOne = <T>(sql: string, params: readonly unknown[] = []): T | undefined =>
  db.prepare(sql).get(...(params as never[])) as T | undefined;

export const withTransaction = <T>(callback: () => T): T => {
  execute("BEGIN IMMEDIATE TRANSACTION;");

  try {
    const result = callback();
    execute("COMMIT;");
    return result;
  } catch (error) {
    execute("ROLLBACK;");
    throw error;
  }
};

const seedStaticData = (): void => {
  const now = new Date().toISOString();

  withTransaction(() => {
    for (const cycle of CYCLE_SEEDS) {
      execute(
        `
          INSERT INTO cycles (cycle_id, label, description)
          VALUES (?, ?, ?)
          ON CONFLICT(cycle_id) DO UPDATE SET
            label = excluded.label,
            description = excluded.description
        `,
        [cycle.cycleId, cycle.label, cycle.description],
      );
    }

    for (const template of COMPETITION_TEMPLATE_SEEDS) {
      execute(
        `
          INSERT INTO competition_templates (
            competition_code,
            cycle_id,
            discipline,
            year,
            label,
            short_label,
            competition_kind,
            config_json,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(competition_code) DO UPDATE SET
            cycle_id = excluded.cycle_id,
            discipline = excluded.discipline,
            year = excluded.year,
            label = excluded.label,
            short_label = excluded.short_label,
            competition_kind = excluded.competition_kind,
            config_json = excluded.config_json,
            updated_at = excluded.updated_at
        `,
        [
          template.competitionCode,
          template.cycleId,
          template.discipline,
          template.year,
          template.label,
          template.shortLabel,
          template.competitionKind,
          template.configJson,
          now,
          now,
        ],
      );
    }
  });
};

seedStaticData();

export { databasePath };
export * from "./schema";
