import { randomUUID } from "node:crypto";

import {
  buildOlympicRosterEntries,
  aggregateQuotaLedger,
  type CompetitionCode,
  type CompetitionRunRecord,
  type CompetitionRunSummary,
  type CreateCompetitionRunInput,
  type CycleDetailResponse,
  type CycleDirectoryResponse,
  type CycleQuotaSummary,
  getCompetitionConfig,
  getCycleSummary,
  getFirstPhase,
  listCompetitionTemplates,
  listCycles,
  type QuotaAward,
  type SaveCompetitionSnapshotInput,
  type SaveCompetitionSnapshotResult,
} from "@workspace/sim-core";
import {
  competitionRunEnvelopeSchema,
  createCompetitionRunInputSchema,
  saveCompetitionSnapshotInputSchema,
} from "@workspace/sim-core/schemas";
import {
  execute,
  queryAll,
  queryOne,
  withTransaction,
  type AthleteRegistryRow,
  type CompetitionRunRow,
  type CompetitionSnapshotRow,
  type CycleRunRow,
  type QuotaAwardRow,
  type QuotaLedgerRow,
  type WorldCupQualificationRow,
  type WorldCupStageRunRow,
} from "@workspace/db";

type SnapshotEnvelope = ReturnType<typeof competitionRunEnvelopeSchema.parse>;
type SnapshotRecord = Record<string, unknown>;
type RecordOfUnknown = Record<string, unknown>;

const WORLD_CUP_POINTS_BY_RANK: Record<number, number> = {
  1: 30,
  2: 25,
  3: 20,
  4: 18,
  5: 16,
  6: 14,
  7: 12,
  8: 10,
  9: 8,
  10: 7,
  11: 6,
  12: 5,
  13: 4,
  14: 3,
  15: 2,
  16: 1,
};

const isObjectRecord = (value: unknown): value is RecordOfUnknown =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseJsonArray = <T,>(value: unknown, fallback: T[] = []): T[] =>
  Array.isArray(value) ? (value as T[]) : fallback;

const parseJsonRecord = <T extends Record<string, unknown>>(
  value: unknown,
): T | null => (isObjectRecord(value) ? (value as T) : null);

const toIsoString = (value: Date | string | null | undefined): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
};

const parseDateMaybe = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
};

const parseCompetitionRunCompletedKeys = (value: unknown): CompetitionRunSummary["completedPhaseKeys"] => {
  if (typeof value === "string") {
    try {
      return parseJsonArray(JSON.parse(value), []) as CompetitionRunSummary["completedPhaseKeys"];
    } catch {
      return [];
    }
  }

  return parseJsonArray(value, []) as CompetitionRunSummary["completedPhaseKeys"];
};

const coerceSnapshotEnvelope = (
  competitionCode: CompetitionCode,
  snapshot?: unknown,
): SnapshotEnvelope => {
  const config = getCompetitionConfig(competitionCode);
  const snapshotRecord = isObjectRecord(snapshot) ? snapshot : {};

  return competitionRunEnvelopeSchema.parse({
    runId:
      typeof snapshotRecord.runId === "string" || snapshotRecord.runId === null
        ? snapshotRecord.runId
        : null,
    cycleId:
      typeof snapshotRecord.cycleId === "string"
        ? snapshotRecord.cycleId
        : config.cycleId,
    competitionCode:
      typeof snapshotRecord.competitionCode === "string"
        ? snapshotRecord.competitionCode
        : competitionCode,
    discipline:
      snapshotRecord.discipline === "MAG" || snapshotRecord.discipline === "WAG"
        ? snapshotRecord.discipline
        : config.discipline,
    year:
      typeof snapshotRecord.year === "number"
        ? snapshotRecord.year
        : config.year,
    activePhaseKey:
      typeof snapshotRecord.activePhaseKey === "string"
        ? snapshotRecord.activePhaseKey
        : getFirstPhase(competitionCode).key,
    completedPhaseKeys: Array.isArray(snapshotRecord.completedPhaseKeys)
      ? snapshotRecord.completedPhaseKeys
      : [],
    snapshotVersion:
      typeof snapshotRecord.snapshotVersion === "number"
        ? snapshotRecord.snapshotVersion
        : 0,
    persistenceSource:
      snapshotRecord.persistenceSource === "legacy-local"
      || snapshotRecord.persistenceSource === "local-cache"
      || snapshotRecord.persistenceSource === "remote"
        ? snapshotRecord.persistenceSource
        : "remote",
    lastSavedAt:
      typeof snapshotRecord.lastSavedAt === "string" || snapshotRecord.lastSavedAt === null
        ? snapshotRecord.lastSavedAt
        : null,
  });
};

