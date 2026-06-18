import { Apparatus, DnsEntryKey, Score, SimulationState } from "@/lib/types";
import { applyRunPhase, resolveRunPhaseKey } from "@/lib/competitionRun";
import { normalizeTeams, sanitizeQualificationStandByUsage } from "@/lib/teamRoster";
import { createEmptyWorldCupSeriesState, mergeWorldCupRegistry } from "@/lib/worldCup";
import { getCompetitionConfig } from "@/lib/competitionRun";

import { normalizeState } from "./simulationPersistence";
import {
  createInitialState,
  createEmptyApparatusFinalState,
  createEmptyAllAroundFinalState,
  createEmptyTeamFinalState,
  initialState,
  SimulationAction,
} from "./simulationState";

const updateScoreState = (
  sourceScores: SimulationState["scores"],
  actionPayload: { gymnastId: string; app: Apparatus; score: Score; vIndex?: 0 | 1 },
): SimulationState["scores"] => {
  const { gymnastId, app, score, vIndex } = actionPayload;
  const nextScores = { ...sourceScores };
  if (!nextScores[gymnastId]) nextScores[gymnastId] = {};

  if (app === "VT*" && vIndex !== undefined) {
    if (!nextScores[gymnastId]["VT*"]) {
      nextScores[gymnastId]["VT*"] = [
        { d: 0, e: 0, penalty: 0, total: 0 },
        { d: 0, e: 0, penalty: 0, total: 0 },
      ];
    }

    const currentVaults = nextScores[gymnastId]["VT*"] as [Score, Score];
    const vaultScores: [Score, Score] = [currentVaults[0], currentVaults[1]];
    vaultScores[vIndex] = score;
    nextScores[gymnastId]["VT*"] = vaultScores;
    return nextScores;
  }

  (nextScores[gymnastId] as Partial<Record<Apparatus, Score>>)[app] = score;
  return nextScores;
};

const toggleDnsState = (
  sourceDns: SimulationState["dns"],
  actionPayload: { gymnastId: string; key: DnsEntryKey },
): SimulationState["dns"] => {
  const { gymnastId, key } = actionPayload;
  const current = !!sourceDns[gymnastId]?.[key];
  const nextGymnastDns = {
    ...(sourceDns[gymnastId] || {}),
    [key]: !current,
  };

  if (!nextGymnastDns[key]) {
    delete nextGymnastDns[key];
  }

  const nextDns = { ...sourceDns };
  if (Object.keys(nextGymnastDns).length === 0) {
    delete nextDns[gymnastId];
  } else {
    nextDns[gymnastId] = nextGymnastDns;
  }

  return nextDns;
};

const createWorldCupStageState = (
  state: SimulationState,
  nextStageNumber: number,
  worldCupSeries: SimulationState["worldCupSeries"],
): SimulationState => {
  const baseState = createInitialState(state.competitionCode);

  return {
    ...baseState,
    runId: state.runId,
    cycleId: state.cycleId,
    competitionCode: state.competitionCode,
    discipline: state.discipline,
    year: state.year,
    snapshotVersion: state.snapshotVersion,
    persistenceSource: state.persistenceSource,
    lastSavedAt: state.lastSavedAt,
    worldCupSeries: {
      ...createEmptyWorldCupSeriesState(),
      ...worldCupSeries,
      currentStageNumber: nextStageNumber,
    },
  };
};

