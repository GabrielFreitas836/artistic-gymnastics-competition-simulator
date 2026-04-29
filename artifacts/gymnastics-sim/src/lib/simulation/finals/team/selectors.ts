import { getCountryById } from "@/lib/countries";
import { createApparatusMap } from "@/lib/competition";
import { getTeamRankings, RankedTeam } from "@/lib/simulation/rankings";
import { competesOnApparatus } from "@/lib/simulation/scoring";
import { selectAllGymnasts } from "@/lib/simulation/selectors";
import {
  isEligibleForTeamFinalApparatus,
  isMixedGroupGymnast,
  isTitularOnApparatus,
} from "@/lib/teamRoster";
import {
  Apparatus,
  ApparatusKey,
  DnsMap,
  Gymnast,
  Score,
  ScoreMap,
  SimulationState,
  Team,
  TeamFinalLineups,
  TeamFinalSlot,
} from "@/lib/types";

import { getTeamFinalApparatus } from "./constants";

type TeamFinalRoutineStatus = "EMPTY" | "PARTIAL" | "OK";

export interface QualificationCompletionStatus {
  isComplete: boolean;
  missingRoutineCount: number;
  message: string;
}

export interface TeamFinalQualificationPool {
  qualified: RankedTeam[];
  reserves: RankedTeam[];
}

export interface TeamFinalApparatusResult {
  apparatus: ApparatusKey;
  score: number;
  rank: number | null;
  completedCount: number;
  isComplete: boolean;
  status: TeamFinalRoutineStatus;
  lineupGymnasts: Gymnast[];
}

export interface TeamFinalTotalResult {
  apparatus: Record<ApparatusKey, TeamFinalApparatusResult>;
  total: number;
  completedRoutineCount: number;
  isComplete: boolean;
  standardDeviation: number;
}

export interface TeamFinalRankingRow {
  slot: TeamFinalSlot;
  team: Team;
  total: number;
  rank: number;
  tied: boolean;
  medal: "Gold" | "Silver" | "Bronze" | null;
  completedRoutineCount: number;
  isComplete: boolean;
  standardDeviation: number;
  apparatus: Record<ApparatusKey, TeamFinalApparatusResult>;
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000;
const round6 = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;
const getStateDiscipline = (state: SimulationState) => state.discipline || "WAG";

const getPopulationStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
};

