import { z } from "zod";

export const phaseDefinitionSchema = z.object({
  key: z.enum(["teams", "roster", "entries", "mixed-groups", "rotation", "scoring", "results", "finals"]),
  label: z.string(),
  route: z.string(),
  legacyPhase: z.number().int().positive().optional(),
  isTerminal: z.boolean().optional(),
});

export const competitionRunEnvelopeSchema = z.object({
  runId: z.string().nullable(),
  cycleId: z.string(),
  competitionCode: z.enum([
    "OLYMPICS_WAG_2024",
    "OLYMPICS_MAG_2024",
    "WORLD_CUP_WAG_2024",
    "WORLD_CUP_MAG_2024",
  ]),
  discipline: z.enum(["WAG", "MAG"]),
  year: z.number().int(),
  activePhaseKey: phaseDefinitionSchema.shape.key,
  completedPhaseKeys: z.array(phaseDefinitionSchema.shape.key),
  snapshotVersion: z.number().int().nonnegative(),
  persistenceSource: z.enum(["legacy-local", "local-cache", "remote"]),
  lastSavedAt: z.string().nullable(),
});

export const quotaAwardSchema = z.object({
  awardId: z.string(),
  cycleId: z.string(),
  competitionRunId: z.string(),
  discipline: z.enum(["WAG", "MAG"]),
  countryId: z.string(),
  gymnastId: z.string().nullable(),
  apparatus: z.string().nullable(),
  reason: z.string(),
  position: z.number().int().nullable(),
  isNominative: z.boolean(),
});

export const quotaLedgerEntrySchema = z.object({
  cycleId: z.string(),
  discipline: z.enum(["WAG", "MAG"]),
  countryId: z.string(),
  nominativeGymnastIds: z.array(z.string()),
  nonNominativeCount: z.number().int().nonnegative(),
  awards: z.array(quotaAwardSchema),
});

export const olympicRosterEntrySchema = z.object({
  discipline: z.enum(["WAG", "MAG"]),
  countryId: z.string(),
  nominativeGymnastIds: z.array(z.string()),
  nonNominativeCount: z.number().int().nonnegative(),
  totalQuotaSlots: z.number().int().nonnegative(),
  awards: z.array(quotaAwardSchema),
});

export const competitionConfigSchema = z.object({
  competitionCode: competitionRunEnvelopeSchema.shape.competitionCode,
  competitionKind: z.enum(["OLYMPICS", "WORLD_CUP"]),
  cycleId: z.string(),
  discipline: z.enum(["WAG", "MAG"]),
  year: z.number().int(),
  label: z.string(),
  shortLabel: z.string(),
  locationLabel: z.string(),
  phasePipeline: z.array(phaseDefinitionSchema).min(1),
  resultStrategies: z.array(
    z.object({
      channel: z.enum(["TEAM", "TEAM_APP", "AA", "APPARATUS", "MEDAL_SUMMARY"]),
      mode: z.enum(["qualification_only", "finals_based", "mixed"]),
      appliesTo: z.array(z.string()).optional(),
    }),
  ),
  quotaStrategy: z.enum(["none", "world_cup_series"]),
  entryConstraints: z.object({
    selectedCountryCount: z.number().int().positive().optional(),
    rosterFormats: z.array(z.union([z.literal(3), z.literal(5)])).optional(),
    maxGymnastsPerCountry: z.number().int().positive().optional(),
    maxGymnastsTotal: z.number().int().positive().optional(),
    maxPerApparatus: z.number().int().positive().optional(),
    mixedGroupCount: z.number().int().nonnegative().optional(),
    mixedGymnastTotal: z.number().int().nonnegative().optional(),
    subdivisionCount: z.number().int().positive(),
    entitiesPerSubdivision: z.number().int().positive(),
    qualificationRotationCount: z.number().int().positive(),
  }),
  uiCapabilities: z.object({
    supportsQuickSetup: z.boolean(),
    supportsCountrySelection: z.boolean(),
    supportsRosterBuilder: z.boolean(),
    supportsEntryBuilder: z.boolean(),
    supportsMixedGroups: z.boolean(),
    supportsTeamResults: z.boolean(),
    supportsTeamApparatusResults: z.boolean(),
    supportsAllAroundResults: z.boolean(),
    supportsFinalsHub: z.boolean(),
    supportsTeamFinal: z.boolean(),
    supportsAllAroundFinal: z.boolean(),
    supportsMedalSummary: z.boolean(),
  }),
  finalsConfiguration: z.object({
    hasTeamFinal: z.boolean(),
    hasAAFinal: z.boolean(),
    hasApparatusFinals: z.boolean(),
    medalSummaryUnlockedBy: z.array(z.enum(["TEAM", "AA", "APPARATUS"])),
    autoComputedFinals: z.array(z.enum(["TEAM", "AA", "APPARATUS"])).optional(),
  }),
});

export const cycleRunSummarySchema = z.object({
  cycleRunId: z.string(),
  cycleId: z.string(),
  label: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const competitionRunSummarySchema = competitionRunEnvelopeSchema.extend({
  cycleRunId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const competitionRunRecordSchema = z.object({
  run: competitionRunSummarySchema,
  config: competitionConfigSchema,
  snapshot: z.unknown(),
});

export const createCompetitionRunInputSchema = z.object({
  cycleId: z.string(),
  competitionCode: competitionRunEnvelopeSchema.shape.competitionCode,
  cycleRunId: z.string().nullable().optional(),
  cycleRunLabel: z.string().nullable().optional(),
  snapshot: z.unknown().optional(),
});

export const saveCompetitionSnapshotInputSchema = z.object({
  snapshot: z.unknown(),
  expectedVersion: z.number().int().nonnegative(),
  quotaAwards: z.array(quotaAwardSchema).optional(),
});

export const cycleQuotaSummarySchema = z.object({
  cycleId: z.string(),
  cycleRunId: z.string().nullable(),
  ledger: z.array(quotaLedgerEntrySchema),
  olympicRoster: z.array(olympicRosterEntrySchema),
});

export const cycleDirectoryResponseSchema = z.object({
  cycles: z.array(
    z.object({
      cycleId: z.string(),
      label: z.string(),
      description: z.string(),
      years: z.array(
        z.object({
          year: z.number().int(),
          items: z.array(
            z.object({
              competitionCode: competitionRunEnvelopeSchema.shape.competitionCode,
              cycleId: z.string(),
              discipline: z.enum(["WAG", "MAG"]),
              year: z.number().int(),
              label: z.string(),
              shortLabel: z.string(),
              competitionKind: z.enum(["OLYMPICS", "WORLD_CUP"]),
            }),
          ),
        }),
      ),
    }),
  ),
  cycleRuns: z.array(cycleRunSummarySchema),
  competitionRuns: z.array(competitionRunSummarySchema),
});

export const cycleDetailResponseSchema = z.object({
  cycle: cycleDirectoryResponseSchema.shape.cycles.element,
  cycleRunId: z.string().nullable(),
  templates: cycleDirectoryResponseSchema.shape.cycles.element.shape.years.element.shape.items,
  competitionRuns: z.array(competitionRunSummarySchema),
});

export const saveCompetitionSnapshotResultSchema = z.object({
  run: competitionRunSummarySchema,
  config: competitionConfigSchema,
  snapshot: z.unknown(),
  quotas: cycleQuotaSummarySchema,
});
