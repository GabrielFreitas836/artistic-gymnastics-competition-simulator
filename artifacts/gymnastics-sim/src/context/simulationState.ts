import {
  CompetitionCode,
  PhaseKey,
  Discipline,
  AllAroundFinalSlot,
  Apparatus,
  ApparatusKey,
  ApparatusFinalSlot,
  DnsEntryKey,
  MixedGroup,
  Score,
  SimulationHydrationPayload,
  SimulationState,
  Team,
  TeamFinalSlot,
} from "@/lib/types";
import { createApparatusMap, createSubdivisionsSkeleton } from "@/lib/competition";
import { getCompetitionConfig } from "@/lib/competitionRun";
import { createEmptyQualificationStandByUsage } from "@/lib/teamRoster";
import { createEmptyWorldCupSeriesState } from "@/lib/worldCup";

export type SimulationAction =
  | { type: "INITIALIZE_RUN"; payload: { competitionCode: CompetitionCode } }
  | { type: "SET_DISCIPLINE"; payload: Discipline }
  | { type: "SET_PHASE"; payload: number }
  | { type: "SET_ACTIVE_PHASE"; payload: PhaseKey }
  | {
      type: "SET_PERSISTENCE_META";
      payload: Partial<
        Pick<
          SimulationState,
          "runId" | "snapshotVersion" | "lastSavedAt" | "persistenceSource"
        >
      >;
    }
  | { type: "SET_COUNTRIES"; payload: string[] }
  | { type: "SET_TEAMS"; payload: Record<string, Team> }
  | { type: "SET_MIXED_GROUPS"; payload: Record<string, MixedGroup> }
  | { type: "SET_SUBDIVISIONS"; payload: SimulationState["subdivisions"] }
  | { type: "SET_QUALIFICATION_STANDBY_USAGE"; payload: SimulationState["qualificationStandByUsage"] }
  | { type: "SET_APPARATUS_ORDER"; payload: SimulationState["apparatusOrder"] }
  | { type: "SET_TEAM_FINAL_SLOTS"; payload: TeamFinalSlot[] }
  | {
      type: "UPDATE_TEAM_FINAL_LINEUP";
      payload: { teamId: string; apparatus: ApparatusKey; gymnastIds: string[] };
    }
  | { type: "SET_AA_FINAL_SLOTS"; payload: AllAroundFinalSlot[] }
  | {
      type: "SET_APPARATUS_FINAL_SLOTS";
      payload: { apparatus: ApparatusKey; slots: ApparatusFinalSlot[] };
    }
  | {
      type: "COMPLETE_WORLD_CUP_STAGE";
      payload: {
        summary: import("@/lib/types").WorldCupStageSummary;
        advance: boolean;
      };
    }
  | { type: "HYDRATE_SIMULATION"; payload: SimulationHydrationPayload }
  | {
      type: "UPDATE_SCORE";
      payload: { gymnastId: string; app: Apparatus; score: Score; vIndex?: 0 | 1 };
    }
  | {
      type: "UPDATE_TEAM_FINAL_SCORE";
      payload: { gymnastId: string; app: ApparatusKey; score: Score };
    }
  | {
      type: "UPDATE_AA_FINAL_SCORE";
      payload: { gymnastId: string; app: ApparatusKey; score: Score };
    }
  | {
      type: "UPDATE_APPARATUS_FINAL_SCORE";
      payload: {
        apparatus: ApparatusKey;
        gymnastId: string;
        app: Apparatus;
        score: Score;
        vIndex?: 0 | 1;
      };
    }
  | { type: "TOGGLE_DNS"; payload: { gymnastId: string; key: DnsEntryKey } }
  | { type: "TOGGLE_TEAM_FINAL_DNS"; payload: { gymnastId: string; key: DnsEntryKey } }
  | { type: "TOGGLE_AA_FINAL_DNS"; payload: { gymnastId: string; key: DnsEntryKey } }
  | {
      type: "TOGGLE_APPARATUS_FINAL_DNS";
      payload: { apparatus: ApparatusKey; gymnastId: string; key: DnsEntryKey };
    }
  | { type: "RESET_TEAM_FINAL" }
  | { type: "RESET_AA_FINAL" }
  | { type: "RESET_APPARATUS_FINAL"; payload: { apparatus: ApparatusKey } }
  | { type: "RESET" };

export const createEmptyTeamFinalState = (): SimulationState["finals"]["teamFinal"] => ({
  slots: [],
  lineups: {},
  scores: {},
  dns: {},
});

export const createEmptyAllAroundFinalState = (): SimulationState["finals"]["allAroundFinal"] => ({
  slots: [],
  scores: {},
  dns: {},
});

export const createEmptyApparatusFinalState = (): SimulationState["finals"]["apparatusFinals"]["VT"] => ({
  slots: [],
  scores: {},
  dns: {},
});

export const createEmptyApparatusFinalsState = (): SimulationState["finals"]["apparatusFinals"] => ({
  ...createApparatusMap(() => createEmptyApparatusFinalState()),
});

export const createEmptyFinalsState = (): SimulationState["finals"] => ({
  teamFinal: createEmptyTeamFinalState(),
  allAroundFinal: createEmptyAllAroundFinalState(),
  apparatusFinals: createEmptyApparatusFinalsState(),
});

export const createInitialState = (
  competitionCode: CompetitionCode = "OLYMPICS_WAG_2024",
): SimulationState => {
  const config = getCompetitionConfig(competitionCode);
  const firstPhase = config.phasePipeline[0];

  return {
    runId: null,
    cycleId: config.cycleId,
    competitionCode,
    discipline: config.discipline,
    year: config.year,
    activePhaseKey: firstPhase.key,
    completedPhaseKeys: [],
    snapshotVersion: 0,
    persistenceSource: "local-cache",
    lastSavedAt: null,
    phase: firstPhase.legacyPhase || 1,
    selectedCountries: [],
    teams: {},
    mixedGroups: {},
    subdivisions: createSubdivisionsSkeleton(
      config.discipline,
      config.entryConstraints.subdivisionCount,
    ),
    scores: {},
    dns: {},
    qualificationStandByUsage: createEmptyQualificationStandByUsage(),
    apparatusOrder: {},
    finals: createEmptyFinalsState(),
    worldCupSeries: createEmptyWorldCupSeriesState(),
  };
};

export const initialState: SimulationState = createInitialState();