const toCycleRunSummary = (row: CycleRunRow) => ({
  cycleRunId: row.id,
  cycleId: row.cycleId,
  label: row.label,
  createdAt: toIsoString(row.createdAt),
  updatedAt: toIsoString(row.updatedAt),
});

const toCompetitionRunSummary = (row: CompetitionRunRow): CompetitionRunSummary => ({
  runId: row.id,
  cycleRunId: row.cycleRunId,
  cycleId: row.cycleId,
  competitionCode: row.competitionCode,
  discipline: row.discipline === "MAG" ? "MAG" : "WAG",
  year: row.year,
  activePhaseKey: row.activePhaseKey,
  completedPhaseKeys: parseCompetitionRunCompletedKeys(row.completedPhaseKeysJson),
  snapshotVersion: row.snapshotVersion,
  persistenceSource: "remote",
  lastSavedAt: parseDateMaybe(row.lastSavedAt),
  createdAt: toIsoString(row.createdAt),
  updatedAt: toIsoString(row.updatedAt),
});

const hydrateSnapshot = (
  snapshot: unknown,
  run: CompetitionRunSummary,
): unknown => {
  const snapshotRecord = isObjectRecord(snapshot) ? snapshot : {};

  return {
    ...snapshotRecord,
    runId: run.runId,
    cycleId: run.cycleId,
    competitionCode: run.competitionCode,
    discipline: run.discipline,
    year: run.year,
    activePhaseKey: run.activePhaseKey,
    completedPhaseKeys:
      Array.isArray(snapshotRecord.completedPhaseKeys)
        ? snapshotRecord.completedPhaseKeys
        : run.completedPhaseKeys,
    snapshotVersion: run.snapshotVersion,
    persistenceSource: "remote",
    lastSavedAt: run.lastSavedAt,
  };
};

const buildQuotaAwards = (
  runId: string,
  cycleId: string,
  awards: QuotaAward[] | undefined,
): QuotaAward[] =>
  (awards || []).map((award, index) => ({
    ...award,
    awardId: award.awardId || randomUUID(),
    cycleId,
    competitionRunId: runId,
    reason: award.reason || `Award ${index + 1}`,
  }));

