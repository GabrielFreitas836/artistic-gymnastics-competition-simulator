import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { useScoreDraftFields } from "@/features/shared/hooks/useScoreDraftFields";
import { useTimedIndicator } from "@/features/shared/hooks/useTimedIndicator";
import { buildScoreDraftKey, ScoreField } from "@/features/shared/utils/scoreInput";
import {
  buildAllAroundFinalSlots,
  getAllAroundFinalCompletionCount,
  getAllAroundFinalQualificationPool,
  getAllAroundFinalRankings,
  getAllAroundFinalStage,
  getAllAroundFinalStoredScore,
} from "@/lib/simulation/finals/all-around";
import { calculateScore } from "@/lib/simulation/scoring";
import { getQualificationCompletionStatus } from "@/lib/simulation/finals/team";
import { ApparatusKey, DnsEntryKey, Score } from "@/lib/types";

export type FinalTab = "STANDINGS" | "APPARATUS";

export const useAllAroundFinalController = () => {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();
  const scoreDrafts = useScoreDraftFields();
  const rankIndicators = useTimedIndicator();

  const [activeRotation, setActiveRotation] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<FinalTab>("STANDINGS");
  const [replacementChoice, setReplacementChoice] = useState<boolean | null>(null);
  const [selectedReplacementSlots, setSelectedReplacementSlots] = useState<number[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);

  const qualificationCompletion = useMemo(
    () => getQualificationCompletionStatus(state),
    [state],
  );

  const qualificationPool = useMemo(
    () => getAllAroundFinalQualificationPool(state),
    [state],
  );

  const stage = useMemo(
    () => getAllAroundFinalStage(state, qualificationCompletion.isComplete),
    [qualificationCompletion.isComplete, state],
  );

  const rankings = useMemo(() => getAllAroundFinalRankings(state), [state]);
  const completedRoutineCount = useMemo(
    () => getAllAroundFinalCompletionCount(state),
    [state],
  );

  const slots = useMemo(
    () => [...state.finals.allAroundFinal.slots].sort((a, b) => a.slotNumber - b.slotNumber),
    [state.finals.allAroundFinal.slots],
  );

  useEffect(() => {
    if (qualificationCompletion.isComplete && state.phase < 7) {
      dispatch({ type: "SET_PHASE", payload: 7 });
    }
  }, [dispatch, qualificationCompletion.isComplete, state.phase]);

  useEffect(() => {
    if (stage === "setup") {
      dispatch({ type: "SET_AA_FINAL_SLOTS", payload: buildAllAroundFinalSlots(state) });
    }
  }, [dispatch, stage, state]);

  const replacementLimit = Math.min(qualificationPool.reserves.length, qualificationPool.qualified.length);

  const toggleReplacementSlot = (slotNumber: number) => {
    setSelectedReplacementSlots((current) => {
      if (current.includes(slotNumber)) {
        return current.filter((value) => value !== slotNumber);
      }
      if (current.length >= replacementLimit) {
        return current;
      }
      return [...current, slotNumber];
    });
  };

  const setReplacementMode = (value: boolean) => {
    setReplacementChoice(value);
    setSetupError(null);
    if (!value) {
      setSelectedReplacementSlots([]);
    }
  };

  const handleConfirmSlots = () => {
    setSetupError(null);

    if (qualificationPool.qualified.length === 0) {
      setSetupError("No all-around finalists are available.");
      return;
    }

    if (qualificationPool.reserves.length > 0 && replacementChoice === null) {
      setSetupError("Choose whether reserve gymnasts will replace any qualifier.");
      return;
    }

    if (replacementChoice) {
      if (replacementLimit === 0) {
        setSetupError("No reserves are available for replacement.");
        return;
      }
      if (selectedReplacementSlots.length === 0) {
        setSetupError("Select at least one qualifier to be replaced.");
        return;
      }
      if (selectedReplacementSlots.length > replacementLimit) {
        setSetupError(`You can replace up to ${replacementLimit} gymnast${replacementLimit === 1 ? "" : "s"}.`);
        return;
      }
    }

    dispatch({
      type: "SET_AA_FINAL_SLOTS",
      payload: buildAllAroundFinalSlots(state, replacementChoice ? selectedReplacementSlots : []),
    });
    dispatch({ type: "SET_PHASE", payload: 7 });
  };

  const handleRestartFinal = () => {
    if (!window.confirm("Restart the Individual All-Around Final and clear all final scores?")) {
      return;
    }

    dispatch({ type: "RESET_AA_FINAL" });
    setReplacementChoice(null);
    setSelectedReplacementSlots([]);
    setSetupError(null);
    scoreDrafts.resetDrafts();
    rankIndicators.reset();
    setActiveRotation(1);
    setActiveTab("STANDINGS");
  };

  const commitScoreField = (
    gymnastId: string,
    apparatus: ApparatusKey,
    field: ScoreField,
    value: number,
  ) => {
    const currentScore = getAllAroundFinalStoredScore(
      state.finals.allAroundFinal.scores,
      gymnastId,
      apparatus,
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
      type: "UPDATE_AA_FINAL_SCORE",
      payload: {
        gymnastId,
        app: apparatus,
        score: nextScore,
      },
    });

    rankIndicators.trigger(gymnastId);
  };

  const handleScoreBlur = (
    gymnastId: string,
    apparatus: ApparatusKey,
    field: ScoreField,
    storedScore?: Score,
  ) => {
    scoreDrafts.commitDraft({
      fieldKey: buildScoreDraftKey(gymnastId, apparatus, field),
      storedValue: storedScore?.[field],
      onCommit: (value) => commitScoreField(gymnastId, apparatus, field, value),
    });
  };

  const handleToggleDns = (gymnastId: string, apparatus: ApparatusKey) => {
    dispatch({
      type: "TOGGLE_AA_FINAL_DNS",
      payload: { gymnastId, key: apparatus as DnsEntryKey },
    });
  };

  return {
    state,
    qualificationCompletion,
    qualificationPool,
    stage,
    rankings,
    completedRoutineCount,
    slots,
    activeRotation,
    setActiveRotation,
    activeTab,
    setActiveTab,
    replacementChoice,
    setReplacementChoice: setReplacementMode,
    selectedReplacementSlots,
    replacementLimit,
    toggleReplacementSlot,
    setupError,
    handleConfirmSlots,
    handleRestartFinal,
    getStoredScore: getAllAroundFinalStoredScore,
    getScoreValue: (fieldKey: string, storedValue?: number) =>
      scoreDrafts.getInputValue(fieldKey, storedValue),
    updateScoreDraft: scoreDrafts.updateDraft,
    handleScoreBlur,
    handleToggleDns,
    isRankIndicatorActive: rankIndicators.isActive,
    goBackToFinals: () => setLocation("/finals"),
  };
};
