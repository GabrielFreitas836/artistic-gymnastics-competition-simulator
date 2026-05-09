import { FIG_PARIS_2024_CONFIGS, FIG_PARIS_2024_CYCLE } from "./configs";
import { CompetitionCode, CompetitionTemplateSummary, CycleSummary } from "./types";

export const listCycles = (): CycleSummary[] => [FIG_PARIS_2024_CYCLE];

export const getCycleSummary = (cycleId: string): CycleSummary | undefined =>
  listCycles().find((cycle) => cycle.cycleId === cycleId);

export const listCompetitionTemplates = (cycleId: string): CompetitionTemplateSummary[] =>
  getCycleSummary(cycleId)?.years.flatMap((group) => group.items) || [];

export const getCompetitionTemplateSummary = (
  competitionCode: CompetitionCode,
): CompetitionTemplateSummary => {
  const config = FIG_PARIS_2024_CONFIGS[competitionCode];
  return {
    competitionCode: config.competitionCode,
    cycleId: config.cycleId,
    discipline: config.discipline,
    year: config.year,
    label: config.label,
    shortLabel: config.shortLabel,
    competitionKind: config.competitionKind,
  };
};