const selectLatestCycleRun = async (
  cycleId: string,
): Promise<CycleRunRow | null> => {
  const row = queryOne<CycleRunRow>(
    `
      SELECT id, cycle_id AS cycleId, label, created_at AS createdAt, updated_at AS updatedAt
      FROM cycle_runs
      WHERE cycle_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [cycleId],
  );

  return row || null;
};

const selectCompetitionRunRows = async (
  cycleId?: string,
  cycleRunId?: string | null,
): Promise<CompetitionRunRow[]> => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (cycleId) {
    clauses.push("cycle_id = ?");
    params.push(cycleId);
  }

  if (cycleRunId) {
    clauses.push("cycle_run_id = ?");
    params.push(cycleRunId);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  return queryAll<CompetitionRunRow>(
    `
      SELECT
        id,
        cycle_run_id AS cycleRunId,
        cycle_id AS cycleId,
        competition_code AS competitionCode,
        discipline,
        year,
        active_phase_key AS activePhaseKey,
        completed_phase_keys_json AS completedPhaseKeysJson,
        snapshot_version AS snapshotVersion,
        last_saved_at AS lastSavedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM competition_runs
      ${where}
      ORDER BY updated_at DESC
    `,
    params,
  );
};

const getLatestSnapshotRow = async (runId: string): Promise<CompetitionSnapshotRow | null> => {
  const row = queryOne<CompetitionSnapshotRow>(
    `
      SELECT
        id,
        competition_run_id AS competitionRunId,
        version,
        snapshot_json AS snapshotJson,
        quota_awards_json AS quotaAwardsJson,
        created_at AS createdAt
      FROM competition_snapshots
      WHERE competition_run_id = ?
      ORDER BY version DESC
      LIMIT 1
    `,
    [runId],
  );

  return row || null;
};

const ensureCycleRun = async (
  cycleId: string,
  cycleRunId?: string | null,
  cycleRunLabel?: string | null,
): Promise<CycleRunRow> => {
  if (cycleRunId) {
    const existing = queryOne<CycleRunRow>(
      `
        SELECT id, cycle_id AS cycleId, label, created_at AS createdAt, updated_at AS updatedAt
        FROM cycle_runs
        WHERE id = ?
        LIMIT 1
      `,
      [cycleRunId],
    );

    if (!existing || existing.cycleId !== cycleId) {
      throw new CycleRunNotFoundError(`Cycle run ${cycleRunId} was not found for ${cycleId}.`);
    }

    return existing;
  }

  const latest = await selectLatestCycleRun(cycleId);
  if (latest) {
    return latest;
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  execute(
    `
      INSERT INTO cycle_runs (id, cycle_id, label, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [id, cycleId, cycleRunLabel || `${cycleId} journey`, now, now],
  );

  return {
    id,
    cycleId,
    label: cycleRunLabel || `${cycleId} journey`,
    createdAt: now,
    updatedAt: now,
  };
};

const syncQuotaLedger = async (
  cycleId: string,
  cycleRunId: string,
): Promise<CycleQuotaSummary> => {
  const awardRows = queryAll<QuotaAwardRow>(
    `
      SELECT
        id,
        cycle_run_id AS cycleRunId,
        competition_run_id AS competitionRunId,
        cycle_id AS cycleId,
        discipline,
        country_id AS countryId,
        gymnast_id AS gymnastId,
        apparatus,
        reason,
        position,
        is_nominative AS isNominative,
        created_at AS createdAt
      FROM quota_awards
      WHERE cycle_run_id = ?
    `,
    [cycleRunId],
  );

  const awards: QuotaAward[] = awardRows.map((row) => ({
    awardId: row.id,
    cycleId: row.cycleId,
    competitionRunId: row.competitionRunId,
    discipline: row.discipline === "MAG" ? "MAG" : "WAG",
    countryId: row.countryId,
    gymnastId: row.gymnastId,
    apparatus: row.apparatus,
    reason: row.reason,
    position: row.position,
    isNominative: Boolean(row.isNominative),
  }));

  const ledger = aggregateQuotaLedger(cycleId, awards);
  const olympicRoster = buildOlympicRosterEntries(ledger);
  const now = new Date().toISOString();

  execute("DELETE FROM quota_ledger WHERE cycle_run_id = ?", [cycleRunId]);

  if (ledger.length > 0) {
    ledger.forEach((entry) => {
      execute(
        `
          INSERT INTO quota_ledger (
            id,
            cycle_run_id,
            cycle_id,
            discipline,
            country_id,
            nominative_gymnast_ids_json,
            non_nominative_count,
            awards_json,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(cycle_run_id, discipline, country_id) DO UPDATE SET
            nominative_gymnast_ids_json = excluded.nominative_gymnast_ids_json,
            non_nominative_count = excluded.non_nominative_count,
            awards_json = excluded.awards_json,
            updated_at = excluded.updated_at
        `,
        [
          randomUUID(),
          cycleRunId,
          entry.cycleId,
          entry.discipline,
          entry.countryId,
          JSON.stringify(entry.nominativeGymnastIds),
          entry.nonNominativeCount,
          JSON.stringify(entry.awards),
          now,
        ],
      );
    });
  }

  return {
    cycleId,
    cycleRunId,
    ledger,
    olympicRoster,
  };
};

const stageSummaryRowPoints = (rank: number | null | undefined): number =>
  rank && WORLD_CUP_POINTS_BY_RANK[rank] ? WORLD_CUP_POINTS_BY_RANK[rank] : 0;

const calculateWorldCupQualificationRows = (
  stageHistory: unknown[],
  competitionRunId: string,
  cycleId: string,
  competitionCode: CompetitionCode,
  discipline: "WAG" | "MAG",
  currentStageNumber: number,
): WorldCupQualificationRow[] => {
  const cumulativeByApparatus = new Map<
    string,
    Map<
      string,
      {
        gymnastId: string;
        gymnastName: string;
        countryId: string;
        totalPoints: number;
      }
    >
  >();

  stageHistory
    .filter(isObjectRecord)
    .sort((left, right) => {
      const leftStage = typeof left.stageNumber === "number" ? left.stageNumber : 0;
      const rightStage = typeof right.stageNumber === "number" ? right.stageNumber : 0;
      return leftStage - rightStage;
    })
    .forEach((stageRecord) => {
      const stageNumber = typeof stageRecord.stageNumber === "number" ? stageRecord.stageNumber : 0;
      const apparatusRankings = parseJsonRecord<Record<string, unknown[]>>(stageRecord.apparatusRankings);
      if (!apparatusRankings) {
        return;
      }

      Object.entries(apparatusRankings).forEach(([apparatus, rows]) => {
        const apparatusTotals = cumulativeByApparatus.get(apparatus) || new Map();

        rows
          .filter(isObjectRecord)
          .forEach((row) => {
            const gymnastId = typeof row.gymnastId === "string" ? row.gymnastId : null;
            if (!gymnastId) return;

            const gymnastName = typeof row.gymnastName === "string" ? row.gymnastName : gymnastId;
            const countryId = typeof row.countryId === "string" ? row.countryId : "";
            const rank = typeof row.rank === "number" ? row.rank : null;
            const points =
              typeof row.points === "number" ? row.points : stageSummaryRowPoints(rank);

            const existing = apparatusTotals.get(gymnastId) || {
              gymnastId,
              gymnastName,
              countryId,
              totalPoints: 0,
            };

            existing.gymnastName = gymnastName;
            existing.countryId = countryId;
            existing.totalPoints += points;
            apparatusTotals.set(gymnastId, existing);
          });

        cumulativeByApparatus.set(apparatus, apparatusTotals);
      });
    });

  const now = new Date().toISOString();
  const qualificationRows: WorldCupQualificationRow[] = [];

  cumulativeByApparatus.forEach((entries, apparatus) => {
    const sorted = [...entries.values()].sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      return left.gymnastName.localeCompare(right.gymnastName);
    });

    sorted.forEach((entry, index) => {
      const rank = index + 1;
      if (rank > 8) {
        return;
      }

      qualificationRows.push({
        id: `${competitionRunId}:stage:${stageNumber}:qual:${apparatus}:${entry.gymnastId}`,
        competitionRunId,
        cycleId,
        competitionCode,
        discipline,
        stageNumber: currentStageNumber,
        gymnastId: entry.gymnastId,
        gymnastName: entry.gymnastName,
        countryId: entry.countryId,
        apparatus: apparatus as WorldCupQualificationRow["apparatus"],
        rank,
        points: entry.totalPoints,
        cumulativePoints: entry.totalPoints,
        qualifiedAt: now,
      });
    });
  });

  return qualificationRows;
};

