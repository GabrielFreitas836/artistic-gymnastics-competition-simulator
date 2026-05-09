import { getFirstPhase } from "./phases";
import {
  CompetitionCode,
  CompetitionRunEnvelope,
  PhaseKey,
} from "./types";

const LEGACY_PHASE_TO_KEY: Record<number, PhaseKey> = {
  1: "teams",
  2: "roster",
  3: "mixed-groups",
  4: "rotation",
  5: "scoring",
  6: "results",
  7: "finals",
};

export const resolveCompetitionCodeFromDiscipline = (
  discipline: "WAG" | "MAG",
): CompetitionCode => (discipline === "MAG" ? "OLYMPICS_MAG_2024" : "OLYMPICS_WAG_2024");

export const resolvePhaseKeyFromLegacyPhase = (
  competitionCode: CompetitionCode,
  phase?: number | null,
): PhaseKey => {
  if (phase && LEGACY_PHASE_TO_KEY[phase]) {
    return LEGACY_PHASE_TO_KEY[phase];
  }

  return getFirstPhase(competitionCode).key;
};

export interface LegacySimulationLike {
  discipline?: "WAG" | "MAG";
  phase?: number;
}

export const createEnvelopeFromLegacyState = (
  legacyState?: LegacySimulationLike | null,
): CompetitionRunEnvelope => {
  const discipline = legacyState?.discipline || "WAG";
  const competitionCode = resolveCompetitionCodeFromDiscipline(discipline);
  const activePhaseKey = resolvePhaseKeyFromLegacyPhase(competitionCode, legacyState?.phase);

  return {
    runId: null,
    cycleId: "fig-paris-2024",
    competitionCode,
    discipline,
    year: 2024,
    activePhaseKey,
    completedPhaseKeys: [],
    snapshotVersion: 0,
    persistenceSource: "legacy-local",
    lastSavedAt: null,
  };
};
