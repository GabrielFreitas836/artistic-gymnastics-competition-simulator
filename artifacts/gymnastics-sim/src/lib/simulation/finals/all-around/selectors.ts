import { getCountryById } from "@/lib/countries";
import { RankedGymnast, getAllAroundRankings } from "@/lib/simulation/rankings";
import { getApparatusComponents } from "@/lib/simulation/scoring";
import { selectAllGymnasts, selectGymnastLookup } from "@/lib/simulation/selectors";
import {
  AllAroundFinalSlot,
  ApparatusKey,
  DnsMap,
  Gymnast,
  Score,
  ScoreMap,
  SimulationState,
} from "@/lib/types";

import { ALL_AROUND_FINAL_APPARATUS } from "./constants";

export interface AllAroundFinalQualificationPool {
  qualified: RankedGymnast[];
  reserves: RankedGymnast[];
}

export type AllAroundFinalStage =
  | "locked"
  | "empty"
  | "walkover"
  | "setup"
  | "substitution"
  | "scoring";

export interface AllAroundFinalApparatusResult {
  apparatus: ApparatusKey;
  score: number | null;
  rank: number | null;
  resultState: "OK" | "DNS" | "EMPTY";
  tbE: number;
  tbD: number;
}

export interface AllAroundFinalRankingRow {
  slot: AllAroundFinalSlot;
  gymnast: Gymnast;
  total: number;
  rank: number | null;
  medal: "Gold" | "Silver" | "Bronze" | null;
  tied: boolean;
  isDnf: boolean;
  isComplete: boolean;
  completedRoutineCount: number;
  tbE: number;
  tbD: number;
  tbPenalty: number;
  apparatus: Record<ApparatusKey, AllAroundFinalApparatusResult>;
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

export const getAllAroundFinalQualificationPool = (
  state: SimulationState,
): AllAroundFinalQualificationPool => {
  const rankings = getAllAroundRankings(selectAllGymnasts(state), state.scores, state.dns);

  return {
    qualified: rankings.filter((row) => row.status === "Q").slice(0, 24),
    reserves: rankings
      .filter((row) => row.status === "R1" || row.status === "R2" || row.status === "R3" || row.status === "R4")
      .slice(0, 4),
  };
};

export const buildAllAroundFinalSlots = (
  state: SimulationState,
  replacementSlotNumbers: number[] = [],
): AllAroundFinalSlot[] => {
  const { qualified, reserves } = getAllAroundFinalQualificationPool(state);

  const replacementBySlot = replacementSlotNumbers.reduce<
    Record<number, { gymnastId: string; reserveSource: "R1" | "R2" | "R3" | "R4" }>
  >((accumulator, slotNumber, index) => {
    const reserve = reserves[index];
    if (!reserve) return accumulator;

    accumulator[slotNumber] = {
      gymnastId: reserve.gymnast.id,
      reserveSource: reserve.status as "R1" | "R2" | "R3" | "R4",
    };
    return accumulator;
  }, {});

  return qualified.map((row, index) => {
    const slotNumber = index + 1;
    const replacement = replacementBySlot[slotNumber];

    return {
      slotNumber,
      qualificationRank: row.rank,
      qualifiedGymnastId: row.gymnast.id,
      activeGymnastId: replacement?.gymnastId || row.gymnast.id,
      reserveSource: replacement?.reserveSource,
    };
  });
};

export const getAllAroundFinalStage = (
  state: SimulationState,
  qualificationComplete: boolean,
): AllAroundFinalStage => {
  if (!qualificationComplete) return "locked";

  const pool = getAllAroundFinalQualificationPool(state);
  if (pool.qualified.length === 0) return "empty";
  if (pool.qualified.length === 1) return "walkover";
  if (state.finals.allAroundFinal.slots.length === 0) {
    return pool.reserves.length > 0 ? "substitution" : "setup";
  }

  return "scoring";
};

export const getAllAroundFinalStoredScore = (
  scores: ScoreMap,
  gymnastId: string,
  apparatus: ApparatusKey,
): Score | undefined => scores[gymnastId]?.[apparatus] as Score | undefined;

export const isAllAroundFinalDnsActive = (
  dns: DnsMap,
  gymnastId: string,
  apparatus: ApparatusKey,
): boolean => Boolean(dns[gymnastId]?.[apparatus]);

const getAllAroundFinalApparatusResult = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
  scores: ScoreMap,
  dns: DnsMap,
): AllAroundFinalApparatusResult => {
  if (isAllAroundFinalDnsActive(dns, gymnast.id, apparatus)) {
    return {
      apparatus,
      score: null,
      rank: null,
      resultState: "DNS",
      tbE: 0,
      tbD: 0,
    };
  }

  const storedScore = getAllAroundFinalStoredScore(scores, gymnast.id, apparatus);
  if (!storedScore) {
    return {
      apparatus,
      score: null,
      rank: null,
      resultState: "EMPTY",
      tbE: 0,
      tbD: 0,
    };
  }

  const components = getApparatusComponents(gymnast, apparatus, scores, dns, false);
  return {
    apparatus,
    score: storedScore.total,
    rank: null,
    resultState: "OK",
    tbE: components.e,
    tbD: components.d,
  };
};

const getMedalForRank = (
  rank: number,
): "Gold" | "Silver" | "Bronze" | null => {
  if (rank === 1) return "Gold";
  if (rank === 2) return "Silver";
  if (rank === 3) return "Bronze";
  return null;
};

