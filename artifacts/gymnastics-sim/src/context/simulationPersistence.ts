import { ApparatusFinalSlot, Score, ScoreMap, SimulationState } from "@/lib/types";
import { createApparatusMap } from "@/lib/competition";
import {
  normalizeApparatusOrderForDiscipline,
  normalizeMixedGroupsForDiscipline,
  normalizeSubdivisionsForDiscipline,
} from "@/lib/mixedGroups";

import {
  createEmptyApparatusFinalState,
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

const sanitizeApparatusFinalSlots = (
  value?: unknown,
): ApparatusFinalSlot[] => {
  if (!Array.isArray(value)) return [];

  return value.reduce<ApparatusFinalSlot[]>((accumulator, rawSlot) => {
    if (!rawSlot || typeof rawSlot !== "object") return accumulator;

    const slotRecord = rawSlot as Record<string, unknown>;

    const competitionOrder =
      typeof slotRecord.competitionOrder === "number"
        ? slotRecord.competitionOrder
        : null;
    const qualificationRank =
      typeof slotRecord.qualificationRank === "number" || slotRecord.qualificationRank === null
        ? slotRecord.qualificationRank
        : null;
    const qualifiedGymnastId =
      typeof slotRecord.qualifiedGymnastId === "string"
        ? slotRecord.qualifiedGymnastId
        : typeof slotRecord.gymnastId === "string"
          ? slotRecord.gymnastId
          : null;
    const activeGymnastId =
      typeof slotRecord.activeGymnastId === "string"
        ? slotRecord.activeGymnastId
        : typeof slotRecord.gymnastId === "string"
          ? slotRecord.gymnastId
          : qualifiedGymnastId;
    const reserveSource =
      slotRecord.reserveSource === "R1" || slotRecord.reserveSource === "R2" || slotRecord.reserveSource === "R3"
        ? slotRecord.reserveSource
        : undefined;

    if (competitionOrder === null || qualifiedGymnastId === null || activeGymnastId === null) {
      return accumulator;
    }

    accumulator.push({
      competitionOrder,
      qualificationRank,
      qualifiedGymnastId,
      activeGymnastId,
      reserveSource,
    });
    return accumulator;
  }, []);
};

export const normalizeState = (raw?: PersistedState | null): SimulationState => {
  const discipline = raw?.discipline || "WAG";
  const teams = raw?.teams || {};
  const mixedGroups = normalizeMixedGroupsForDiscipline(raw?.mixedGroups || {}, discipline);
  const validEntityIds = [
    ...Object.keys(teams),
    ...Object.keys(mixedGroups),
  ];
  const persistedFinals: Partial<SimulationState["finals"]> = raw?.finals || {};
  const legacyTeamFinal = raw?.teamFinal || {};

  return {
    ...initialState,
    ...raw,
    discipline,
    teams,
    mixedGroups,
    subdivisions: normalizeSubdivisionsForDiscipline(raw?.subdivisions, discipline, validEntityIds),
    scores: sanitizeScoreMap(raw?.scores),
    dns: raw?.dns || {},
    apparatusOrder: normalizeApparatusOrderForDiscipline(
      raw?.apparatusOrder,
      teams,
      mixedGroups,
      discipline,
    ),
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
      apparatusFinals: createApparatusMap((apparatus) => ({
        ...createEmptyApparatusFinalState(),
        ...(persistedFinals.apparatusFinals?.[apparatus] || {}),
        slots: sanitizeApparatusFinalSlots(persistedFinals.apparatusFinals?.[apparatus]?.slots),
        scores: sanitizeScoreMap(persistedFinals.apparatusFinals?.[apparatus]?.scores),
        dns: persistedFinals.apparatusFinals?.[apparatus]?.dns || {},
      })),
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
