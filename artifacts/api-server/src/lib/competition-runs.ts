import { and, desc, eq } from "drizzle-orm";
import {
  competitionRunsTable,
  competitionSnapshotsTable,
  cycleRunsTable,
  db,
  quotaAwardsTable,
  quotaLedgerTable,
  type CompetitionRunRow,
  type CycleRunRow,
} from "@workspace/db";
import {
  aggregateQuotaLedger,
  buildOlympicRosterEntries,
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

type SnapshotEnvelope = ReturnType<typeof competitionRunEnvelopeSchema.parse>;

const toIsoString = (value: Date | string | null | undefined): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
  competitionCode: row.competitionCode as CompetitionCode,
  discipline: row.discipline === "MAG" ? "MAG" : "WAG",
  year: row.year,
  activePhaseKey: row.activePhaseKey as CompetitionRunSummary["activePhaseKey"],
  completedPhaseKeys: [],
  snapshotVersion: row.snapshotVersion,
  persistenceSource: "remote",
  lastSavedAt: row.lastSavedAt ? toIsoString(row.lastSavedAt) : null,
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
    awardId: award.awardId || crypto.randomUUID(),
    cycleId,
    competitionRunId: runId,
    reason: award.reason || `Award ${index + 1}`,
  }));

export class RunNotFoundError extends Error {}
export class SnapshotConflictError extends Error {}
export class CycleRunNotFoundError extends Error {}

const selectLatestCycleRun = async (
  cycleId: string,
): Promise<CycleRunRow | null> => {
  const rows = await db
    .select()
    .from(cycleRunsTable)
    .where(eq(cycleRunsTable.cycleId, cycleId))
    .orderBy(desc(cycleRunsTable.updatedAt))
    .limit(1);

  return rows[0] || null;
};

const selectCompetitionRunRows = async (
  cycleId?: string,
  cycleRunId?: string | null,
): Promise<CompetitionRunRow[]> => {
  const filters = [];

  if (cycleId) {
    filters.push(eq(competitionRunsTable.cycleId, cycleId));
  }

  if (cycleRunId) {
    filters.push(eq(competitionRunsTable.cycleRunId, cycleRunId));
  }

  let query = db.select().from(competitionRunsTable);
  if (filters.length === 1) {
    query = query.where(filters[0]);
  } else if (filters.length > 1) {
    query = query.where(and(...filters));
  }

  return query.orderBy(desc(competitionRunsTable.updatedAt));
};

const getLatestSnapshotRow = async (runId: string) => {
  const rows = await db
    .select()
    .from(competitionSnapshotsTable)
    .where(eq(competitionSnapshotsTable.competitionRunId, runId))
    .orderBy(desc(competitionSnapshotsTable.version))
    .limit(1);

  return rows[0] || null;
};

const ensureCycleRun = async (
  cycleId: string,
  cycleRunId?: string | null,
  cycleRunLabel?: string | null,
): Promise<CycleRunRow> => {
  if (cycleRunId) {
    const rows = await db
      .select()
      .from(cycleRunsTable)
      .where(eq(cycleRunsTable.id, cycleRunId))
      .limit(1);

    const existing = rows[0];
    if (!existing || existing.cycleId !== cycleId) {
      throw new CycleRunNotFoundError(`Cycle run ${cycleRunId} was not found for ${cycleId}.`);
    }

    return existing;
  }

  const latest = await selectLatestCycleRun(cycleId);
  if (latest) {
    return latest;
  }

  const now = new Date();
  const inserted = await db
    .insert(cycleRunsTable)
    .values({
      id: crypto.randomUUID(),
      cycleId,
      label: cycleRunLabel || `${cycleId} journey`,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return inserted[0] as CycleRunRow;
};

const syncQuotaLedger = async (
  cycleId: string,
  cycleRunId: string,
): Promise<CycleQuotaSummary> => {
  const awardRows = await db
    .select()
    .from(quotaAwardsTable)
    .where(eq(quotaAwardsTable.cycleRunId, cycleRunId));

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
    isNominative: row.isNominative,
  }));

  const ledger = aggregateQuotaLedger(cycleId, awards);
  const olympicRoster = buildOlympicRosterEntries(ledger);
  const now = new Date();

  await db.delete(quotaLedgerTable).where(eq(quotaLedgerTable.cycleRunId, cycleRunId));

  if (ledger.length > 0) {
    await db.insert(quotaLedgerTable).values(
      ledger.map((entry) => ({
        id: crypto.randomUUID(),
        cycleRunId,
        cycleId: entry.cycleId,
        discipline: entry.discipline,
        countryId: entry.countryId,
        nominativeGymnastIds: entry.nominativeGymnastIds,
        nonNominativeCount: entry.nonNominativeCount,
        awards: entry.awards,
        updatedAt: now,
      })),
    );
  }

  return {
    cycleId,
    cycleRunId,
    ledger,
    olympicRoster,
  };
};