export const simulationReducer = (
  state: SimulationState,
  action: SimulationAction,
): SimulationState => {
  switch (action.type) {
    case "INITIALIZE_RUN":
      return createInitialState(action.payload.competitionCode);
    case "SET_DISCIPLINE":
      return { ...state, discipline: action.payload };
    case "SET_PHASE":
      return applyRunPhase(state, resolveRunPhaseKey(state, action.payload));
    case "SET_ACTIVE_PHASE":
      return applyRunPhase(state, action.payload);
    case "SET_PERSISTENCE_META":
      return {
        ...state,
        ...action.payload,
      };
    case "SET_COUNTRIES":
      return { ...state, selectedCountries: action.payload };
    case "SET_TEAMS": {
      const normalizedTeams = normalizeTeams(action.payload, state.discipline);
      const nextState = {
        ...state,
        teams: normalizedTeams,
        qualificationStandByUsage: sanitizeQualificationStandByUsage(
          action.payload,
          state.qualificationStandByUsage,
          state.discipline,
        ),
      };
      if (getCompetitionConfig(state).competitionKind === "WORLD_CUP") {
        return {
          ...nextState,
          worldCupSeries: {
            ...state.worldCupSeries,
            registry: mergeWorldCupRegistry(state.worldCupSeries.registry, normalizedTeams),
          },
        };
      }
      return nextState;
    }
    case "SET_MIXED_GROUPS":
      return { ...state, mixedGroups: action.payload };
    case "SET_SUBDIVISIONS":
      return { ...state, subdivisions: action.payload };
    case "SET_QUALIFICATION_STANDBY_USAGE":
      return { ...state, qualificationStandByUsage: action.payload };
    case "SET_APPARATUS_ORDER":
      return { ...state, apparatusOrder: action.payload };
    case "SET_TEAM_FINAL_SLOTS":
      return {
        ...state,
        finals: {
          ...state.finals,
          teamFinal: {
            ...createEmptyTeamFinalState(),
            slots: action.payload,
          },
        },
      };
    case "UPDATE_TEAM_FINAL_LINEUP":
      return {
        ...state,
        finals: {
          ...state.finals,
          teamFinal: {
            ...state.finals.teamFinal,
            lineups: {
              ...state.finals.teamFinal.lineups,
              [action.payload.teamId]: {
                ...(state.finals.teamFinal.lineups[action.payload.teamId] || {}),
                [action.payload.apparatus]: action.payload.gymnastIds,
              },
            },
          },
        },
      };
    case "SET_AA_FINAL_SLOTS":
      return {
        ...state,
        finals: {
          ...state.finals,
          allAroundFinal: {
            ...createEmptyAllAroundFinalState(),
            slots: action.payload,
          },
        },
      };
    case "SET_APPARATUS_FINAL_SLOTS":
      return {
        ...state,
        finals: {
          ...state.finals,
          apparatusFinals: {
            ...state.finals.apparatusFinals,
            [action.payload.apparatus]: {
              ...createEmptyApparatusFinalState(),
              slots: action.payload.slots,
            },
          },
        },
      };
    case "COMPLETE_WORLD_CUP_STAGE": {
      if (getCompetitionConfig(state).competitionKind !== "WORLD_CUP") {
        return state;
      }

      const currentSeries = state.worldCupSeries;
      const recordedSummary = action.payload.summary;
      const stageHistory = [
        ...currentSeries.stageHistory.filter(
          (stage) => stage.stageNumber !== recordedSummary.stageNumber,
        ),
        recordedSummary,
      ].sort((left, right) => left.stageNumber - right.stageNumber);
      const mergedRegistry = mergeWorldCupRegistry(currentSeries.registry, state.teams);
      const nextSeries = {
        ...currentSeries,
        stageHistory,
        registry: mergedRegistry,
      };
      const shouldAdvance =
        action.payload.advance && currentSeries.currentStageNumber < currentSeries.totalStages;

      if (!shouldAdvance) {
        return {
          ...state,
          worldCupSeries: nextSeries,
        };
      }

      return createWorldCupStageState(
        state,
        Math.min(currentSeries.currentStageNumber + 1, currentSeries.totalStages),
        nextSeries,
      );
    }
    case "HYDRATE_SIMULATION":
      return normalizeState(action.payload);
    case "UPDATE_SCORE":
      return {
        ...state,
        scores: updateScoreState(state.scores, action.payload),
      };
    case "UPDATE_TEAM_FINAL_SCORE":
      return {
        ...state,
        finals: {
          ...state.finals,
          teamFinal: {
            ...state.finals.teamFinal,
            scores: updateScoreState(state.finals.teamFinal.scores, action.payload),
          },
        },
      };
    case "UPDATE_AA_FINAL_SCORE":
      return {
        ...state,
        finals: {
          ...state.finals,
          allAroundFinal: {
            ...state.finals.allAroundFinal,
            scores: updateScoreState(state.finals.allAroundFinal.scores, action.payload),
          },
        },
      };
    case "UPDATE_APPARATUS_FINAL_SCORE":
      return {
        ...state,
        finals: {
          ...state.finals,
          apparatusFinals: {
            ...state.finals.apparatusFinals,
            [action.payload.apparatus]: {
              ...state.finals.apparatusFinals[action.payload.apparatus],
              scores: updateScoreState(
                state.finals.apparatusFinals[action.payload.apparatus].scores,
                action.payload,
              ),
            },
          },
        },
      };
    case "TOGGLE_DNS":
      return {
        ...state,
        dns: toggleDnsState(state.dns, action.payload),
      };
    case "TOGGLE_TEAM_FINAL_DNS":
      return {
        ...state,
        finals: {
          ...state.finals,
          teamFinal: {
            ...state.finals.teamFinal,
            dns: toggleDnsState(state.finals.teamFinal.dns, action.payload),
          },
        },
      };
    case "TOGGLE_AA_FINAL_DNS":
      return {
        ...state,
        finals: {
          ...state.finals,
          allAroundFinal: {
            ...state.finals.allAroundFinal,
            dns: toggleDnsState(state.finals.allAroundFinal.dns, action.payload),
          },
        },
      };
    case "TOGGLE_APPARATUS_FINAL_DNS":
      return {
        ...state,
        finals: {
          ...state.finals,
          apparatusFinals: {
            ...state.finals.apparatusFinals,
            [action.payload.apparatus]: {
              ...state.finals.apparatusFinals[action.payload.apparatus],
              dns: toggleDnsState(
                state.finals.apparatusFinals[action.payload.apparatus].dns,
                action.payload,
              ),
            },
          },
        },
      };
    case "RESET_TEAM_FINAL":
      return {
        ...state,
        finals: {
          ...state.finals,
          teamFinal: createEmptyTeamFinalState(),
        },
      };
    case "RESET_AA_FINAL":
      return {
        ...state,
        finals: {
          ...state.finals,
          allAroundFinal: createEmptyAllAroundFinalState(),
        },
      };
    case "RESET_APPARATUS_FINAL":
      return {
        ...state,
        finals: {
          ...state.finals,
          apparatusFinals: {
            ...state.finals.apparatusFinals,
            [action.payload.apparatus]: createEmptyApparatusFinalState(),
          },
        },
      };
    case "RESET":
      return createInitialState(state.competitionCode || initialState.competitionCode);
    default:
      return state;
  }
};
