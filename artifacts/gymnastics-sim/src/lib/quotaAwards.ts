import type { QuotaAward } from "@workspace/sim-core";

import { getCompetitionConfig } from "@/lib/competitionRun";
import { getApparatusFinalRankings, getApparatusFinals, isApparatusFinalComplete } from "@/lib/simulation/finals/apparatus";
import { SimulationState } from "@/lib/types";

export const deriveQuotaAwardsForState = (
  state: SimulationState,
): QuotaAward[] => {
  const competitionConfig = getCompetitionConfig(state);

  if (competitionConfig.quotaStrategy !== "world_cup_series") {
    return [];
  }

  return getApparatusFinals(state.discipline).flatMap((apparatus) => {
    if (!isApparatusFinalComplete(state, apparatus)) {
      return [];
    }

    return getApparatusFinalRankings(state, apparatus)
      .filter((row) => row.rank === 1 && row.resultState === "OK")
      .map<QuotaAward>((row) => ({
        awardId: `${state.competitionCode}:${apparatus}:${row.gymnast.id}`,
        cycleId: state.cycleId,
        competitionRunId: state.runId || "",
        discipline: state.discipline,
        countryId: row.gymnast.countryId,
        gymnastId: row.gymnast.id,
        apparatus,
        reason: `World Cup ${apparatus} apparatus winner`,
        position: 1,
        isNominative: true,
      }));
  });
};
