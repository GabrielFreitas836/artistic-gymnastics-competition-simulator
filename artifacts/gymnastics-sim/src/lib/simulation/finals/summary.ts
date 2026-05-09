import {
  APPARATUS_FINAL_LABEL,
  getApparatusFinals,
  getApparatusFinalQualificationPool,
  getApparatusFinalRankings,
  isApparatusFinalComplete,
} from "@/lib/simulation/finals/apparatus";
import {
  getAllAroundFinalQualificationPool,
  getAllAroundFinalRankings,
} from "@/lib/simulation/finals/all-around";
import { getCompetitionConfig } from "@/lib/competitionRun";
import {
  getQualificationCompletionStatus,
  getTeamFinalRankings,
} from "@/lib/simulation/finals/team";
import { ApparatusKey, SimulationState } from "@/lib/types";

type MedalType = "Gold" | "Silver" | "Bronze";

interface MedalEventEntry {
  medal: MedalType;
  eventKey: "TEAM" | "AA" | ApparatusKey;
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
  const competitionConfig = getCompetitionConfig(state);
  const apparatusFinals = getApparatusFinals(state.discipline);
  const totalFinals =
    (competitionConfig.finalsConfiguration.hasTeamFinal ? 1 : 0)
    + (competitionConfig.finalsConfiguration.hasAAFinal ? 1 : 0)
    + (competitionConfig.finalsConfiguration.hasApparatusFinals ? apparatusFinals.length : 0);
  if (!qualificationComplete) {
    return {
      totalFinals,
      completedFinals: 0,
      teamFinalComplete: false,
      allAroundFinalComplete: false,
      apparatusFinalsComplete: 0,
      isMedalTableUnlocked: false,
    };
  }

  const teamFinalComplete = !competitionConfig.finalsConfiguration.hasTeamFinal
    || (
      getTeamFinalRankings(state).length === 8
      && getTeamFinalRankings(state).every((row) => row.isComplete)
    );
  const allAroundPool = competitionConfig.finalsConfiguration.hasAAFinal
    ? getAllAroundFinalQualificationPool(state)
    : { qualified: [] as ReturnType<typeof getAllAroundFinalQualificationPool>["qualified"] };
  const allAroundRankings = competitionConfig.finalsConfiguration.hasAAFinal
    ? getAllAroundFinalRankings(state)
    : [];
  const allAroundFinalComplete =
    !competitionConfig.finalsConfiguration.hasAAFinal
    || allAroundPool.qualified.length === 1
    || (allAroundRankings.length > 0 && allAroundRankings.every((row) => row.isComplete));
  const apparatusFinalsComplete = competitionConfig.finalsConfiguration.hasApparatusFinals
    ? apparatusFinals.filter((apparatus) => {
      const pool = getApparatusFinalQualificationPool(state, apparatus);
      return pool.qualified.length === 1 || isApparatusFinalComplete(state, apparatus);
    }).length
    : 0;

  const completedFinals =
    ((competitionConfig.finalsConfiguration.hasTeamFinal && teamFinalComplete) ? 1 : 0)
    + ((competitionConfig.finalsConfiguration.hasAAFinal && allAroundFinalComplete) ? 1 : 0)
    + apparatusFinalsComplete;

  const medalSummaryUnlockedBy = competitionConfig.finalsConfiguration.medalSummaryUnlockedBy;
  const medalTableReady =
    (!medalSummaryUnlockedBy.includes("TEAM") || teamFinalComplete)
    && (!medalSummaryUnlockedBy.includes("AA") || allAroundFinalComplete)
    && (!medalSummaryUnlockedBy.includes("APPARATUS")
      || apparatusFinalsComplete === (competitionConfig.finalsConfiguration.hasApparatusFinals ? apparatusFinals.length : 0));

  return {
    totalFinals,
    completedFinals,
    teamFinalComplete,
    allAroundFinalComplete,
    apparatusFinalsComplete,
    isMedalTableUnlocked: medalTableReady,
  };
};

export const getCountryMedalSummary = (
  state: SimulationState,
): CountryMedalSummary[] => {
  const competitionConfig = getCompetitionConfig(state);
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

  if (competitionConfig.finalsConfiguration.hasTeamFinal) {
    getTeamFinalRankings(state).forEach((row) => {
      if (!row.medal) return;
      appendMedal(getSummary(row.team.countryId), row.medal, {
        medal: row.medal,
        eventKey: "TEAM",
        eventLabel: "Team Final",
      });
    });
  }

  if (competitionConfig.finalsConfiguration.hasAAFinal) {
    getAllAroundFinalRankings(state).forEach((row) => {
      if (!row.medal) return;
      appendMedal(getSummary(row.gymnast.countryId), row.medal, {
        medal: row.medal,
        eventKey: "AA",
        eventLabel: "Individual All-Around",
      });
    });
  }

  if (competitionConfig.finalsConfiguration.hasApparatusFinals) {
    getApparatusFinals(state.discipline).forEach((apparatus) => {
      getApparatusFinalRankings(state, apparatus).forEach((row) => {
        if (!row.medal) return;
        appendMedal(getSummary(row.gymnast.countryId), row.medal, {
          medal: row.medal,
          eventKey: apparatus,
          eventLabel: `${APPARATUS_FINAL_LABEL[apparatus]} Final`,
        });
      });
    });
  }

  return [...summaryByCountryId.values()].sort((a, b) => compareMedalTotals(a, b));
};

export const getGymnastMedalSummary = (
  state: SimulationState,
): GymnastMedalSummary[] => {
  const competitionConfig = getCompetitionConfig(state);
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

  if (competitionConfig.finalsConfiguration.hasAAFinal) {
    getAllAroundFinalRankings(state).forEach((row) => {
      if (!row.medal) return;
      appendMedal(getSummary(row.gymnast.id, row.gymnast.name, row.gymnast.countryId), row.medal, {
        medal: row.medal,
        eventKey: "AA",
        eventLabel: "Individual All-Around",
      });
    });
  }

  if (competitionConfig.finalsConfiguration.hasApparatusFinals) {
    getApparatusFinals(state.discipline).forEach((apparatus) => {
      getApparatusFinalRankings(state, apparatus).forEach((row) => {
        if (!row.medal) return;
        appendMedal(getSummary(row.gymnast.id, row.gymnast.name, row.gymnast.countryId), row.medal, {
          medal: row.medal,
          eventKey: apparatus,
          eventLabel: `${APPARATUS_FINAL_LABEL[apparatus]} Final`,
        });
      });
    });
  }

  return [...summaryByGymnastId.values()].sort((a, b) => {
    const medalOrder = compareMedalTotals(a, b);
    if (medalOrder !== 0) return medalOrder;
    return a.gymnastName.localeCompare(b.gymnastName);
  });
};