export const getAllAroundFinalRankings = (
  state: SimulationState,
): AllAroundFinalRankingRow[] => {
  const gymnastLookup = selectGymnastLookup(state);
  const slots = [...state.finals.allAroundFinal.slots].sort((a, b) => a.slotNumber - b.slotNumber);

  const mappedRows: Array<AllAroundFinalRankingRow | null> = slots.map((slot) => {
    const gymnast = gymnastLookup.get(slot.activeGymnastId);
    if (!gymnast) return null;

    const apparatus = {
      VT: getAllAroundFinalApparatusResult(
        gymnast,
        "VT",
        state.finals.allAroundFinal.scores,
        state.finals.allAroundFinal.dns,
      ),
      UB: getAllAroundFinalApparatusResult(
        gymnast,
        "UB",
        state.finals.allAroundFinal.scores,
        state.finals.allAroundFinal.dns,
      ),
      BB: getAllAroundFinalApparatusResult(
        gymnast,
        "BB",
        state.finals.allAroundFinal.scores,
        state.finals.allAroundFinal.dns,
      ),
      FX: getAllAroundFinalApparatusResult(
        gymnast,
        "FX",
        state.finals.allAroundFinal.scores,
        state.finals.allAroundFinal.dns,
      ),
    };

    const completedRoutineCount = ALL_AROUND_FINAL_APPARATUS.reduce((count, apparatusKey) => {
      const result = apparatus[apparatusKey];
      return result.resultState === "EMPTY" ? count : count + 1;
    }, 0);

    const total = ALL_AROUND_FINAL_APPARATUS.reduce(
      (sum, apparatusKey) => sum + (apparatus[apparatusKey].score || 0),
      0,
    );

    const components = ALL_AROUND_FINAL_APPARATUS.reduce(
      (accumulator, apparatusKey) => {
        const result = apparatus[apparatusKey];
        if (result.resultState !== "OK") return accumulator;

        const storedScore = getAllAroundFinalStoredScore(
          state.finals.allAroundFinal.scores,
          gymnast.id,
          apparatusKey,
        );
        if (!storedScore) return accumulator;

        accumulator.e += result.tbE;
        accumulator.d += result.tbD;
        accumulator.penalty += storedScore.penalty;
        return accumulator;
      },
      { e: 0, d: 0, penalty: 0 },
    );

    return {
      slot,
      gymnast,
      total: Number(total.toFixed(3)),
      rank: null,
      medal: null,
      tied: false,
      isDnf: ALL_AROUND_FINAL_APPARATUS.some(
        (apparatusKey) => apparatus[apparatusKey].resultState === "DNS",
      ),
      isComplete: completedRoutineCount === ALL_AROUND_FINAL_APPARATUS.length,
      completedRoutineCount,
      tbE: Number(components.e.toFixed(3)),
      tbD: Number(components.d.toFixed(3)),
      tbPenalty: Number(components.penalty.toFixed(3)),
      apparatus,
    };
  });

  const rows = mappedRows.filter(
    (row): row is AllAroundFinalRankingRow => row !== null,
  );

  const activeRows = rows
    .filter((row) => !row.isDnf)
    .sort((a, b) => {
      if (round3(b.total) !== round3(a.total)) return b.total - a.total;
      if (round3(b.tbE) !== round3(a.tbE)) return b.tbE - a.tbE;
      if (round3(a.tbPenalty) !== round3(b.tbPenalty)) return a.tbPenalty - b.tbPenalty;
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
      && round3(row.tbPenalty) === round3(previous.tbPenalty)
      && round3(row.tbD) === round3(previous.tbD);

    if (isTied) {
      row.rank = previous.rank;
      row.tied = true;
      previous.tied = true;
      return;
    }

    row.rank = index + 1;
  });

  if (activeRows.length === 1) {
    activeRows[0].rank = 1;
    activeRows[0].medal = "Gold";
  } else {
    activeRows.forEach((row) => {
      if (row.rank !== null) {
        row.medal = getMedalForRank(row.rank);
      }
    });
  }

  ALL_AROUND_FINAL_APPARATUS.forEach((apparatusKey) => {
    const rankedEntries = rows
      .filter((row) => row.apparatus[apparatusKey].resultState === "OK")
      .sort((a, b) => {
        const apparatusA = a.apparatus[apparatusKey];
        const apparatusB = b.apparatus[apparatusKey];

        if (round3(apparatusB.score || 0) !== round3(apparatusA.score || 0)) {
          return (apparatusB.score || 0) - (apparatusA.score || 0);
        }
        if (round3(apparatusB.tbE) !== round3(apparatusA.tbE)) {
          return apparatusB.tbE - apparatusA.tbE;
        }
        if (round3(apparatusB.tbD) !== round3(apparatusA.tbD)) {
          return apparatusB.tbD - apparatusA.tbD;
        }
        return a.gymnast.name.localeCompare(b.gymnast.name);
      });

    rankedEntries.forEach((row, index) => {
      const current = row.apparatus[apparatusKey];
      if (index === 0) {
        current.rank = 1;
        return;
      }

      const previous = rankedEntries[index - 1].apparatus[apparatusKey];
      const isTied =
        round3(current.score || 0) === round3(previous.score || 0)
        && round3(current.tbE) === round3(previous.tbE)
        && round3(current.tbD) === round3(previous.tbD);

      current.rank = isTied ? previous.rank : index + 1;
    });
  });

  const dnfRows = rows
    .filter((row) => row.isDnf)
    .sort((a, b) => {
      const countryA = getCountryById(a.gymnast.countryId).name;
      const countryB = getCountryById(b.gymnast.countryId).name;
      return `${countryA}-${a.gymnast.name}`.localeCompare(`${countryB}-${b.gymnast.name}`);
    });

  return [...activeRows, ...dnfRows];
};

export const getAllAroundFinalCompletionCount = (state: SimulationState): number =>
  getAllAroundFinalRankings(state).reduce(
    (sum, row) => sum + row.completedRoutineCount,
    0,
  );
