import {
  APPARATUS_FINALS,
  APPARATUS_FINAL_LABEL,
  getApparatusFinalQualificationPool,
  getApparatusFinalRankings,
  isApparatusFinalComplete,
} from "@/lib/simulation/finals/apparatus";
import {
  getAllAroundFinalQualificationPool,
  getAllAroundFinalRankings,
} from "@/lib/simulation/finals/all-around";
import {
  getQualificationCompletionStatus,
  getTeamFinalRankings,
} from "@/lib/simulation/finals/team";
import { SimulationState } from "@/lib/types";

type MedalType = "Gold" | "Silver" | "Bronze";

interface MedalEventEntry {
  medal: MedalType;
  eventKey: "TEAM" | "AA" | "VT" | "UB" | "BB" | "FX";
  eventLabel: string;
}

export interface CountryMedalSummary {
  countryId: string;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  totalCount: number;
  medals: MedalEventEntry[];
}

export interface GymnastMedalSummary {
  gymnastId: string;
  gymnastName: string;
  countryId: string;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  totalCount: number;
  medals: MedalEventEntry[];
}

export interface FinalsCompletionSummary {
  totalFinals: number;
  completedFinals: number;
  teamFinalComplete: boolean;
  allAroundFinalComplete: boolean;
  apparatusFinalsComplete: number;
  isMedalTableUnlocked: boolean;
}

const compareMedalTotals = (
  a: Pick<CountryMedalSummary, "goldCount" | "silverCount" | "bronzeCount" | "totalCount">,
  b: Pick<CountryMedalSummary, "goldCount" | "silverCount" | "bronzeCount" | "totalCount">,
): number => {
  if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
  if (b.goldCount !== a.goldCount) return b.goldCount - a.goldCount;
  if (b.silverCount !== a.silverCount) return b.silverCount - a.silverCount;
  return b.bronzeCount - a.bronzeCount;
};

const appendMedal = (
  summary: Pick<CountryMedalSummary, "goldCount" | "silverCount" | "bronzeCount" | "totalCount" | "medals">,
  medal: MedalType,
  entry: MedalEventEntry,
): void => {
  summary.totalCount += 1;
  summary.medals.push(entry);

  if (medal === "Gold") summary.goldCount += 1;
  if (medal === "Silver") summary.silverCount += 1;
  if (medal === "Bronze") summary.bronzeCount += 1;
};

export const getFinalsCompletionSummary = (
  state: SimulationState,
): FinalsCompletionSummary => {
  const qualificationComplete = getQualificationCompletionStatus(state).isComplete;
  if (!qualificationComplete) {
    return {
      totalFinals: 6,
      completedFinals: 0,
      teamFinalComplete: false,
      allAroundFinalComplete: false,
      apparatusFinalsComplete: 0,
      isMedalTableUnlocked: false,
    };
  }

  const teamFinalComplete = getTeamFinalRankings(state).length === 8
    && getTeamFinalRankings(state).every((row) => row.isComplete);
  const allAroundPool = getAllAroundFinalQualificationPool(state);
  const allAroundRankings = getAllAroundFinalRankings(state);
  const allAroundFinalComplete =
    allAroundPool.qualified.length === 1
    || (allAroundRankings.length > 0 && allAroundRankings.every((row) => row.isComplete));
  const apparatusFinalsComplete = APPARATUS_FINALS.filter((apparatus) => {
    const pool = getApparatusFinalQualificationPool(state, apparatus);
    return pool.qualified.length === 1 || isApparatusFinalComplete(state, apparatus);
  }).length;

  const completedFinals =
    (teamFinalComplete ? 1 : 0)
    + (allAroundFinalComplete ? 1 : 0)
    + apparatusFinalsComplete;

  return {
    totalFinals: 6,
    completedFinals,
    teamFinalComplete,
    allAroundFinalComplete,
    apparatusFinalsComplete,
    isMedalTableUnlocked: completedFinals === 6,
  };
};

export const getCountryMedalSummary = (
  state: SimulationState,
): CountryMedalSummary[] => {
  const summaryByCountryId = new Map<string, CountryMedalSummary>();

  const getSummary = (countryId: string): CountryMedalSummary => {
    const current = summaryByCountryId.get(countryId);
    if (current) return current;

    const created: CountryMedalSummary = {
      countryId,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      totalCount: 0,
      medals: [],
    };
    summaryByCountryId.set(countryId, created);
    return created;
  };

  getTeamFinalRankings(state).forEach((row) => {
    if (!row.medal) return;
    appendMedal(getSummary(row.team.countryId), row.medal, {
      medal: row.medal,
      eventKey: "TEAM",
      eventLabel: "Team Final",
    });
  });

  getAllAroundFinalRankings(state).forEach((row) => {
    if (!row.medal) return;
    appendMedal(getSummary(row.gymnast.countryId), row.medal, {
      medal: row.medal,
      eventKey: "AA",
      eventLabel: "Individual All-Around",
    });
  });

  APPARATUS_FINALS.forEach((apparatus) => {
    getApparatusFinalRankings(state, apparatus).forEach((row) => {
      if (!row.medal) return;
      appendMedal(getSummary(row.gymnast.countryId), row.medal, {
        medal: row.medal,
        eventKey: apparatus,
        eventLabel: `${APPARATUS_FINAL_LABEL[apparatus]} Final`,
      });
    });
  });

  return [...summaryByCountryId.values()].sort((a, b) => compareMedalTotals(a, b));
};

export const getGymnastMedalSummary = (
  state: SimulationState,
): GymnastMedalSummary[] => {
  const summaryByGymnastId = new Map<string, GymnastMedalSummary>();

  const getSummary = (
    gymnastId: string,
    gymnastName: string,
    countryId: string,
  ): GymnastMedalSummary => {
    const current = summaryByGymnastId.get(gymnastId);
    if (current) return current;

    const created: GymnastMedalSummary = {
      gymnastId,
      gymnastName,
      countryId,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      totalCount: 0,
      medals: [],
    };
    summaryByGymnastId.set(gymnastId, created);
    return created;
  };

  getTeamFinalRankings(state).forEach((row) => {
    if (!row.medal) return;
    const medal = row.medal;

    row.team.gymnasts.forEach((gymnast) => {
      appendMedal(getSummary(gymnast.id, gymnast.name, gymnast.countryId), medal, {
        medal,
        eventKey: "TEAM",
        eventLabel: "Team Final",
      });
    });
  });

  getAllAroundFinalRankings(state).forEach((row) => {
    if (!row.medal) return;
    appendMedal(getSummary(row.gymnast.id, row.gymnast.name, row.gymnast.countryId), row.medal, {
      medal: row.medal,
      eventKey: "AA",
      eventLabel: "Individual All-Around",
    });
  });

  APPARATUS_FINALS.forEach((apparatus) => {
    getApparatusFinalRankings(state, apparatus).forEach((row) => {
      if (!row.medal) return;
      appendMedal(getSummary(row.gymnast.id, row.gymnast.name, row.gymnast.countryId), row.medal, {
        medal: row.medal,
        eventKey: apparatus,
        eventLabel: `${APPARATUS_FINAL_LABEL[apparatus]} Final`,
      });
    });
  });

  return [...summaryByGymnastId.values()].sort((a, b) => {
    const medalOrder = compareMedalTotals(a, b);
    if (medalOrder !== 0) return medalOrder;
    return a.gymnastName.localeCompare(b.gymnastName);
  });
};
