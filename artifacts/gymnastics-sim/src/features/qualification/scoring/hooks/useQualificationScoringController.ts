import { useMemo } from "react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { useScoreDraftFields } from "@/features/shared/hooks/useScoreDraftFields";
import { useTimedIndicator } from "@/features/shared/hooks/useTimedIndicator";
import { buildScoreDraftKey, ScoreField } from "@/features/shared/utils/scoreInput";
import { getApparatusForDiscipline, getDisciplineConfig } from "@/lib/competition";
import {
  calculateScore,
  getDnsEntryKeyForApp,
  isDnsActive,
} from "@/lib/simulation/scoring";
import { getEventFinalRankings } from "@/lib/simulation/rankings";
import { Apparatus, ApparatusKey, DnsEntryKey, Score } from "@/lib/types";
import { getTeamStandByGymnast, getTeamTitularDnsCount, isTitularOnApparatus } from "@/lib/teamRoster";

import {
  getQualificationLiveRankingInput,
  getQualificationScoringEntitiesByApparatus,
} from "../selectors/scoringSelectors";

export const useQualificationScoringController = () => {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const scoreDrafts = useScoreDraftFields();
  const rankIndicators = useTimedIndicator();
  const apparatusOrder = useMemo(
    () => [...getApparatusForDiscipline(state.discipline)],
    [state.discipline],
  );
  const disciplineConfig = useMemo(
    () => getDisciplineConfig(state.discipline),
    [state.discipline],
  );
  const activeSub = state.qualificationResultsContext.activeSub;
  const activeRot = state.qualificationResultsContext.activeRot;

  const { allGymnasts } = useMemo(() => getQualificationLiveRankingInput(state), [state]);
  const gymnastLookup = useMemo(
    () => new Map(allGymnasts.map((gymnast) => [gymnast.id, gymnast])),
    [allGymnasts],
  );

  const liveRankings = useMemo(
    () =>
      apparatusOrder.reduce<Record<string, ReturnType<typeof getEventFinalRankings>>>(
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
      ),
    [allGymnasts, apparatusOrder, state.dns, state.qualificationStandByUsage, state.scores, state.teams],
  );

  const entitiesByApparatus = useMemo(
    () => getQualificationScoringEntitiesByApparatus(state, activeSub, activeRot),
    [activeRot, activeSub, state],
  );

  const getGymnastRank = (gymnastId: string, apparatus: string): number | null => {
    const rankingKey = apparatus === "VT*" ? "VT" : apparatus;
    if (!(rankingKey in liveRankings)) return null;

    const entry = liveRankings[rankingKey as keyof typeof liveRankings].find(
      (row) => row.gymnast.id === gymnastId,
    );
    return entry?.rank ?? null;
  };

  const getStoredScore = (
    gymnastId: string,
    apparatus: string,
    vaultIndex?: 0 | 1,
  ): Score | undefined => {
    if (apparatus === "VT*" && vaultIndex !== undefined) {
      return state.scores[gymnastId]?.["VT*"]?.[vaultIndex] as Score | undefined;
    }

    return state.scores[gymnastId]?.[apparatus as Apparatus] as Score | undefined;
  };

  const commitScoreField = (
    gymnastId: string,
    apparatus: Apparatus,
    field: ScoreField,
    value: number,
    vaultIndex?: 0 | 1,
  ) => {
    const currentScore = getStoredScore(gymnastId, apparatus, vaultIndex) || {
      d: 0,
      e: 0,
      penalty: 0,
      total: 0,
    };

    const nextScore: Score = {
      ...currentScore,
      [field]: value,
      total: calculateScore(
        field === "d" ? value : currentScore.d,
        field === "e" ? value : currentScore.e,
        field === "penalty" ? value : currentScore.penalty,
      ),
    };

    dispatch({
      type: "UPDATE_SCORE",
      payload: { gymnastId, app: apparatus, score: nextScore, vIndex: vaultIndex },
    });

    if (apparatus === "VT*") {
      if (vaultIndex === 1) {
        rankIndicators.trigger(`${gymnastId}_VT*`);
      }
    } else if (apparatus !== "VT") {
      rankIndicators.trigger(`${gymnastId}_${apparatus}`);
    }
  };

  const handleScoreBlur = (
    gymnastId: string,
    apparatus: Apparatus,
    field: ScoreField,
    storedScore?: Score,
    vaultIndex?: 0 | 1,
  ) => {
    scoreDrafts.commitDraft({
      fieldKey: buildScoreDraftKey(gymnastId, apparatus, field, vaultIndex),
      storedValue: storedScore?.[field],
      onCommit: (value) => commitScoreField(gymnastId, apparatus, field, value, vaultIndex),
    });
  };

  const handleToggleStandByActivation = (
    teamId: string,
    apparatus: ApparatusKey,
    activated: boolean,
  ) => {
    const team = state.teams[teamId];
    if (!team) return;

    const standByGymnast = getTeamStandByGymnast(team, apparatus);
    if (!standByGymnast) return;

    const currentTeamUsage = { ...(state.qualificationStandByUsage[teamId] || {}) };
    if (!activated) {
      delete currentTeamUsage[apparatus];
    } else {
      currentTeamUsage[apparatus] = {
        standbyGymnastId: standByGymnast.id,
        activated: true,
      };
    }

    const nextUsage = { ...state.qualificationStandByUsage };
    if (Object.keys(currentTeamUsage).length === 0) {
      delete nextUsage[teamId];
    } else {
      nextUsage[teamId] = currentTeamUsage;
    }

    dispatch({ type: "SET_QUALIFICATION_STANDBY_USAGE", payload: nextUsage });
  };

  const handleToggleDns = (gymnastId: string, key: DnsEntryKey, apparatus?: ApparatusKey) => {
    const gymnast = gymnastLookup.get(gymnastId);
    if (gymnast && !gymnast.isMixedGroup && apparatus) {
      const team = state.teams[gymnast.countryId];
      const affectsStandByTrigger = key === apparatus || (apparatus === "VT" && key === "VT1");
      const currentTeamUsage = state.qualificationStandByUsage[gymnast.countryId]?.[apparatus];
      if (team && currentTeamUsage?.activated && affectsStandByTrigger && isTitularOnApparatus(gymnast, apparatus)) {
        const currentDnsCount = getTeamTitularDnsCount(team, apparatus, state.dns);
        const nextDnsCount = isDnsActive(state.dns, gymnastId, key)
          ? currentDnsCount - 1
          : currentDnsCount + 1;

        if (nextDnsCount <= 0) {
          handleToggleStandByActivation(gymnast.countryId, apparatus, false);
        }
      }
    }

    dispatch({ type: "TOGGLE_DNS", payload: { gymnastId, key } });
  };

  const handleFinish = () => {
    if (state.phase < 6) dispatch({ type: "SET_PHASE", payload: 6 });
    setLocation("/results");
  };

  const setQualificationResultsContext = (nextSub: number, nextRot: number) => {
    dispatch({
      type: "SET_QUALIFICATION_RESULTS_CONTEXT",
      payload: {
        activeSub: Math.min(Math.max(nextSub, 1), disciplineConfig.subdivisionCount),
        activeRot: Math.min(Math.max(nextRot, 1), disciplineConfig.qualificationRotationCount),
      },
    });
  };

  return {
    state,
    activeSub,
    setActiveSub: (value: number) => setQualificationResultsContext(value, activeRot),
    activeRot,
    setActiveRot: (value: number) => setQualificationResultsContext(activeSub, value),
    subdivisionCount: disciplineConfig.subdivisionCount,
    rotationCount: disciplineConfig.qualificationRotationCount,
    apparatusOrder,
    entitiesByApparatus,
    getGymnastRank,
    getStoredScore,
    getScoreValue: (fieldKey: string, storedValue?: number) =>
      scoreDrafts.getInputValue(fieldKey, storedValue),
    updateScoreDraft: scoreDrafts.updateDraft,
    handleScoreBlur,
    handleToggleDns,
    handleToggleStandByActivation,
    handleFinish,
    isRankIndicatorActive: rankIndicators.isActive,
    isDnsActive,
    getDnsEntryKeyForApp,
  };
};
