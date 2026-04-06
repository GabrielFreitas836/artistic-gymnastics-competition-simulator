import { useMemo, useState } from "react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { getFinalsAvailability } from "@/features/finals/shared/selectors/finalsAvailabilitySelectors";
import { selectAllGymnasts } from "@/lib/simulation/selectors";
import {
  getAllAroundRankings,
  getApparatusRanking,
  getEventFinalRankings,
  getTeamRankings,
} from "@/lib/simulation/rankings";

import { ResultsTab } from "../selectors/resultsSelectors";

export const useQualificationResultsController = () => {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const [activeTab, setActiveTab] = useState<ResultsTab>("TEAM");

  const allGymnasts = useMemo(() => selectAllGymnasts(state), [state]);

  const rankings = useMemo(
    () => ({
      TEAM: getTeamRankings(state.teams, state.scores, state.dns),
      AA: getAllAroundRankings(allGymnasts, state.scores, state.dns),
      VT: getEventFinalRankings(allGymnasts, "VT", state.scores, state.dns),
      UB: getEventFinalRankings(allGymnasts, "UB", state.scores, state.dns),
      BB: getEventFinalRankings(allGymnasts, "BB", state.scores, state.dns),
      FX: getEventFinalRankings(allGymnasts, "FX", state.scores, state.dns),
    }),
    [allGymnasts, state.dns, state.scores, state.teams],
  );

  const teamApparatusRanking = useMemo(
    () => getApparatusRanking(state.teams, state.scores, state.dns),
    [state.dns, state.scores, state.teams],
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
    teamApparatusRanking,
    orderedTeamApparatusRanking,
    finalsAvailability,
    openFinal,
    goBackToScoring: () => setLocation("/scoring"),
  };
};
