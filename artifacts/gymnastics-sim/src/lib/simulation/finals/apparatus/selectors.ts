import { getCountryById } from "@/lib/countries";
import { RankedGymnast, getEventFinalRankings } from "@/lib/simulation/rankings";
import {
  getApparatusComponents,
  getVaultFinalScore,
} from "@/lib/simulation/scoring";
import { selectAllGymnasts, selectGymnastLookup } from "@/lib/simulation/selectors";
import {
  ApparatusFinalSlot,
  ApparatusKey,
  DnsMap,
  Gymnast,
  Score,
  ScoreMap,
  SimulationState,
} from "@/lib/types";

import { APPARATUS_FINALS } from "./constants";

export interface ApparatusFinalQualificationPool {
  qualified: RankedGymnast[];
  reserves: RankedGymnast[];
}

export type ApparatusFinalStage =
  | "locked"
  | "empty"
  | "walkover"
  | "setup"
  | "scoring";

export interface ApparatusFinalRankingRow {
  slot: ApparatusFinalSlot;
  gymnast: Gymnast;
  total: number;
  rank: number | null;
  medal: "Gold" | "Silver" | "Bronze" | null;
  tied: boolean;
  isDnf: boolean;
  isComplete: boolean;
  completedRoutineCount: number;
  routineCount: number;
  tbE: number;
  tbD: number;
  resultState: "OK" | "DNS" | "DNF" | "EMPTY";
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

const getMedalForRank = (
  rank: number,
): "Gold" | "Silver" | "Bronze" | null => {
  if (rank === 1) return "Gold";
  if (rank === 2) return "Silver";
  if (rank === 3) return "Bronze";
  return null;
};

export const getApparatusFinalRoutineCount = (apparatus: ApparatusKey): number =>
  apparatus === "VT" ? 2 : 1;

export const getApparatusFinalQualificationPool = (
  state: SimulationState,
  apparatus: ApparatusKey,
): ApparatusFinalQualificationPool => {
  const rankings = getEventFinalRankings(
    selectAllGymnasts(state),
    apparatus,
    state.scores,
    state.dns,
  );

  return {
    qualified: rankings.filter((row) => row.status === "Q"),
    reserves: rankings.filter((row) => row.status === "R1" || row.status === "R2" || row.status === "R3"),
  };
};

export const buildApparatusFinalSlots = (
  state: SimulationState,
  apparatus: ApparatusKey,
  orderedGymnastIds?: string[],
): ApparatusFinalSlot[] => {
  const pool = getApparatusFinalQualificationPool(state, apparatus);
  const qualifiedIds = pool.qualified.map((row) => row.gymnast.id);
  const qualificationRankByGymnastId = new Map(
    pool.qualified.map((row) => [row.gymnast.id, row.rank ?? null]),
  );

  const seen = new Set<string>();
  const requestedIds = orderedGymnastIds || qualifiedIds;
  const orderedIds = [
    ...requestedIds.filter((gymnastId) => {
      if (!qualifiedIds.includes(gymnastId) || seen.has(gymnastId)) return false;
      seen.add(gymnastId);
      return true;
    }),
    ...qualifiedIds.filter((gymnastId) => !seen.has(gymnastId)),
  ];

  return orderedIds.map((gymnastId, index) => ({
    competitionOrder: index + 1,
    qualificationRank: qualificationRankByGymnastId.get(gymnastId) ?? null,
    gymnastId,
  }));
};

export const getApparatusFinalStage = (
  state: SimulationState,
  apparatus: ApparatusKey,
  qualificationComplete: boolean,
): ApparatusFinalStage => {
  if (!qualificationComplete) return "locked";

  const pool = getApparatusFinalQualificationPool(state, apparatus);
  if (pool.qualified.length === 0) return "empty";
  if (pool.qualified.length === 1) return "walkover";
  if (state.finals.apparatusFinals[apparatus].slots.length === 0) return "setup";
  return "scoring";
};

export const getApparatusFinalStoredScore = (
  scores: ScoreMap,
  gymnastId: string,
  apparatus: ApparatusKey,
  vaultIndex?: 0 | 1,
): Score | undefined => {
  if (apparatus === "VT") {
    const vaults = scores[gymnastId]?.["VT*"];
    return Array.isArray(vaults) ? vaults[vaultIndex ?? 0] : undefined;
  }

  return scores[gymnastId]?.[apparatus] as Score | undefined;
};

export const isApparatusFinalDnsActive = (
  dns: DnsMap,
  gymnastId: string,
  apparatus: ApparatusKey,
  vaultIndex?: 0 | 1,
): boolean => {
  if (apparatus === "VT") {
    return Boolean(dns[gymnastId]?.[vaultIndex === 1 ? "VT2" : "VT1"]);
  }

  return Boolean(dns[gymnastId]?.[apparatus]);
};

export const isApparatusFinalDnfActive = (
  dns: DnsMap,
  gymnastId: string,
  apparatus: ApparatusKey,
): boolean =>
  apparatus === "VT"
    ? Boolean(dns[gymnastId]?.VT1 || dns[gymnastId]?.VT2)
    : Boolean(dns[gymnastId]?.[apparatus]);

export const getApparatusFinalRankings = (
  state: SimulationState,
  apparatus: ApparatusKey,
): ApparatusFinalRankingRow[] => {
  const gymnastLookup = selectGymnastLookup(state);
  const finalState = state.finals.apparatusFinals[apparatus];
  const slots = [...finalState.slots].sort((a, b) => a.competitionOrder - b.competitionOrder);

  const mappedRows: Array<ApparatusFinalRankingRow | null> = slots.map((slot) => {
    const gymnast = gymnastLookup.get(slot.gymnastId);
    if (!gymnast) return null;

    const routineCount = getApparatusFinalRoutineCount(apparatus);
    const completedRoutineCount =
      apparatus === "VT"
        ? [0, 1].reduce((count, vaultIndex) => {
            const dnsActive = isApparatusFinalDnsActive(
              finalState.dns,
              gymnast.id,
              apparatus,
              vaultIndex as 0 | 1,
            );
            const storedScore = getApparatusFinalStoredScore(
              finalState.scores,
              gymnast.id,
              apparatus,
              vaultIndex as 0 | 1,
            );

            return dnsActive || storedScore ? count + 1 : count;
          }, 0)
        : isApparatusFinalDnsActive(finalState.dns, gymnast.id, apparatus)
          || getApparatusFinalStoredScore(finalState.scores, gymnast.id, apparatus)
          ? 1
          : 0;

    const isDnf = isApparatusFinalDnfActive(finalState.dns, gymnast.id, apparatus);
    const score =
      apparatus === "VT"
        ? getVaultFinalScore(gymnast, finalState.scores, finalState.dns)
        : getApparatusFinalStoredScore(finalState.scores, gymnast.id, apparatus)?.total ?? null;
    const components = getApparatusComponents(
      gymnast,
      apparatus,
      finalState.scores,
      finalState.dns,
      apparatus === "VT",
    );

    return {
      slot,
      gymnast,
      total: Number((score ?? 0).toFixed(3)),
      rank: null,
      medal: null,
      tied: false,
      isDnf,
      isComplete: completedRoutineCount === routineCount,
      completedRoutineCount,
      routineCount,
      tbE: Number(components.e.toFixed(3)),
      tbD: Number(components.d.toFixed(3)),
      resultState: isDnf ? (apparatus === "VT" ? "DNF" : "DNS") : score !== null ? "OK" : "EMPTY",
    };
  });

  const rows = mappedRows.filter(
    (row): row is ApparatusFinalRankingRow => row !== null,
  );

  const activeRows = rows
    .filter((row) => !row.isDnf)
    .sort((a, b) => {
      if (round3(b.total) !== round3(a.total)) return b.total - a.total;
      if (round3(b.tbE) !== round3(a.tbE)) return b.tbE - a.tbE;
      if (round3(b.tbD) !== round3(a.tbD)) return b.tbD - a.tbD;
      return a.gymnast.name.localeCompare(b.gymnast.name);
    });

  activeRows.forEach((row, index) => {
    if (index === 0) {
      row.rank = 1;
      return;
    }

    const previous = activeRows[index - 1];
    const isTied =
      round3(row.total) === round3(previous.total)
      && round3(row.tbE) === round3(previous.tbE)
      && round3(row.tbD) === round3(previous.tbD);

    if (isTied) {
      row.rank = previous.rank;
      row.tied = true;
      previous.tied = true;
      return;
    }

    row.rank = index + 1;
  });

  const allComplete =
    rows.length > 0
    && rows.every((row) => row.isComplete)
    && activeRows.some((row) => row.rank === 1);

  if (activeRows.length === 1 && allComplete) {
    activeRows[0].medal = "Gold";
  } else if (allComplete) {
    activeRows.forEach((row) => {
      if (row.rank !== null) {
        row.medal = getMedalForRank(row.rank);
      }
    });
  }

  const dnfRows = rows
    .filter((row) => row.isDnf)
    .sort((a, b) => {
      const countryA = getCountryById(a.gymnast.countryId).name;
      const countryB = getCountryById(b.gymnast.countryId).name;
      return `${countryA}-${a.gymnast.name}`.localeCompare(`${countryB}-${b.gymnast.name}`);
    });

  return [...activeRows, ...dnfRows];
};

export const getApparatusFinalCompletionCount = (
  state: SimulationState,
  apparatus: ApparatusKey,
): number =>
  getApparatusFinalRankings(state, apparatus).reduce(
    (sum, row) => sum + row.completedRoutineCount,
    0,
  );

export const isApparatusFinalComplete = (
  state: SimulationState,
  apparatus: ApparatusKey,
): boolean => {
  const stage = getApparatusFinalStage(state, apparatus, true);
  if (stage === "walkover") return true;

  const rows = getApparatusFinalRankings(state, apparatus);
  return rows.length > 0 && rows.every((row) => row.isComplete);
};

export const getCompletedApparatusFinalCount = (state: SimulationState): number =>
  APPARATUS_FINALS.filter((apparatus) => isApparatusFinalComplete(state, apparatus)).length;
