import { getCompetitionConfig } from "@/lib/competitionRun";
import { getApparatusFinalRankings, isApparatusFinalComplete } from "@/lib/simulation/finals/apparatus";
import { getEventFinalRankings, RankedGymnast } from "@/lib/simulation/rankings";
import { selectAllGymnasts } from "@/lib/simulation/selectors";
import { ApparatusKey, SimulationState } from "@/lib/types";

const convertFinalRankingRow = (
  row: ReturnType<typeof getApparatusFinalRankings>[number],
  fallbackRank: number,
): RankedGymnast => ({
  gymnast: row.gymnast,
  total: row.resultState === "OK" ? row.total : null,
  rank: row.rank ?? fallbackRank,
  resultState: row.resultState,
  status: "Q",
  tbE: row.tbE,
  tbD: row.tbD,
  tbPenalty: 0,
  tied: row.tied,
});

export const getCompetitionEventRanking = (
  state: SimulationState,
  apparatus: ApparatusKey,
): RankedGymnast[] => {
  const competitionConfig = getCompetitionConfig(state);
  const reserveCount = competitionConfig.competitionKind === "WORLD_CUP" ? 2 : 3;
  const qualificationRanking = getEventFinalRankings(
    selectAllGymnasts(state),
    apparatus,
    state.scores,
    state.dns,
    state.teams,
    state.qualificationStandByUsage,
    reserveCount,
  );
  const apparatusStrategy = competitionConfig.resultStrategies.find(
    (strategy) => strategy.channel === "APPARATUS",
  );

  if (
    apparatusStrategy?.mode !== "mixed"
    || !competitionConfig.finalsConfiguration.hasApparatusFinals
    || !isApparatusFinalComplete(state, apparatus)
  ) {
    return qualificationRanking;
  }

  const finalRankings = getApparatusFinalRankings(state, apparatus);
  const finalists = finalRankings.map((row, index) => convertFinalRankingRow(row, index + 1));
  const finalistIds = new Set(finalists.map((row) => row.gymnast.id));

  const remainingQualificationRows = qualificationRanking
    .filter((row) => !finalistIds.has(row.gymnast.id))
    .map((row, index) => ({
      ...row,
      rank: finalRankings.length + index + 1,
    }));

  return [...finalists, ...remainingQualificationRows];
};
