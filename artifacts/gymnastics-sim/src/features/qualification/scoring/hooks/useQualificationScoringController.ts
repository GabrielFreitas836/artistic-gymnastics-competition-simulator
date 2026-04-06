import { useMemo, useState } from "react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { useScoreDraftFields } from "@/features/shared/hooks/useScoreDraftFields";
import { useTimedIndicator } from "@/features/shared/hooks/useTimedIndicator";
import { buildScoreDraftKey, ScoreField } from "@/features/shared/utils/scoreInput";
import {
  calculateScore,
  getDnsEntryKeyForApp,
  isDnsActive,
} from "@/lib/simulation/scoring";
import { getEventFinalRankings } from "@/lib/simulation/rankings";
import { Apparatus, DnsEntryKey, Score } from "@/lib/types";

import {
  getQualificationLiveRankingInput,
  getQualificationScoringEntitiesByApparatus,
  QUALIFICATION_APPARATUS_ORDER,
} from "../selectors/scoringSelectors";

export const useQualificationScoringController = () => {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const [activeSub, setActiveSub] = useState<number>(1);
  const [activeRot, setActiveRot] = useState<number>(1);
  const scoreDrafts = useScoreDraftFields();
  const rankIndicators = useTimedIndicator();

  const { allGymnasts } = useMemo(() => getQualificationLiveRankingInput(state), [state]);

  const liveRankings = useMemo(
    () => ({
      VT: getEventFinalRankings(allGymnasts, "VT", state.scores, state.dns),
      UB: getEventFinalRankings(allGymnasts, "UB", state.scores, state.dns),
      BB: getEventFinalRankings(allGymnasts, "BB", state.scores, state.dns),
      FX: getEventFinalRankings(allGymnasts, "FX", state.scores, state.dns),
    }),
    [allGymnasts, state.dns, state.scores],
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

  const handleToggleDns = (gymnastId: string, key: DnsEntryKey) => {
    dispatch({ type: "TOGGLE_DNS", payload: { gymnastId, key } });
  };

  const handleFinish = () => {
    if (state.phase < 6) dispatch({ type: "SET_PHASE", payload: 6 });
    setLocation("/results");
  };

  return {
    state,
    activeSub,
    setActiveSub,
    activeRot,
    setActiveRot,
    apparatusOrder: QUALIFICATION_APPARATUS_ORDER,
    entitiesByApparatus,
    getGymnastRank,
    getStoredScore,
    getScoreValue: (fieldKey: string, storedValue?: number) =>
      scoreDrafts.getInputValue(fieldKey, storedValue),
    updateScoreDraft: scoreDrafts.updateDraft,
    handleScoreBlur,
    handleToggleDns,
    handleFinish,
    isRankIndicatorActive: rankIndicators.isActive,
    isDnsActive,
    getDnsEntryKeyForApp,
  };
};
