import { FIG_PARIS_2024_CYCLE, FIG_PARIS_2024_CONFIGS } from "@workspace/sim-core";
import type {
  CompetitionCode,
  CompetitionConfig,
  CompetitionTemplateSummary,
  CycleSummary,
  Discipline,
  PhaseKey,
} from "@workspace/sim-core";

type JsonString = string;
type ApparatusKey = "FX" | "PH" | "SR" | "VT" | "PB" | "HB" | "UB" | "BB";

export interface CycleRow {
  cycleId: string;
  label: string;
  description: string;
}

export interface CycleRunRow {
  id: string;
  cycleId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionTemplateRow {
  competitionCode: CompetitionCode;
  cycleId: string;
  discipline: Discipline;
  year: number;
  label: string;
  shortLabel: string;
  competitionKind: CompetitionConfig["competitionKind"];
  configJson: JsonString;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionRunRow {
  id: string;
  cycleRunId: string;
  cycleId: string;
  competitionCode: CompetitionCode;
  discipline: Discipline;
  year: number;
  activePhaseKey: PhaseKey;
  completedPhaseKeysJson: JsonString;
  snapshotVersion: number;
  lastSavedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionSnapshotRow {
  id: string;
  competitionRunId: string;
  version: number;
  snapshotJson: JsonString;
  quotaAwardsJson: JsonString;
  createdAt: string;
}

export interface QuotaAwardRow {
  id: string;
  cycleRunId: string;
  competitionRunId: string;
  cycleId: string;
  discipline: Discipline;
  countryId: string;
  gymnastId: string | null;
  apparatus: string | null;
  reason: string;
  position: number | null;
  isNominative: number;
  createdAt: string;
}

export interface QuotaLedgerRow {
  id: string;
  cycleRunId: string;
  cycleId: string;
  discipline: Discipline;
  countryId: string;
  nominativeGymnastIdsJson: JsonString;
  nonNominativeCount: number;
  awardsJson: JsonString;
  updatedAt: string;
}

export interface AthleteRegistryRow {
  gymnastId: string;
  cycleId: string;
  discipline: Discipline;
  countryId: string;
  name: string;
  apparatusJson: JsonString;
  firstSeenCompetitionCode: CompetitionCode;
  lastSeenCompetitionCode: CompetitionCode;
  firstSeenStageNumber: number;
  lastSeenStageNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorldCupStageRunRow {
  id: string;
  competitionRunId: string;
  cycleId: string;
  competitionCode: CompetitionCode;
  stageNumber: number;
  stageLabel: string;
  summaryJson: JsonString;
  createdAt: string;
  updatedAt: string;
}

export interface WorldCupQualificationRow {
  id: string;
  competitionRunId: string;
  cycleId: string;
  competitionCode: CompetitionCode;
  discipline: Discipline;
  stageNumber: number;
  gymnastId: string;
  gymnastName: string;
  countryId: string;
  apparatus: ApparatusKey;
  rank: number;
  points: number;
  cumulativePoints: number;
  qualifiedAt: string;
}

export const SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS cycles (
      cycle_id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS competition_templates (
      competition_code TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL REFERENCES cycles(cycle_id) ON DELETE CASCADE,
      discipline TEXT NOT NULL,
      year INTEGER NOT NULL,
      label TEXT NOT NULL,
      short_label TEXT NOT NULL,
      competition_kind TEXT NOT NULL,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS competition_templates_cycle_idx
    ON competition_templates(cycle_id, year, discipline, competition_kind)
  `,
  `
    CREATE TABLE IF NOT EXISTS cycle_runs (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL REFERENCES cycles(cycle_id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS cycle_runs_cycle_idx
    ON cycle_runs(cycle_id, updated_at DESC)
  `,
  `
    CREATE TABLE IF NOT EXISTS competition_runs (
      id TEXT PRIMARY KEY,
      cycle_run_id TEXT NOT NULL REFERENCES cycle_runs(id) ON DELETE CASCADE,
      cycle_id TEXT NOT NULL,
      competition_code TEXT NOT NULL REFERENCES competition_templates(competition_code) ON DELETE RESTRICT,
      discipline TEXT NOT NULL,
      year INTEGER NOT NULL,
      active_phase_key TEXT NOT NULL,
      completed_phase_keys_json TEXT NOT NULL DEFAULT '[]',
      snapshot_version INTEGER NOT NULL DEFAULT 0,
      last_saved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS competition_runs_identity_idx
    ON competition_runs(id)
  `,
  `
    CREATE INDEX IF NOT EXISTS competition_runs_cycle_idx
    ON competition_runs(cycle_id, cycle_run_id, updated_at DESC)
  `,
  `
    CREATE INDEX IF NOT EXISTS competition_runs_competition_idx
    ON competition_runs(competition_code, updated_at DESC)
  `,
  `
    CREATE TABLE IF NOT EXISTS competition_snapshots (
      id TEXT PRIMARY KEY,
      competition_run_id TEXT NOT NULL REFERENCES competition_runs(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      quota_awards_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (competition_run_id, version)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS quota_awards (
      id TEXT PRIMARY KEY,
      cycle_run_id TEXT NOT NULL REFERENCES cycle_runs(id) ON DELETE CASCADE,
      competition_run_id TEXT NOT NULL REFERENCES competition_runs(id) ON DELETE CASCADE,
      cycle_id TEXT NOT NULL,
      discipline TEXT NOT NULL,
      country_id TEXT NOT NULL,
      gymnast_id TEXT,
      apparatus TEXT,
      reason TEXT NOT NULL,
      position INTEGER,
      is_nominative INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS quota_awards_cycle_run_idx
    ON quota_awards(cycle_run_id, discipline, country_id)
  `,
  `
    CREATE TABLE IF NOT EXISTS quota_ledger (
      id TEXT PRIMARY KEY,
      cycle_run_id TEXT NOT NULL REFERENCES cycle_runs(id) ON DELETE CASCADE,
      cycle_id TEXT NOT NULL,
      discipline TEXT NOT NULL,
      country_id TEXT NOT NULL,
      nominative_gymnast_ids_json TEXT NOT NULL,
      non_nominative_count INTEGER NOT NULL,
      awards_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (cycle_run_id, discipline, country_id)
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS quota_ledger_country_idx
    ON quota_ledger(cycle_run_id, discipline, country_id)
  `,
  `
    CREATE TABLE IF NOT EXISTS athlete_registry (
      gymnast_id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL,
      discipline TEXT NOT NULL,
      country_id TEXT NOT NULL,
      name TEXT NOT NULL,
      apparatus_json TEXT NOT NULL,
      first_seen_competition_code TEXT NOT NULL,
      last_seen_competition_code TEXT NOT NULL,
      first_seen_stage_number INTEGER NOT NULL,
      last_seen_stage_number INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS athlete_registry_cycle_idx
    ON athlete_registry(cycle_id, discipline, country_id, name)
  `,
  `
    CREATE TABLE IF NOT EXISTS world_cup_stage_runs (
      id TEXT PRIMARY KEY,
      competition_run_id TEXT NOT NULL REFERENCES competition_runs(id) ON DELETE CASCADE,
      cycle_id TEXT NOT NULL,
      competition_code TEXT NOT NULL,
      stage_number INTEGER NOT NULL,
      stage_label TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (competition_run_id, stage_number)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS world_cup_worlds_qualifications (
      id TEXT PRIMARY KEY,
      competition_run_id TEXT NOT NULL REFERENCES competition_runs(id) ON DELETE CASCADE,
      cycle_id TEXT NOT NULL,
      competition_code TEXT NOT NULL,
      discipline TEXT NOT NULL,
      stage_number INTEGER NOT NULL,
      gymnast_id TEXT NOT NULL,
      gymnast_name TEXT NOT NULL,
      country_id TEXT NOT NULL,
      apparatus TEXT NOT NULL,
      rank INTEGER NOT NULL,
      points INTEGER NOT NULL,
      cumulative_points INTEGER NOT NULL,
      qualified_at TEXT NOT NULL,
      UNIQUE (competition_run_id, stage_number, gymnast_id, apparatus)
    )
  `,
] as const;

export const CYCLE_SEEDS: CycleRow[] = [FIG_PARIS_2024_CYCLE];

const seedTimestamp = new Date().toISOString();

export const COMPETITION_TEMPLATE_SEEDS: CompetitionTemplateRow[] = Object.values(
  FIG_PARIS_2024_CONFIGS,
).map((config) => ({
  competitionCode: config.competitionCode,
  cycleId: config.cycleId,
  discipline: config.discipline,
  year: config.year,
  label: config.label,
  shortLabel: config.shortLabel,
  competitionKind: config.competitionKind,
  configJson: JSON.stringify(config),
  createdAt: seedTimestamp,
  updatedAt: seedTimestamp,
}));

export const toCycleSummary = (row: CycleRow): CycleSummary => {
  return {
    cycleId: row.cycleId,
    label: row.label,
    description: row.description,
    years: FIG_PARIS_2024_CYCLE.years,
  };
};

export const toCompetitionTemplateSummary = (
  row: CompetitionTemplateRow,
): CompetitionTemplateSummary => ({
  competitionCode: row.competitionCode,
  cycleId: row.cycleId,
  discipline: row.discipline,
  year: row.year,
  label: row.label,
  shortLabel: row.shortLabel,
  competitionKind: row.competitionKind,
});

export const emptyCycleSeedMap = (): Record<string, CycleRow> =>
  CYCLE_SEEDS.reduce<Record<string, CycleRow>>((accumulator, cycle) => {
    accumulator[cycle.cycleId] = cycle;
    return accumulator;
  }, {});