export const getQualificationCompletionStatus = (
  state: SimulationState,
): QualificationCompletionStatus => {
  if (state.phase < 6) {
    return {
      isComplete: false,
      missingRoutineCount: 0,
      message: "Phase 6 results must be reached before Team Final unlocks.",
    };
  }

  const teamCount = Object.keys(state.teams).length;
  if (teamCount !== 12) {
    return {
      isComplete: false,
      missingRoutineCount: 0,
      message: `Qualification setup is incomplete: expected 12 teams, found ${teamCount}.`,
    };
  }

  const mixedGymnastCount = Object.values(state.mixedGroups).reduce(
    (sum, group) => sum + group.gymnasts.length,
    0,
  );
  if (mixedGymnastCount !== 36) {
    return {
      isComplete: false,
      missingRoutineCount: 0,
      message: `Qualification setup is incomplete: expected 36 mixed-group gymnasts, found ${mixedGymnastCount}.`,
    };
  }

  const allGymnasts = selectAllGymnasts(state);
  let missingRoutineCount = 0;

  allGymnasts.forEach((gymnast) => {
    if (isMixedGroupGymnast(gymnast)) {
      gymnast.apparatus.forEach((apparatus) => {
        if (apparatus === "VT*") {
          const vaults = state.scores[gymnast.id]?.["VT*"];
          const hasVault1 = Array.isArray(vaults) && Boolean(vaults[0]) || Boolean(state.dns[gymnast.id]?.VT1);
          const hasVault2 = Array.isArray(vaults) && Boolean(vaults[1]) || Boolean(state.dns[gymnast.id]?.VT2);

          if (!hasVault1) missingRoutineCount += 1;
          if (!hasVault2) missingRoutineCount += 1;
          return;
        }

        const storedScore = state.scores[gymnast.id]?.[apparatus];
        if (!storedScore && !state.dns[gymnast.id]?.[apparatus]) {
          missingRoutineCount += 1;
        }
      });
      return;
    }

    getTeamFinalApparatus(state.discipline).forEach((apparatus) => {
      if (!competesOnApparatus(gymnast, apparatus, {
        teams: state.teams,
        qualificationStandByUsage: state.qualificationStandByUsage,
        dns: state.dns,
      })) {
        return;
      }

      if (apparatus === "VT" && gymnast.apparatus.includes("VT*") && isTitularOnApparatus(gymnast, "VT")) {
        const vaults = state.scores[gymnast.id]?.["VT*"];
        const hasVault1 = Array.isArray(vaults) && Boolean(vaults[0]) || Boolean(state.dns[gymnast.id]?.VT1);
        const hasVault2 = Array.isArray(vaults) && Boolean(vaults[1]) || Boolean(state.dns[gymnast.id]?.VT2);

        if (!hasVault1) missingRoutineCount += 1;
        if (!hasVault2) missingRoutineCount += 1;
        return;
      }

      const storedScore = state.scores[gymnast.id]?.[apparatus];
      if (!storedScore && !state.dns[gymnast.id]?.[apparatus as Exclude<Apparatus, "VT*">]) {
        missingRoutineCount += 1;
      }
    });
  });

  if (missingRoutineCount > 0) {
    return {
      isComplete: false,
      missingRoutineCount,
      message: `${missingRoutineCount} qualification routine${missingRoutineCount === 1 ? "" : "s"} still missing.`,
    };
  }

  return {
    isComplete: true,
    missingRoutineCount: 0,
    message: "Qualification is complete. Phase 7 finals are unlocked.",
  };
};

export const getTeamFinalQualificationPool = (
  state: SimulationState,
): TeamFinalQualificationPool => {
  const rows = getTeamRankings(
    state.teams,
    state.scores,
    state.dns,
    getStateDiscipline(state),
    state.qualificationStandByUsage,
  );

  return {
    qualified: rows.filter((row) => row.status === "Q").slice(0, 8),
    reserves: rows.filter((row) => row.status === "R1" || row.status === "R2"),
  };
};

export const buildTeamFinalSlots = (
  state: SimulationState,
  replacementSeedRanks: number[] = [],
): TeamFinalSlot[] => {
  const { qualified, reserves } = getTeamFinalQualificationPool(state);
  if (qualified.length < 8) return [];

  const reserveBySeed = replacementSeedRanks.reduce<
    Record<number, { teamId: string; reserveSource: "R1" | "R2" }>
  >((accumulator, seedRank, index) => {
    const reserve = reserves[index];
    if (!reserve) return accumulator;

    accumulator[seedRank] = {
      teamId: reserve.team.countryId,
      reserveSource: reserve.status === "R2" ? "R2" : "R1",
    };
    return accumulator;
  }, {});

  return qualified.map((row, index) => {
    const seedRank = row.rank ?? index + 1;
    const replacement = reserveBySeed[seedRank];

    return {
      seedRank,
      qualifiedTeamId: row.team.countryId,
      activeTeamId: replacement?.teamId || row.team.countryId,
      reserveSource: replacement?.reserveSource,
    };
  });
};

export const getTeamFinalFinalistTeams = (state: SimulationState): Team[] =>
  [...state.finals.teamFinal.slots]
    .sort((a, b) => a.seedRank - b.seedRank)
    .map((slot) => state.teams[slot.activeTeamId])
    .filter((team): team is Team => Boolean(team));

export const getTeamFinalEligibleGymnasts = (
  team: Team,
  apparatus: ApparatusKey,
): Gymnast[] => team.gymnasts.filter((gymnast) => isEligibleForTeamFinalApparatus(gymnast, apparatus));

