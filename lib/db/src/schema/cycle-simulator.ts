import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const cycleRunsTable = pgTable(
  "cycle_runs",
  {
    id: text("id").primaryKey(),
    cycleId: text("cycle_id").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    cycleRunIdentityIdx: uniqueIndex("cycle_runs_identity_idx").on(table.id),
  }),
);

export const competitionRunsTable = pgTable(
  "competition_runs",
  {
    id: text("id").primaryKey(),
    cycleRunId: text("cycle_run_id")
      .notNull()
      .references(() => cycleRunsTable.id, { onDelete: "cascade" }),
    cycleId: text("cycle_id").notNull(),
    competitionCode: text("competition_code").notNull(),
    discipline: text("discipline").notNull(),
    year: integer("year").notNull(),
    activePhaseKey: text("active_phase_key").notNull(),
    snapshotVersion: integer("snapshot_version").notNull().default(0),
    lastSavedAt: timestamp("last_saved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    competitionRunIdentityIdx: uniqueIndex("competition_runs_identity_idx").on(table.id),
  }),
);

export const competitionSnapshotsTable = pgTable(
  "competition_snapshots",
  {
    id: text("id").primaryKey(),
    competitionRunId: text("competition_run_id")
      .notNull()
      .references(() => competitionRunsTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<unknown>().notNull(),
    quotaAwards: jsonb("quota_awards").$type<unknown[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    competitionSnapshotVersionIdx: uniqueIndex("competition_snapshots_version_idx").on(
      table.competitionRunId,
      table.version,
    ),
  }),
);

export const quotaAwardsTable = pgTable(
  "quota_awards",
  {
    id: text("id").primaryKey(),
    cycleRunId: text("cycle_run_id")
      .notNull()
      .references(() => cycleRunsTable.id, { onDelete: "cascade" }),
    competitionRunId: text("competition_run_id")
      .notNull()
      .references(() => competitionRunsTable.id, { onDelete: "cascade" }),
    cycleId: text("cycle_id").notNull(),
    discipline: text("discipline").notNull(),
    countryId: text("country_id").notNull(),
    gymnastId: text("gymnast_id"),
    apparatus: text("apparatus"),
    reason: text("reason").notNull(),
    position: integer("position"),
    isNominative: boolean("is_nominative").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    quotaAwardIdentityIdx: uniqueIndex("quota_awards_identity_idx").on(table.id),
  }),
);

export const quotaLedgerTable = pgTable(
  "quota_ledger",
  {
    id: text("id").primaryKey(),
    cycleRunId: text("cycle_run_id")
      .notNull()
      .references(() => cycleRunsTable.id, { onDelete: "cascade" }),
    cycleId: text("cycle_id").notNull(),
    discipline: text("discipline").notNull(),
    countryId: text("country_id").notNull(),
    nominativeGymnastIds: jsonb("nominative_gymnast_ids").$type<string[]>().notNull(),
    nonNominativeCount: integer("non_nominative_count").notNull(),
    awards: jsonb("awards").$type<unknown[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    quotaLedgerCountryIdx: uniqueIndex("quota_ledger_country_idx").on(
      table.cycleRunId,
      table.discipline,
      table.countryId,
    ),
  }),
);

export type CycleRunRow = typeof cycleRunsTable.$inferSelect;
export type CompetitionRunRow = typeof competitionRunsTable.$inferSelect;
export type CompetitionSnapshotRow = typeof competitionSnapshotsTable.$inferSelect;
export type QuotaAwardRow = typeof quotaAwardsTable.$inferSelect;
export type QuotaLedgerRow = typeof quotaLedgerTable.$inferSelect;