const syncWorldCupTables = (
  runRecord: CompetitionRunSummary,
  snapshot: SnapshotRecord,
): void => {
  const worldCupSeries = parseJsonRecord<{
    currentStageNumber?: unknown;
    totalStages?: unknown;
    stageHistory?: unknown;
    registry?: unknown;
  }>(snapshot.worldCupSeries);

  if (!worldCupSeries) {
    execute("DELETE FROM world_cup_stage_runs WHERE competition_run_id = ?", [runRecord.runId]);
    execute("DELETE FROM world_cup_worlds_qualifications WHERE competition_run_id = ?", [runRecord.runId]);
    return;
  }

  const stageHistory = parseJsonArray<RecordOfUnknown>(worldCupSeries.stageHistory, []);
  const currentStageNumber =
    typeof worldCupSeries.currentStageNumber === "number"
      ? worldCupSeries.currentStageNumber
      : stageHistory.length || 1;
  const stageRows = stageHistory
    .filter(isObjectRecord)
    .map((stageRecord) => ({
      stageNumber: typeof stageRecord.stageNumber === "number" ? stageRecord.stageNumber : 0,
      stageLabel:
        typeof stageRecord.stageLabel === "string"
          ? stageRecord.stageLabel
          : `Stage ${typeof stageRecord.stageNumber === "number" ? stageRecord.stageNumber : 0}`,
      summaryJson: JSON.stringify(stageRecord),
    }))
    .filter((stageRow) => stageRow.stageNumber > 0);

  execute("DELETE FROM world_cup_stage_runs WHERE competition_run_id = ?", [runRecord.runId]);
  stageRows.forEach((stageRow) => {
    execute(
      `
        INSERT INTO world_cup_stage_runs (
          id,
          competition_run_id,
          cycle_id,
          competition_code,
          stage_number,
          stage_label,
          summary_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(competition_run_id, stage_number) DO UPDATE SET
          stage_label = excluded.stage_label,
          summary_json = excluded.summary_json,
          updated_at = excluded.updated_at
      `,
      [
        `${runRecord.runId}:stage:${stageRow.stageNumber}`,
        runRecord.runId,
        runRecord.cycleId,
        runRecord.competitionCode,
        stageRow.stageNumber,
        stageRow.stageLabel,
        stageRow.summaryJson,
        toIsoString(new Date()),
        toIsoString(new Date()),
      ],
    );
  });

  execute("DELETE FROM world_cup_worlds_qualifications WHERE competition_run_id = ?", [runRecord.runId]);

  const qualificationRows = calculateWorldCupQualificationRows(
    stageRows.map((row) => JSON.parse(row.summaryJson) as RecordOfUnknown),
    runRecord.runId,
    runRecord.cycleId,
    runRecord.competitionCode,
    runRecord.discipline,
    currentStageNumber,
  );

  qualificationRows.forEach((row) => {
    execute(
      `
        INSERT INTO world_cup_worlds_qualifications (
          id,
          competition_run_id,
          cycle_id,
          competition_code,
          discipline,
          stage_number,
          gymnast_id,
          gymnast_name,
          country_id,
          apparatus,
          rank,
          points,
          cumulative_points,
          qualified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(competition_run_id, stage_number, gymnast_id, apparatus) DO UPDATE SET
          gymnast_name = excluded.gymnast_name,
          country_id = excluded.country_id,
          rank = excluded.rank,
          points = excluded.points,
          cumulative_points = excluded.cumulative_points,
          qualified_at = excluded.qualified_at
      `,
      [
        row.id,
        row.competitionRunId,
        row.cycleId,
        row.competitionCode,
        row.discipline,
        row.stageNumber,
        row.gymnastId,
        row.gymnastName,
        row.countryId,
        row.apparatus,
        row.rank,
        row.points,
        row.cumulativePoints,
        row.qualifiedAt,
      ],
    );
  });

  const registryEntries = [
    ...Object.values(parseJsonRecord<Record<string, RecordOfUnknown>>(worldCupSeries.registry) || {}),
    ...Object.values(parseJsonRecord<Record<string, RecordOfUnknown>>(snapshot.teams) || {}).flatMap(
      (teamRecord) =>
        parseJsonArray<RecordOfUnknown>(teamRecord.gymnasts, []).filter(isObjectRecord),
    ),
  ];

  const seenGymnasts = new Set<string>();
  registryEntries
    .filter(isObjectRecord)
    .forEach((gymnastRecord) => {
      const gymnastId = typeof gymnastRecord.id === "string" ? gymnastRecord.id : null;
      const countryId = typeof gymnastRecord.countryId === "string" ? gymnastRecord.countryId : null;
      const name = typeof gymnastRecord.name === "string" ? gymnastRecord.name : null;
      if (!gymnastId || !countryId || !name || seenGymnasts.has(gymnastId)) {
        return;
      }

      seenGymnasts.add(gymnastId);

      const apparatus = parseJsonArray<string>(gymnastRecord.apparatus, []);
      const discipline = runRecord.discipline;
      const now = new Date().toISOString();

      execute(
        `
          INSERT INTO athlete_registry (
            gymnast_id,
            cycle_id,
            discipline,
            country_id,
            name,
            apparatus_json,
            first_seen_competition_code,
            last_seen_competition_code,
            first_seen_stage_number,
            last_seen_stage_number,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(gymnast_id) DO UPDATE SET
            cycle_id = excluded.cycle_id,
            discipline = excluded.discipline,
            country_id = excluded.country_id,
            name = excluded.name,
            apparatus_json = excluded.apparatus_json,
            last_seen_competition_code = excluded.last_seen_competition_code,
            last_seen_stage_number = excluded.last_seen_stage_number,
            updated_at = excluded.updated_at
        `,
        [
          gymnastId,
          runRecord.cycleId,
          discipline,
          countryId,
          name,
          JSON.stringify(apparatus),
          runRecord.competitionCode,
          runRecord.competitionCode,
          currentStageNumber,
          currentStageNumber,
          now,
          now,
        ],
      );
    });
};