export const getTeamFinalLineupGymnasts = (
  team: Team,
  apparatus: ApparatusKey,
  lineups: TeamFinalLineups,
): Gymnast[] => {
  const lineupIds = lineups[team.countryId]?.[apparatus] || [];
  if (lineupIds.length === 0) return [];

  const gymnastById = new Map(team.gymnasts.map((gymnast) => [gymnast.id, gymnast]));
  return lineupIds
    .map((gymnastId) => gymnastById.get(gymnastId))
    .filter(
      (gymnast): gymnast is Gymnast =>
        Boolean(gymnast) && isEligibleForTeamFinalApparatus(gymnast as Gymnast, apparatus),
    );
};

export const isTeamFinalLineupComplete = (
  team: Team,
  lineups: TeamFinalLineups,
): boolean =>
  getTeamFinalApparatus(
    team.gymnasts.some((gymnast) => gymnast.apparatus.includes("UB") || gymnast.apparatus.includes("BB"))
      ? "WAG"
      : "MAG",
  ).every((apparatus) => {
    const lineupIds = lineups[team.countryId]?.[apparatus] || [];
    if (lineupIds.length !== 3) return false;

    const uniqueIds = new Set(lineupIds);
    if (uniqueIds.size !== 3) return false;

    return getTeamFinalLineupGymnasts(team, apparatus, lineups).length === 3;
  });

export const areTeamFinalLineupsComplete = (
  state: SimulationState,
  slots: TeamFinalSlot[] = state.finals.teamFinal.slots,
): boolean => {
  if (slots.length !== 8) return false;

  return slots.every((slot) => {
    const team = state.teams[slot.activeTeamId];
    return Boolean(team) && isTeamFinalLineupComplete(team, state.finals.teamFinal.lineups);
  });
};

export const getTeamFinalStage = (
  state: SimulationState,
): "substitution" | "lineups" | "scoring" => {
  if (state.finals.teamFinal.slots.length !== 8) return "substitution";
  if (!areTeamFinalLineupsComplete(state)) return "lineups";
  return "scoring";
};

export const isTeamFinalDnsActive = (
  dns: DnsMap,
  gymnastId: string,
  apparatus: ApparatusKey,
): boolean => Boolean(dns[gymnastId]?.[apparatus]);

export const getTeamFinalStoredScore = (
  scores: ScoreMap,
  gymnastId: string,
  apparatus: ApparatusKey,
): Score | undefined => scores[gymnastId]?.[apparatus] as Score | undefined;

export const getTeamFinalApparatusResult = (
  team: Team,
  apparatus: ApparatusKey,
  lineups: TeamFinalLineups,
  scores: ScoreMap,
  dns: DnsMap,
): TeamFinalApparatusResult => {
  const lineupGymnasts = getTeamFinalLineupGymnasts(team, apparatus, lineups);
  if (lineupGymnasts.length !== 3) {
    return {
      apparatus,
      score: 0,
      rank: null,
      completedCount: 0,
      isComplete: false,
      status: "EMPTY",
      lineupGymnasts,
    };
  }

  let score = 0;
  let completedCount = 0;

  lineupGymnasts.forEach((gymnast) => {
    if (isTeamFinalDnsActive(dns, gymnast.id, apparatus)) {
      completedCount += 1;
      return;
    }

    const storedScore = getTeamFinalStoredScore(scores, gymnast.id, apparatus);
    if (storedScore) {
      score += storedScore.total;
      completedCount += 1;
    }
  });

  const isComplete = completedCount === lineupGymnasts.length;

  return {
    apparatus,
    score: Number(score.toFixed(3)),
    rank: null,
    completedCount,
    isComplete,
    status: isComplete ? "OK" : completedCount > 0 ? "PARTIAL" : "EMPTY",
    lineupGymnasts,
  };
};