export const getCycleDirectory = async (): Promise<CycleDirectoryResponse> => {
  const cycleRuns = await db
    .select()
    .from(cycleRunsTable)
    .orderBy(desc(cycleRunsTable.updatedAt));
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

  const rows = await db
    .select()
    .from(quotaLedgerTable)
    .where(eq(quotaLedgerTable.cycleRunId, targetCycleRunId))
    .orderBy(quotaLedgerTable.discipline, quotaLedgerTable.countryId);

  if (rows.length === 0) {
    return syncQuotaLedger(cycleId, targetCycleRunId);
  }

  const ledger = rows.map((row) => ({
    cycleId: row.cycleId,
    discipline: row.discipline === "MAG" ? "MAG" : "WAG",
    countryId: row.countryId,
    nominativeGymnastIds: row.nominativeGymnastIds,
    nonNominativeCount: row.nonNominativeCount,
    awards: row.awards as QuotaAward[],
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
  const now = new Date();
  const runId = crypto.randomUUID();

  await db
    .update(cycleRunsTable)
    .set({ updatedAt: now })
    .where(eq(cycleRunsTable.id, cycleRun.id));

  const insertedRuns = await db
    .insert(competitionRunsTable)
    .values({
      id: runId,
      cycleRunId: cycleRun.id,
      cycleId: config.cycleId,
      competitionCode: config.competitionCode,
      discipline: config.discipline,
      year: config.year,
      activePhaseKey: envelope.activePhaseKey,
      snapshotVersion: 0,
      lastSavedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const run = toCompetitionRunSummary(insertedRuns[0] as CompetitionRunRow);
  run.completedPhaseKeys = envelope.completedPhaseKeys;
  run.lastSavedAt = toIsoString(now);

  const hydratedSnapshot = hydrateSnapshot(
    input.snapshot || envelope,
    {
      ...run,
      snapshotVersion: 0,
      lastSavedAt: toIsoString(now),
    },
  );

  await db.insert(competitionSnapshotsTable).values({
    id: crypto.randomUUID(),
    competitionRunId: runId,
    version: 0,
    snapshot: hydratedSnapshot,
    quotaAwards: [],
    createdAt: now,
  });

  return {
    run,
    config,
    snapshot: hydratedSnapshot,
  };
};

export const getCompetitionRun = async (
  runId: string,
): Promise<CompetitionRunRecord> => {
  const runRows = await db
    .select()
    .from(competitionRunsTable)
    .where(eq(competitionRunsTable.id, runId))
    .limit(1);

  const runRow = runRows[0];
  if (!runRow) {
    throw new RunNotFoundError(`Competition run ${runId} was not found.`);
  }

  const snapshotRow = await getLatestSnapshotRow(runId);
  const run = toCompetitionRunSummary(runRow as CompetitionRunRow);
  const config = getCompetitionConfig(run.competitionCode);
  const snapshot = hydrateSnapshot(snapshotRow?.snapshot || {}, run);

  if (isObjectRecord(snapshot)) {
    run.completedPhaseKeys = Array.isArray(snapshot.completedPhaseKeys)
      ? snapshot.completedPhaseKeys as CompetitionRunSummary["completedPhaseKeys"]
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
  const now = new Date();
  const nextRun: CompetitionRunSummary = {
    ...runRecord.run,
    activePhaseKey: envelope.activePhaseKey,
    completedPhaseKeys: envelope.completedPhaseKeys,
    snapshotVersion: nextVersion,
    lastSavedAt: toIsoString(now),
    updatedAt: toIsoString(now),
  };
  const quotaAwards = buildQuotaAwards(
    runId,
    runRecord.run.cycleId,
    input.quotaAwards,
  );
  const hydratedSnapshot = hydrateSnapshot(input.snapshot, nextRun);

  await db.transaction(async (tx) => {
    await tx
      .update(competitionRunsTable)
      .set({
        activePhaseKey: nextRun.activePhaseKey,
        snapshotVersion: nextVersion,
        lastSavedAt: now,
        updatedAt: now,
      })
      .where(eq(competitionRunsTable.id, runId));

    await tx
      .update(cycleRunsTable)
      .set({ updatedAt: now })
      .where(eq(cycleRunsTable.id, runRecord.run.cycleRunId));

    await tx.insert(competitionSnapshotsTable).values({
      id: crypto.randomUUID(),
      competitionRunId: runId,
      version: nextVersion,
      snapshot: hydratedSnapshot,
      quotaAwards,
      createdAt: now,
    });

    await tx.delete(quotaAwardsTable).where(eq(quotaAwardsTable.competitionRunId, runId));

    if (quotaAwards.length > 0) {
      await tx.insert(quotaAwardsTable).values(
        quotaAwards.map((award) => ({
          id: award.awardId,
          cycleRunId: runRecord.run.cycleRunId,
          competitionRunId: runId,
          cycleId: award.cycleId,
          discipline: award.discipline,
          countryId: award.countryId,
          gymnastId: award.gymnastId,
          apparatus: award.apparatus,
          reason: award.reason,
          position: award.position,
          isNominative: award.isNominative,
          createdAt: now,
        })),
      );
    }
  });

  const quotas = await syncQuotaLedger(runRecord.run.cycleId, runRecord.run.cycleRunId);

  return {
    run: nextRun,
    config: runRecord.config,
    snapshot: hydratedSnapshot,
    quotas,
  };
};
