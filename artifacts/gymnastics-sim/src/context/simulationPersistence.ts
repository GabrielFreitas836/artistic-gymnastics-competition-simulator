import { Score, ScoreMap, SimulationState } from "@/lib/types";

import {
  createEmptyAllAroundFinalState,
  createEmptyFinalsState,
  createEmptyTeamFinalState,
  initialState,
} from "./simulationState";

export const LOCAL_STORAGE_KEY = "wag-sim-state";

type LegacyScore = Score & { __touched?: unknown };
type LegacyScoreMapValue = LegacyScore | [LegacyScore, LegacyScore];

export type PersistedState = Partial<SimulationState> & {
  finals?: Partial<SimulationState["finals"]>;
  teamFinal?: Partial<SimulationState["finals"]["teamFinal"]>;
  scores?: Record<string, Partial<Record<string, LegacyScoreMapValue>>>;
};

const isScoreLike = (value: unknown): value is LegacyScore =>
  typeof value === "object"
  && value !== null
  && "d" in value
  && "e" in value
  && "penalty" in value
  && "total" in value;

const sanitizeStoredScore = (value: LegacyScore): Score => {
  const { d, e, penalty, total } = value;
  return { d, e, penalty, total };
};

const sanitizeScoreEntry = (value: unknown): Score | [Score, Score] | undefined => {
  if (Array.isArray(value)) {
    const [first, second] = value;
    if (!isScoreLike(first) || !isScoreLike(second)) return undefined;
    return [sanitizeStoredScore(first), sanitizeStoredScore(second)];
  }

  if (!isScoreLike(value)) return undefined;
  return sanitizeStoredScore(value);
};

const sanitizeScoreMap = (
  value?: PersistedState["scores"] | ScoreMap,
): ScoreMap => {
  if (!value) return {};

  return Object.entries(value).reduce<ScoreMap>((accumulator, [gymnastId, gymnastScores]) => {
    if (!gymnastScores) return accumulator;

    const nextScores = Object.entries(gymnastScores).reduce<ScoreMap[string]>(
      (scoreAccumulator, [apparatus, rawScore]) => {
        const sanitized = sanitizeScoreEntry(rawScore);
        if (!sanitized) return scoreAccumulator;

        return {
          ...scoreAccumulator,
          [apparatus]: sanitized,
        };
      },
      {},
    );

    if (Object.keys(nextScores).length > 0) {
      accumulator[gymnastId] = nextScores;
    }

    return accumulator;
  }, {});
};

export const normalizeState = (raw?: PersistedState | null): SimulationState => {
  const persistedFinals: Partial<SimulationState["finals"]> = raw?.finals || {};
  const legacyTeamFinal = raw?.teamFinal || {};

  return {
    ...initialState,
    ...raw,
    subdivisions: {
      1: {},
      2: {},
      3: {},
      4: {},
      5: {},
      ...(raw?.subdivisions || {}),
    },
    scores: sanitizeScoreMap(raw?.scores),
    dns: raw?.dns || {},
    apparatusOrder: raw?.apparatusOrder || {},
    finals: {
      ...createEmptyFinalsState(),
      ...persistedFinals,
      teamFinal: {
        ...createEmptyTeamFinalState(),
        ...legacyTeamFinal,
        ...(persistedFinals.teamFinal || {}),
        slots: persistedFinals.teamFinal?.slots || legacyTeamFinal.slots || [],
        lineups: persistedFinals.teamFinal?.lineups || legacyTeamFinal.lineups || {},
        scores: sanitizeScoreMap(persistedFinals.teamFinal?.scores || legacyTeamFinal.scores),
        dns: persistedFinals.teamFinal?.dns || legacyTeamFinal.dns || {},
      },
      allAroundFinal: {
        ...createEmptyAllAroundFinalState(),
        ...(persistedFinals.allAroundFinal || {}),
        slots: persistedFinals.allAroundFinal?.slots || [],
        scores: sanitizeScoreMap(persistedFinals.allAroundFinal?.scores),
        dns: persistedFinals.allAroundFinal?.dns || {},
      },
    },
  };
};

export const readPersistedSimulation = (): SimulationState => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return initialState;

    return normalizeState(JSON.parse(stored) as PersistedState);
  } catch {
    return initialState;
  }
};

export const writePersistedSimulation = (state: SimulationState): void => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};