export const getTeamFinalTotalResult = (
  team: Team,
  lineups: TeamFinalLineups,
  scores: ScoreMap,
  dns: DnsMap,
  discipline: SimulationState["discipline"],
): TeamFinalTotalResult => {
  const teamFinalApparatus = getTeamFinalApparatus(discipline);
  const apparatus = createApparatusMap<TeamFinalApparatusResult>((apparatusKey) =>
    teamFinalApparatus.includes(apparatusKey)
      ? getTeamFinalApparatusResult(team, apparatusKey, lineups, scores, dns)
        : {
          apparatus: apparatusKey,
          score: 0,
          rank: null,
          completedCount: 0,
          isComplete: false,
          status: "EMPTY",
          lineupGymnasts: [],
        },
  );

  const apparatusScores = teamFinalApparatus.map((event) => apparatus[event].score);
  const completedRoutineCount = teamFinalApparatus.reduce(
    (sum, event) => sum + apparatus[event].completedCount,
    0,
  );
  const total = Number(apparatusScores.reduce((sum, value) => sum + value, 0).toFixed(3));

  return {
    apparatus,
    total,
    completedRoutineCount,
    isComplete: teamFinalApparatus.every((event) => apparatus[event].isComplete),
    standardDeviation: Number(getPopulationStandardDeviation(apparatusScores).toFixed(6)),
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

export const getTeamFinalRankings = (state: SimulationState): TeamFinalRankingRow[] => {
  const slots = [...state.finals.teamFinal.slots].sort((a, b) => a.seedRank - b.seedRank);
  const rows: TeamFinalRankingRow[] = [];

  slots.forEach((slot) => {
    const team = state.teams[slot.activeTeamId];
    if (!team) return;

    const result = getTeamFinalTotalResult(
      team,
      state.finals.teamFinal.lineups,
      state.finals.teamFinal.scores,
      state.finals.teamFinal.dns,
      getStateDiscipline(state),
    );

    rows.push({
      slot,
      team,
      total: result.total,
      rank: 0,
      tied: false,
      medal: null,
      completedRoutineCount: result.completedRoutineCount,
      isComplete: result.isComplete,
      standardDeviation: result.standardDeviation,
      apparatus: result.apparatus,
    });
  });

  rows.sort((a, b) => {
    if (round3(b.total) !== round3(a.total)) {
      return b.total - a.total;
    }

    if (round6(a.standardDeviation) !== round6(b.standardDeviation)) {
      return a.standardDeviation - b.standardDeviation;
    }

    return getCountryById(a.team.countryId).name.localeCompare(getCountryById(b.team.countryId).name);
  });

  rows.forEach((row, index) => {
    if (index === 0) {
      row.rank = 1;
      return;
    }

    const previous = rows[index - 1];
    const sameTotal = round3(row.total) === round3(previous.total);
    const sameDeviation = round6(row.standardDeviation) === round6(previous.standardDeviation);

    if (sameTotal && sameDeviation) {
      row.rank = previous.rank;
      row.tied = true;
      previous.tied = true;
      return;
    }

    row.rank = index + 1;
  });

  const allComplete = rows.length === 8 && rows.every((row) => row.isComplete);
  rows.forEach((row) => {
    row.medal = allComplete ? getMedalForRank(row.rank) : null;
  });

  const teamFinalApparatus = getTeamFinalApparatus(getStateDiscipline(state));
  teamFinalApparatus.forEach((apparatusKey) => {
    const rankedRows = rows
      .filter((row) => row.apparatus[apparatusKey].status !== "EMPTY")
      .sort((a, b) => {
        if (round3(b.apparatus[apparatusKey].score) !== round3(a.apparatus[apparatusKey].score)) {
          return b.apparatus[apparatusKey].score - a.apparatus[apparatusKey].score;
        }

        return getCountryById(a.team.countryId).name.localeCompare(getCountryById(b.team.countryId).name);
      });

    rankedRows.forEach((row, index) => {
      if (index === 0) {
        row.apparatus[apparatusKey].rank = 1;
        return;
      }

      const previous = rankedRows[index - 1].apparatus[apparatusKey];
      row.apparatus[apparatusKey].rank =
        round3(row.apparatus[apparatusKey].score) === round3(previous.score)
          ? previous.rank
          : index + 1;
    });
  });

  return rows;
};

export const getTeamFinalCompletionCount = (state: SimulationState): number =>
  getTeamFinalRankings(state).reduce((sum, row) => sum + row.completedRoutineCount, 0);