export class RunNotFoundError extends Error {}
export class SnapshotConflictError extends Error {}
export class CycleRunNotFoundError extends Error {}

export const getCycleDirectory = async (): Promise<CycleDirectoryResponse> => {
  const cycleRuns = await queryAll<CycleRunRow>(
    `
      SELECT id, cycle_id AS cycleId, label, created_at AS createdAt, updated_at AS updatedAt
      FROM cycle_runs
      ORDER BY updated_at DESC
    `,
  );
  const competitionRuns = await selectCompetitionRunRows();

  return {
    cycles: listCycles(),
    cycleRuns: cycleRuns.map(toCycleRunSummary),
    competitionRuns: competitionRuns.map(toCompetitionRunSummary),
  };
};

export const getCycleDetail = async (
  cycleId: string,
  cycleRunId?: string | null,
): Promise<CycleDetailResponse> => {
  const cycle = getCycleSummary(cycleId);
  if (!cycle) {
    throw new RunNotFoundError(`Cycle ${cycleId} was not found.`);
  }

  const targetCycleRunId = cycleRunId || (await selectLatestCycleRun(cycleId))?.id || null;
  const competitionRuns = await selectCompetitionRunRows(cycleId, targetCycleRunId);

  return {
    cycle,
    cycleRunId: targetCycleRunId,
    templates: listCompetitionTemplates(cycleId),
    competitionRuns: competitionRuns.map(toCompetitionRunSummary),
  };
};

