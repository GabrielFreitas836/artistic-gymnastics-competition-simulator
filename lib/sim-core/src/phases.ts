import { FIG_PARIS_2024_CONFIGS } from "./configs";
import {
  CompetitionCode,
  CompetitionConfig,
  CompetitionRunEnvelope,
  PhaseDefinition,
  PhaseKey,
} from "./types";

export const getCompetitionConfig = (competitionCode: CompetitionCode): CompetitionConfig =>
  FIG_PARIS_2024_CONFIGS[competitionCode];

export const getPhasePipeline = (competitionCode: CompetitionCode): PhaseDefinition[] =>
  getCompetitionConfig(competitionCode).phasePipeline;

export const getPhaseDefinition = (
  competitionCode: CompetitionCode,
  phaseKey: PhaseKey,
): PhaseDefinition | undefined =>
  getPhasePipeline(competitionCode).find((phase) => phase.key === phaseKey);

export const getFirstPhase = (competitionCode: CompetitionCode): PhaseDefinition =>
  getPhasePipeline(competitionCode)[0];

export const getNextPhase = (
  competitionCode: CompetitionCode,
  currentPhaseKey: PhaseKey,
): PhaseDefinition | undefined => {
  const pipeline = getPhasePipeline(competitionCode);
  const index = pipeline.findIndex((phase) => phase.key === currentPhaseKey);
  return index === -1 ? undefined : pipeline[index + 1];
};

export const getPreviousPhase = (
  competitionCode: CompetitionCode,
  currentPhaseKey: PhaseKey,
): PhaseDefinition | undefined => {
  const pipeline = getPhasePipeline(competitionCode);
  const index = pipeline.findIndex((phase) => phase.key === currentPhaseKey);
  return index > 0 ? pipeline[index - 1] : undefined;
};

export const getPhaseIndex = (
  competitionCode: CompetitionCode,
  phaseKey: PhaseKey,
): number => getPhasePipeline(competitionCode).findIndex((phase) => phase.key === phaseKey);

export const getCompletionKeysUpTo = (
  competitionCode: CompetitionCode,
  phaseKey: PhaseKey,
): PhaseKey[] =>
  getPhasePipeline(competitionCode)
    .filter((phase) => getPhaseIndex(competitionCode, phase.key) < getPhaseIndex(competitionCode, phaseKey))
    .map((phase) => phase.key);

export const resolveRouteForPhase = (
  competitionCode: CompetitionCode,
  phaseKey: PhaseKey,
): string => getPhaseDefinition(competitionCode, phaseKey)?.route || "/";

export const resolveLegacyPhaseNumber = (
  competitionCode: CompetitionCode,
  phaseKey: PhaseKey,
): number | null => getPhaseDefinition(competitionCode, phaseKey)?.legacyPhase ?? null;

export const updateEnvelopePhase = <TEnvelope extends CompetitionRunEnvelope>(
  envelope: TEnvelope,
  phaseKey: PhaseKey,
): TEnvelope => {
  const previousCompletion = new Set(envelope.completedPhaseKeys);
  getCompletionKeysUpTo(envelope.competitionCode, phaseKey).forEach((key) => previousCompletion.add(key));

  return {
    ...envelope,
    activePhaseKey: phaseKey,
    completedPhaseKeys: [...previousCompletion],
  };
};
