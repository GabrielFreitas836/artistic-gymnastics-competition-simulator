import { useMemo, useState } from "react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { getFinalsAvailability } from "@/features/finals/shared/selectors/finalsAvailabilitySelectors";
import { getApparatusForDiscipline } from "@/lib/competition";
import { RankedGymnast, RankedTeam } from "@/lib/simulation/rankings";
import { selectAllGymnasts } from "@/lib/simulation/selectors";
import {
  getAllAroundRankings,
  getApparatusRanking,
  getEventFinalRankings,
  getTeamRankings,
} from "@/lib/simulation/rankings";
import { ApparatusKey } from "@/lib/types";

import { ResultsTab } from "../selectors/resultsSelectors";

type QualificationResultsRankings = {
  TEAM: RankedTeam[];
  AA: RankedGymnast[];
} & Partial<Record<ApparatusKey, RankedGymnast[]>>;

export const useQualificationResultsController = () => {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const [activeTab, setActiveTab] = useState<ResultsTab>("TEAM");

  const allGymnasts = useMemo(() => selectAllGymnasts(state), [state]);
  const apparatusTabs = useMemo(
    () => [...getApparatusForDiscipline(state.discipline)],
    [state.discipline],
  );

  const rankings = useMemo(
    () => {
      const apparatusRankings = apparatusTabs.reduce<Record<string, ReturnType<typeof getEventFinalRankings>>>(
        (accumulator, apparatus) => {
          accumulator[apparatus] = getEventFinalRankings(
            allGymnasts,
            apparatus,
            state.scores,
            state.dns,
            state.teams,
            state.qualificationStandByUsage,
          );
          return accumulator;
        },
        {},
      );

      return {
        TEAM: getTeamRankings(
          state.teams,
          state.scores,
          state.dns,
          state.discipline,
          state.qualificationStandByUsage,
        ),
        AA: getAllAroundRankings(
          allGymnasts,
          state.scores,
          state.dns,
          state.discipline,
          state.teams,
          state.qualificationStandByUsage,
        ),
        ...apparatusRankings,
      } as QualificationResultsRankings;
    },
    [
      allGymnasts,
      apparatusTabs,
      state.discipline,
      state.dns,
      state.qualificationStandByUsage,
      state.scores,
      state.teams,
    ],
  );

  const teamApparatusRanking = useMemo(
    () => getApparatusRanking(
      state.teams,
      state.scores,
      state.dns,
      state.discipline,
      state.qualificationStandByUsage,
    ),
    [state.discipline, state.dns, state.qualificationStandByUsage, state.scores, state.teams],
  );

  const orderedTeamApparatusRanking = useMemo(() => {
    const rowsByTeamId = new Map(
      teamApparatusRanking.map((row) => [row.team.countryId, row]),
    );

    return rankings.TEAM.map((teamRow) => rowsByTeamId.get(teamRow.team.countryId)).filter(
      (row): row is (typeof teamApparatusRanking)[number] => Boolean(row),
    );
  }, [rankings.TEAM, teamApparatusRanking]);

  const finalsAvailability = useMemo(() => getFinalsAvailability(state), [state]);

  const openFinal = (route: string, isEnabled: boolean) => {
    if (!isEnabled) return;
    if (state.phase < 7) dispatch({ type: "SET_PHASE", payload: 7 });
    setLocation(route);
  };

  return {
    state,
    activeTab,
    setActiveTab,
    rankings,
    apparatusTabs,
    teamApparatusRanking,
    orderedTeamApparatusRanking,
    finalsAvailability,
    openFinal,
    goBackToScoring: () => setLocation("/scoring"),
  };
};
