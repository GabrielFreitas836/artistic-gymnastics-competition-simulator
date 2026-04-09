import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { useScoreDraftFields } from "@/features/shared/hooks/useScoreDraftFields";
import { useTimedIndicator } from "@/features/shared/hooks/useTimedIndicator";
import { buildScoreDraftKey, ScoreField } from "@/features/shared/utils/scoreInput";
import {
  APPARATUS_FINAL_CODE,
  APPARATUS_FINAL_LABEL,
  buildApparatusFinalSlots,
  getApparatusFinalCompletionCount,
  getApparatusFinalQualificationPool,
  getApparatusFinalRankings,
  getApparatusFinalRoutineCount,
  getApparatusFinalStage,
  getApparatusFinalStoredScore,
  isApparatusFinalDnsActive,
  isApparatusFinalDnfActive,
} from "@/lib/simulation/finals/apparatus";
import { calculateScore } from "@/lib/simulation/scoring";
import { getQualificationCompletionStatus } from "@/lib/simulation/finals/team";
import { Apparatus, ApparatusKey, DnsEntryKey, Score } from "@/lib/types";

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
};

export const useApparatusFinalController = (apparatus: ApparatusKey) => {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const scoreDrafts = useScoreDraftFields();
  const rankIndicators = useTimedIndicator();

  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);

  const qualificationCompletion = useMemo(
    () => getQualificationCompletionStatus(state),
    [state],
  );

  const qualificationPool = useMemo(
    () => getApparatusFinalQualificationPool(state, apparatus),
    [apparatus, state],
  );

  const stage = useMemo(
    () => getApparatusFinalStage(state, apparatus, qualificationCompletion.isComplete),
    [apparatus, qualificationCompletion.isComplete, state],
  );

  const rankings = useMemo(
    () => getApparatusFinalRankings(state, apparatus),
    [apparatus, state],
  );

  const completedRoutineCount = useMemo(
    () => getApparatusFinalCompletionCount(state, apparatus),
    [apparatus, state],
  );

  const slots = useMemo(
    () =>
      [...state.finals.apparatusFinals[apparatus].slots].sort(
        (a, b) => a.competitionOrder - b.competitionOrder,
      ),
    [apparatus, state.finals.apparatusFinals],
  );

  useEffect(() => {
    if (qualificationCompletion.isComplete && state.phase < 7) {
      dispatch({ type: "SET_PHASE", payload: 7 });
    }
  }, [dispatch, qualificationCompletion.isComplete, state.phase]);

  useEffect(() => {
    if (stage !== "setup") return;

    setOrderDraft(qualificationPool.qualified.map((row) => row.gymnast.id));
    setSetupError(null);
  }, [qualificationPool.qualified, stage]);

  const moveOrderItem = (fromIndex: number, toIndex: number) => {
    setOrderDraft((current) => {
      if (
        fromIndex < 0
        || toIndex < 0
        || fromIndex >= current.length
        || toIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleRandomizeOrder = () => {
    setOrderDraft((current) => shuffle(current));
    setSetupError(null);
  };

  const handleConfirmOrder = () => {
    if (qualificationPool.qualified.length <= 1) return;

    if (orderDraft.length !== qualificationPool.qualified.length) {
      setSetupError("The competition order must include every finalist exactly once.");
      return;
    }

    dispatch({
      type: "SET_APPARATUS_FINAL_SLOTS",
      payload: {
        apparatus,
        slots: buildApparatusFinalSlots(state, apparatus, orderDraft),
      },
    });
    dispatch({ type: "SET_PHASE", payload: 7 });
    setSetupError(null);
  };

  const handleRestartFinal = () => {
    if (!window.confirm(`Restart the ${APPARATUS_FINAL_LABEL[apparatus]} Final and clear all scores?`)) {
      return;
    }

    dispatch({ type: "RESET_APPARATUS_FINAL", payload: { apparatus } });
    setOrderDraft([]);
    setSetupError(null);
    scoreDrafts.resetDrafts();
    rankIndicators.reset();
  };

  const commitScoreField = (
    gymnastId: string,
    field: ScoreField,
    value: number,
    vaultIndex?: 0 | 1,
  ) => {
    const currentScore = getApparatusFinalStoredScore(
      state.finals.apparatusFinals[apparatus].scores,
      gymnastId,
      apparatus,
      vaultIndex,
    ) || {
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
      type: "UPDATE_APPARATUS_FINAL_SCORE",
      payload: {
        apparatus,
        gymnastId,
        app: apparatus === "VT" ? ("VT*" as Apparatus) : apparatus,
        score: nextScore,
        vIndex: apparatus === "VT" ? vaultIndex : undefined,
      },
    });

    rankIndicators.trigger(gymnastId);
  };

  const handleScoreBlur = (
    gymnastId: string,
    field: ScoreField,
    storedScore?: Score,
    vaultIndex?: 0 | 1,
  ) => {
    scoreDrafts.commitDraft({
      fieldKey: buildScoreDraftKey(gymnastId, apparatus, vaultIndex, field),
      storedValue: storedScore?.[field],
      onCommit: (value) => commitScoreField(gymnastId, field, value, vaultIndex),
    });
  };

  const handleToggleDns = (gymnastId: string) => {
    if (apparatus === "VT") {
      const isActive = isApparatusFinalDnfActive(
        state.finals.apparatusFinals[apparatus].dns,
        gymnastId,
        apparatus,
      );

      (["VT1", "VT2"] as DnsEntryKey[]).forEach((key) => {
        const keyIsActive = Boolean(state.finals.apparatusFinals[apparatus].dns[gymnastId]?.[key]);
        if ((isActive && keyIsActive) || (!isActive && !keyIsActive)) {
          dispatch({
            type: "TOGGLE_APPARATUS_FINAL_DNS",
            payload: { apparatus, gymnastId, key },
          });
        }
      });

      return;
    }

    dispatch({
      type: "TOGGLE_APPARATUS_FINAL_DNS",
      payload: { apparatus, gymnastId, key: apparatus as DnsEntryKey },
    });
  };

  return {
    state,
    apparatus,
    apparatusCode: APPARATUS_FINAL_CODE[apparatus],
    apparatusLabel: APPARATUS_FINAL_LABEL[apparatus],
    qualificationCompletion,
    qualificationPool,
    stage,
    rankings,
    completedRoutineCount,
    routineCount: getApparatusFinalRoutineCount(apparatus),
    slots,
    orderDraft,
    setupError,
    moveOrderItem,
    handleRandomizeOrder,
    handleConfirmOrder,
    handleRestartFinal,
    getStoredScore: getApparatusFinalStoredScore,
    isDnsActive: isApparatusFinalDnsActive,
    isDnfActive: isApparatusFinalDnfActive,
    getScoreValue: (fieldKey: string, storedValue?: number) =>
      scoreDrafts.getInputValue(fieldKey, storedValue),
    updateScoreDraft: scoreDrafts.updateDraft,
    handleScoreBlur,
    handleToggleDns,
    isRankIndicatorActive: rankIndicators.isActive,
    goBackToFinals: () => setLocation("/finals"),
    goToMedalSummary: () => setLocation("/finals/medals"),
  };
};
