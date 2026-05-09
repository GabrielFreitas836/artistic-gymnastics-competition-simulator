import { useMemo, useState } from "react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { getCompetitionConfig, getNextRunPhase } from "@/lib/competitionRun";
import { getFinalsAvailability } from "@/features/finals/shared/selectors/finalsAvailabilitySelectors";
import { getApparatusForDiscipline } from "@/lib/competition";
import { RankedGymnast, RankedTeam } from "@/lib/simulation/rankings";
import { selectAllGymnasts } from "@/lib/simulation/selectors";
import {
  getAllAroundRankings,
  getApparatusRanking,
  getTeamRankings,
} from "@/lib/simulation/rankings";
import { ApparatusKey } from "@/lib/types";

import { getCompetitionEventRanking } from "../selectors/competitionResultsSelectors";
import { getDefaultResultsTab, ResultsTab } from "../selectors/resultsSelectors";

type QualificationResultsRankings = {
  TEAM: RankedTeam[];
  AA: RankedGymnast[];
} & Partial<Record<ApparatusKey, RankedGymnast[]>>;

export const useQualificationResultsController = () => {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const competitionConfig = useMemo(() => getCompetitionConfig(state), [state]);
  const [activeTab, setActiveTab] = useState<ResultsTab>(
    getDefaultResultsTab(state.discipline, competitionConfig),
  );

  const allGymnasts = useMemo(() => selectAllGymnasts(state), [state]);
  const apparatusTabs = useMemo(
    () => [...getApparatusForDiscipline(state.discipline)],
    [state.discipline],
  );

  const rankings = useMemo(
    () => {
      const apparatusRankings = apparatusTabs.reduce<Record<string, RankedGymnast[]>>(
        (accumulator, apparatus) => {
          accumulator[apparatus] = getCompetitionEventRanking(state, apparatus);
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
      apparatusTabs,
      competitionConfig,
      state.discipline,
      state.dns,
      state.qualificationStandByUsage,
      state.scores,
      state.teams,
      state,
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
    const nextPhase = getNextRunPhase(state);
    if (nextPhase && state.activePhaseKey !== "finals") {
      dispatch({ type: "SET_ACTIVE_PHASE", payload: nextPhase.key });
    }
    setLocation(route);
  };

  return {
    state,
    competitionConfig,
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
