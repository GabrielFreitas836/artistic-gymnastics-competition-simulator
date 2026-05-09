export type Discipline = "WAG" | "MAG";
export type CompetitionKind = "OLYMPICS" | "WORLD_CUP";
export type CompetitionCode =
  | "OLYMPICS_WAG_2024"
  | "OLYMPICS_MAG_2024"
  | "WORLD_CUP_WAG_2024"
  | "WORLD_CUP_MAG_2024";
export type PhaseKey =
  | "teams"
  | "roster"
  | "entries"
  | "mixed-groups"
  | "rotation"
  | "scoring"
  | "results"
  | "finals";
export type ResultChannel =
  | "TEAM"
  | "TEAM_APP"
  | "AA"
  | "APPARATUS"
  | "MEDAL_SUMMARY";
export type ResultStrategyMode =
  | "qualification_only"
  | "finals_based"
  | "mixed";
export type QuotaStrategy = "none" | "world_cup_series";
export type FinalKey = "TEAM" | "AA" | "APPARATUS";
export type PersistenceSource = "legacy-local" | "local-cache" | "remote";

export interface PhaseDefinition {
  key: PhaseKey;
  label: string;
  route: string;
  legacyPhase?: number;
  isTerminal?: boolean;
}

export interface ResultStrategy {
  channel: ResultChannel;
  mode: ResultStrategyMode;
  appliesTo?: string[];
}

export interface FinalsConfiguration {
  hasTeamFinal: boolean;
  hasAAFinal: boolean;
  hasApparatusFinals: boolean;
  medalSummaryUnlockedBy: FinalKey[];
  autoComputedFinals?: FinalKey[];
}

export interface EntryConstraints {
  selectedCountryCount?: number;
  rosterFormats?: Array<3 | 5>;
  maxGymnastsPerCountry?: number;
  maxGymnastsTotal?: number;
  maxPerApparatus?: number;
  mixedGroupCount?: number;
  mixedGymnastTotal?: number;
  subdivisionCount: number;
  entitiesPerSubdivision: number;
  qualificationRotationCount: number;
}

export interface UICapabilities {
  supportsQuickSetup: boolean;
  supportsCountrySelection: boolean;
  supportsRosterBuilder: boolean;
  supportsEntryBuilder: boolean;
  supportsMixedGroups: boolean;
  supportsTeamResults: boolean;
  supportsTeamApparatusResults: boolean;
  supportsAllAroundResults: boolean;
  supportsFinalsHub: boolean;
  supportsTeamFinal: boolean;
  supportsAllAroundFinal: boolean;
  supportsMedalSummary: boolean;
}

export interface CompetitionConfig {
  competitionCode: CompetitionCode;
  competitionKind: CompetitionKind;
  cycleId: string;
  discipline: Discipline;
  year: number;
  label: string;
  shortLabel: string;
  locationLabel: string;
  phasePipeline: PhaseDefinition[];
  resultStrategies: ResultStrategy[];
  quotaStrategy: QuotaStrategy;
  entryConstraints: EntryConstraints;
  uiCapabilities: UICapabilities;
  finalsConfiguration: FinalsConfiguration;
}

export interface CompetitionTemplateSummary {
  competitionCode: CompetitionCode;
  cycleId: string;
  discipline: Discipline;
  year: number;
  label: string;
  shortLabel: string;
  competitionKind: CompetitionKind;
}

export interface CycleCompetitionGroup {
  year: number;
  items: CompetitionTemplateSummary[];
}

export interface CycleSummary {
  cycleId: string;
  label: string;
  description: string;
  years: CycleCompetitionGroup[];
}

export interface CompetitionRunEnvelope {
  runId: string | null;
  cycleId: string;
  competitionCode: CompetitionCode;
  discipline: Discipline;
  year: number;
  activePhaseKey: PhaseKey;
  completedPhaseKeys: PhaseKey[];
  snapshotVersion: number;
  persistenceSource: PersistenceSource;
  lastSavedAt: string | null;
}

export interface QuotaAward {
  awardId: string;
  cycleId: string;
  competitionRunId: string;
  discipline: Discipline;
  countryId: string;
  gymnastId: string | null;
  apparatus: string | null;
  reason: string;
  position: number | null;
  isNominative: boolean;
}

export interface QuotaLedgerEntry {
  cycleId: string;
  discipline: Discipline;
  countryId: string;
  nominativeGymnastIds: string[];
  nonNominativeCount: number;
  awards: QuotaAward[];
}

export interface OlympicRosterEntry {
  discipline: Discipline;
  countryId: string;
  nominativeGymnastIds: string[];
  nonNominativeCount: number;
  totalQuotaSlots: number;
  awards: QuotaAward[];
}

export interface CycleRunSummary {
  cycleRunId: string;
  cycleId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionRunSummary extends CompetitionRunEnvelope {
  cycleRunId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionRunRecord {
  run: CompetitionRunSummary;
  config: CompetitionConfig;
  snapshot: unknown;
}

export interface CreateCompetitionRunInput {
  cycleId: string;
  competitionCode: CompetitionCode;
  cycleRunId?: string | null;
  cycleRunLabel?: string | null;
  snapshot?: unknown;
}

export interface SaveCompetitionSnapshotInput {
  snapshot: unknown;
  expectedVersion: number;
  quotaAwards?: QuotaAward[];
}

export interface CycleQuotaSummary {
  cycleId: string;
  cycleRunId: string | null;
  ledger: QuotaLedgerEntry[];
  olympicRoster: OlympicRosterEntry[];
}

export interface CycleDirectoryResponse {
  cycles: CycleSummary[];
  cycleRuns: CycleRunSummary[];
  competitionRuns: CompetitionRunSummary[];
}

export interface CycleDetailResponse {
  cycle: CycleSummary;
  cycleRunId: string | null;
  templates: CompetitionTemplateSummary[];
  competitionRuns: CompetitionRunSummary[];
}

export interface SaveCompetitionSnapshotResult {
  run: CompetitionRunSummary;
  config: CompetitionConfig;
  snapshot: unknown;
  quotas: CycleQuotaSummary;
}