export const getCycleQuotas = async (
  cycleId: string,
  cycleRunId?: string | null,
): Promise<CycleQuotaSummary> => {
  const targetCycleRunId = cycleRunId || (await selectLatestCycleRun(cycleId))?.id || null;
  if (!targetCycleRunId) {
    return {
      cycleId,
      cycleRunId: null,
      ledger: [],
      olympicRoster: [],
    };
  }

  const rows = await queryAll<QuotaLedgerRow>(
    `
      SELECT
        id,
        cycle_run_id AS cycleRunId,
        cycle_id AS cycleId,
        discipline,
        country_id AS countryId,
        nominative_gymnast_ids_json AS nominativeGymnastIdsJson,
        non_nominative_count AS nonNominativeCount,
        awards_json AS awardsJson,
        updated_at AS updatedAt
      FROM quota_ledger
      WHERE cycle_run_id = ?
      ORDER BY discipline, country_id
    `,
    [targetCycleRunId],
  );

  if (rows.length === 0) {
    return syncQuotaLedger(cycleId, targetCycleRunId);
  }

  const ledger = rows.map((row) => ({
    cycleId: row.cycleId,
    discipline: row.discipline === "MAG" ? "MAG" : "WAG",
    countryId: row.countryId,
    nominativeGymnastIds: parseJsonArray<string>(JSON.parse(row.nominativeGymnastIdsJson), []),
    nonNominativeCount: row.nonNominativeCount,
    awards: parseJsonArray<QuotaAward>(JSON.parse(row.awardsJson), []),
  }));

  return {
    cycleId,
    cycleRunId: targetCycleRunId,
    ledger,
    olympicRoster: buildOlympicRosterEntries(ledger),
  };
};

