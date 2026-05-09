import {
  CompetitionCode,
  CompetitionConfig,
  PhaseKey,
  getCompetitionConfig as getSharedCompetitionConfig,
  getFirstPhase,
  getNextPhase,
  getPhaseDefinition,
  getPhaseIndex,
  getPhasePipeline,
  getPreviousPhase,
  resolveCompetitionCodeFromDiscipline,
  resolveLegacyPhaseNumber,
  resolvePhaseKeyFromLegacyPhase,
  resolveRouteForPhase,
  updateEnvelopePhase,
} from "@workspace/sim-core";

import { SimulationState } from "./types";

export const getCompetitionConfig = (
  stateOrCode: SimulationState | CompetitionCode,
): CompetitionConfig =>
  typeof stateOrCode === "string"
    ? getSharedCompetitionConfig(stateOrCode)
    : getSharedCompetitionConfig(stateOrCode.competitionCode);

export const getRunPhasePipeline = (state: SimulationState) =>
  getPhasePipeline(state.competitionCode);

export const getRunPhaseDefinition = (
  state: SimulationState,
  phaseKey: PhaseKey = state.activePhaseKey,
) => getPhaseDefinition(state.competitionCode, phaseKey);

export const getRunStepCount = (state: SimulationState): number =>
  getRunPhasePipeline(state).length;

export const getRunStepNumber = (
  state: SimulationState,
  phaseKey: PhaseKey = state.activePhaseKey,
): number => {
  const phaseIndex = getPhaseIndex(state.competitionCode, phaseKey);
  return phaseIndex >= 0 ? phaseIndex + 1 : 1;
};

export const getRunRoute = (
  state: Pick<SimulationState, "competitionCode">,
  phaseKey: PhaseKey,
): string => resolveRouteForPhase(state.competitionCode, phaseKey);

export const getNextRunPhase = (state: SimulationState) =>
  getNextPhase(state.competitionCode, state.activePhaseKey);

export const getPreviousRunPhase = (state: SimulationState) =>
  getPreviousPhase(state.competitionCode, state.activePhaseKey);

export const resolveRunPhaseKey = (
  state: Pick<SimulationState, "competitionCode" | "discipline">,
  phase: number,
): PhaseKey => {
  const defaultCompetitionCode =
    state.competitionCode || resolveCompetitionCodeFromDiscipline(state.discipline);
  return resolvePhaseKeyFromLegacyPhase(defaultCompetitionCode, phase);
};

export const applyRunPhase = (
  state: SimulationState,
  phaseKey: PhaseKey,
): SimulationState => {
  const envelope = updateEnvelopePhase(state, phaseKey);
  return {
    ...state,
    ...envelope,
    phase: resolveLegacyPhaseNumber(state.competitionCode, phaseKey) || getRunStepNumber(state, phaseKey),
  };
};

export const createRunIdentity = (competitionCode: CompetitionCode) => {
  const config = getSharedCompetitionConfig(competitionCode);
  const firstPhase = getFirstPhase(competitionCode);
  return {
    runId: null,
    cycleId: config.cycleId,
    competitionCode,
    discipline: config.discipline,
    year: config.year,
    activePhaseKey: firstPhase.key,
    completedPhaseKeys: [] as PhaseKey[],
    snapshotVersion: 0,
    persistenceSource: "local-cache" as const,
    lastSavedAt: null,
    phase: resolveLegacyPhaseNumber(competitionCode, firstPhase.key) || 1,
  };
};

export const getCompetitionDisplayLabel = (state: SimulationState): string =>
  getCompetitionConfig(state).label;

export const getCompetitionShortLabel = (state: SimulationState): string =>
  getCompetitionConfig(state).shortLabel;

export const supportsPhase = (state: SimulationState, phaseKey: PhaseKey): boolean =>
  Boolean(getRunPhaseDefinition(state, phaseKey));
