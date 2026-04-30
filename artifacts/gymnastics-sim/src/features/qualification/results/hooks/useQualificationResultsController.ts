import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { getFinalsAvailability } from "@/features/finals/shared/selectors/finalsAvailabilitySelectors";
import { getApparatusForDiscipline, getDisciplineConfig } from "@/lib/competition";
import { RankedGymnast, RankedTeam } from "@/lib/simulation/rankings";
import { selectAllGymnasts } from "@/lib/simulation/selectors";
import {
  getAllAroundRankings,
  getApparatusRanking,
  getEventFinalRankings,
  getRelativeTeamRankingsForSubdivision,
  getTeamRankings,
  isTeamQualificationComplete,
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
  const [selectedRelativeRotation, setSelectedRelativeRotation] = useState(
    state.qualificationResultsContext.activeRot,
  );

  const allGymnasts = useMemo(() => selectAllGymnasts(state), [state]);
  const apparatusTabs = useMemo(
    () => [...getApparatusForDiscipline(state.discipline)],
    [state.discipline],
  );
  const disciplineConfig = useMemo(() => getDisciplineConfig(state.discipline), [state.discipline]);

  useEffect(() => {
    setSelectedRelativeRotation(state.qualificationResultsContext.activeRot);
  }, [
    state.discipline,
    state.qualificationResultsContext.activeRot,
    state.qualificationResultsContext.activeSub,
  ]);

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
  const finalTeamStatuses = useMemo(
    () => new Map(rankings.TEAM.map((row) => [row.team.countryId, row.status])),
    [rankings.TEAM],
  );
  const isQualificationComplete = useMemo(
    () => isTeamQualificationComplete(
      state.teams,
      state.scores,
      state.dns,
      state.discipline,
      state.qualificationStandByUsage,
    ),
    [state.discipline, state.dns, state.qualificationStandByUsage, state.scores, state.teams],
  );
  const relativeTeamRows = useMemo(
    () => getRelativeTeamRankingsForSubdivision(
      state.teams,
      state.subdivisions,
      state.scores,
      state.dns,
      state.discipline,
      state.qualificationResultsContext.activeSub,
      selectedRelativeRotation,
      state.qualificationStandByUsage,
    ).map((row) => ({
      ...row,
      status: isQualificationComplete
        ? ((finalTeamStatuses.get(row.team.countryId) || "") as RankedTeam["status"])
        : "",
    })),
    [
      finalTeamStatuses,
      isQualificationComplete,
      selectedRelativeRotation,
      state.discipline,
      state.dns,
      state.qualificationResultsContext.activeSub,
      state.qualificationStandByUsage,
      state.scores,
      state.subdivisions,
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
    relativeTeamRows,
    apparatusTabs,
    currentScoringSubdivision: state.qualificationResultsContext.activeSub,
    currentScoringRotation: state.qualificationResultsContext.activeRot,
    rotationCount: disciplineConfig.qualificationRotationCount,
    selectedRelativeRotation,
    setSelectedRelativeRotation: (value: number) =>
      setSelectedRelativeRotation(
        Math.min(Math.max(value, 1), disciplineConfig.qualificationRotationCount),
      ),
    isQualificationComplete,
    teamApparatusRanking,
    orderedTeamApparatusRanking,
    finalsAvailability,
    openFinal,
    goBackToScoring: () => setLocation("/scoring"),
  };
};