export const createCompetitionRun = async (
  rawInput: CreateCompetitionRunInput,
): Promise<CompetitionRunRecord> => {
  const input = createCompetitionRunInputSchema.parse(rawInput);
  const config = getCompetitionConfig(input.competitionCode);
  if (input.cycleId !== config.cycleId) {
    throw new RunNotFoundError(
      `Competition ${input.competitionCode} does not belong to cycle ${input.cycleId}.`,
    );
  }

  const envelope = coerceSnapshotEnvelope(input.competitionCode, input.snapshot);
  const cycleRun = await ensureCycleRun(
    input.cycleId,
    input.cycleRunId,
    input.cycleRunLabel,
  );
  const now = new Date().toISOString();
  const runId = randomUUID();

  execute(
    `
      UPDATE cycle_runs
      SET updated_at = ?
      WHERE id = ?
    `,
    [now, cycleRun.id],
  );

  execute(
    `
      INSERT INTO competition_runs (
        id,
        cycle_run_id,
        cycle_id,
        competition_code,
        discipline,
        year,
        active_phase_key,
        completed_phase_keys_json,
        snapshot_version,
        last_saved_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      runId,
      cycleRun.id,
      config.cycleId,
      config.competitionCode,
      config.discipline,
      config.year,
      envelope.activePhaseKey,
      JSON.stringify(envelope.completedPhaseKeys),
      0,
      now,
      now,
      now,
    ],
  );

  const run = {
    runId,
    cycleRunId: cycleRun.id,
    cycleId: config.cycleId,
    competitionCode: config.competitionCode,
    discipline: config.discipline,
    year: config.year,
    activePhaseKey: envelope.activePhaseKey,
    completedPhaseKeys: envelope.completedPhaseKeys,
    snapshotVersion: 0,
    persistenceSource: "remote" as const,
    lastSavedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const hydratedSnapshot = hydrateSnapshot(
    input.snapshot || envelope,
    {
      ...run,
      lastSavedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  );

  execute(
    `
      INSERT INTO competition_snapshots (
        id,
        competition_run_id,
        version,
        snapshot_json,
        quota_awards_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [randomUUID(), runId, 0, JSON.stringify(hydratedSnapshot), JSON.stringify([]), now],
  );

  return {
    run,
    config,
    snapshot: hydratedSnapshot,
  };
};

export const getCompetitionRun = async (
  runId: string,
): Promise<CompetitionRunRecord> => {
  const runRow = queryOne<CompetitionRunRow>(
    `
      SELECT
        id,
        cycle_run_id AS cycleRunId,
        cycle_id AS cycleId,
        competition_code AS competitionCode,
        discipline,
        year,
        active_phase_key AS activePhaseKey,
        completed_phase_keys_json AS completedPhaseKeysJson,
        snapshot_version AS snapshotVersion,
        last_saved_at AS lastSavedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM competition_runs
      WHERE id = ?
      LIMIT 1
    `,
    [runId],
  );

  if (!runRow) {
    throw new RunNotFoundError(`Competition run ${runId} was not found.`);
  }

  const snapshotRow = await getLatestSnapshotRow(runId);
  const run = toCompetitionRunSummary(runRow);
  const config = getCompetitionConfig(run.competitionCode);
  const snapshot = hydrateSnapshot(
    snapshotRow ? JSON.parse(snapshotRow.snapshotJson) : {},
    run,
  );

  if (isObjectRecord(snapshot)) {
    run.completedPhaseKeys = Array.isArray(snapshot.completedPhaseKeys)
      ? (snapshot.completedPhaseKeys as CompetitionRunSummary["completedPhaseKeys"])
      : [];
  }

  return {
    run,
    config,
    snapshot,
  };
};

export const saveCompetitionSnapshot = async (
  runId: string,
  rawInput: SaveCompetitionSnapshotInput,
): Promise<SaveCompetitionSnapshotResult> => {
  const input = saveCompetitionSnapshotInputSchema.parse(rawInput);
  const runRecord = await getCompetitionRun(runId);

  if (runRecord.run.snapshotVersion !== input.expectedVersion) {
    throw new SnapshotConflictError(
      `Expected version ${input.expectedVersion}, received ${runRecord.run.snapshotVersion}.`,
    );
  }

  const envelope = coerceSnapshotEnvelope(runRecord.run.competitionCode, input.snapshot);
  const nextVersion = runRecord.run.snapshotVersion + 1;
  const now = new Date().toISOString();
  const nextRun: CompetitionRunSummary = {
    ...runRecord.run,
    activePhaseKey: envelope.activePhaseKey,
    completedPhaseKeys: envelope.completedPhaseKeys,
    snapshotVersion: nextVersion,
    lastSavedAt: now,
    updatedAt: now,
  };
  const quotaAwards = buildQuotaAwards(
    runId,
    runRecord.run.cycleId,
    input.quotaAwards,
  );
  const hydratedSnapshot = hydrateSnapshot(input.snapshot, nextRun);

  withTransaction(() => {
    execute(
      `
        UPDATE competition_runs
        SET
          active_phase_key = ?,
          completed_phase_keys_json = ?,
          snapshot_version = ?,
          last_saved_at = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        nextRun.activePhaseKey,
        JSON.stringify(nextRun.completedPhaseKeys),
        nextVersion,
        now,
        now,
        runId,
      ],
    );

    execute(
      `
        UPDATE cycle_runs
        SET updated_at = ?
        WHERE id = ?
      `,
      [now, runRecord.run.cycleRunId],
    );

    execute(
      `
        INSERT INTO competition_snapshots (
          id,
          competition_run_id,
          version,
          snapshot_json,
          quota_awards_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [randomUUID(), runId, nextVersion, JSON.stringify(hydratedSnapshot), JSON.stringify(quotaAwards), now],
    );

    execute("DELETE FROM quota_awards WHERE competition_run_id = ?", [runId]);

    quotaAwards.forEach((award) => {
      execute(
        `
          INSERT INTO quota_awards (
            id,
            cycle_run_id,
            competition_run_id,
            cycle_id,
            discipline,
            country_id,
            gymnast_id,
            apparatus,
            reason,
            position,
            is_nominative,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          award.awardId,
          runRecord.run.cycleRunId,
          runId,
          award.cycleId,
          award.discipline,
          award.countryId,
          award.gymnastId,
          award.apparatus,
          award.reason,
          award.position,
          award.isNominative ? 1 : 0,
          now,
        ],
      );
    });

    syncWorldCupTables(runRecord.run, isObjectRecord(input.snapshot) ? input.snapshot : {});
  });

  const quotas = await syncQuotaLedger(runRecord.run.cycleId, runRecord.run.cycleRunId);

  return {
    run: nextRun,
    config: runRecord.config,
    snapshot: hydratedSnapshot,
    quotas,
  };
};
