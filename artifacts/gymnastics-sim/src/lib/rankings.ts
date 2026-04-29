import { getCountryById } from "./countries";
import { createApparatusMap, getApparatusForDiscipline } from "./competition";
import {
  ApparatusKey,
  Discipline,
  DnsMap,
  Gymnast,
  QualificationStandByUsage,
  RankingResultState,
  ScoreMap,
  Team,
} from "./types";
import {
  competesOnApparatus,
  getAAComponents,
  getAllAroundResultState,
  getAllAroundTotal,
  getApparatusComponents,
  getApparatusResultState,
  getEffectiveScore,
  getTeamApparatusResult,
  getTeamTotalResult,
  getVaultFinalScore,
} from "./scoring";

export interface RankedTeam {
  team: Team;
  total: number | null;
  rank: number | null;
  resultState: Exclude<RankingResultState, "DNS">;
  status: "Q" | "R1" | "R2" | "";
}

export type TeamApparatusKey = ApparatusKey;

export interface TeamApparatusEntry {
  apparatus: TeamApparatusKey;
  score: number | null;
  rank: number | null;
  countedScores: number[];
  resultState: Exclude<RankingResultState, "DNS">;
  standardDeviation: number | null;
}

export interface TeamApparatusRankingRow {
  team: Team;
  apparatus: Record<TeamApparatusKey, TeamApparatusEntry>;
}

export interface RankedGymnast {
  gymnast: Gymnast;
  total: number | null;
  rank: number | null;
  resultState: RankingResultState;
  status: "Q" | "R1" | "R2" | "R3" | "R4" | "-";
  tbE: number | null;
  tbD: number | null;
  tbPenalty: number | null;
  tied: boolean;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

const getTeamSortName = (team: Team): string => getCountryById(team.countryId).name;

const sortTeamsAlphabetically = (a: RankedTeam, b: RankedTeam) =>
  getTeamSortName(a.team).localeCompare(getTeamSortName(b.team));

const sortGymnastsAlphabetically = (a: RankedGymnast, b: RankedGymnast) =>
  a.gymnast.name.localeCompare(b.gymnast.name);

const getPopulationStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
};

const createEmptyTeamApparatusEntry = (
  apparatus: TeamApparatusKey,
): TeamApparatusEntry => ({
  apparatus,
  score: null,
  rank: null,
  countedScores: [],
  resultState: "EMPTY",
  standardDeviation: null,
});

const apply2PerCountryRule = (
  list: RankedGymnast[],
  limit: number,
  reserves: number,
): RankedGymnast[] => {
  const countryCounts: Record<string, number> = {};
  let qualifiedCount = 0;
  let reserveCount = 0;

  list.forEach((item) => {
    const countryId = item.gymnast.countryId;
    if (!countryCounts[countryId]) countryCounts[countryId] = 0;

    if (qualifiedCount < limit) {
      if (countryCounts[countryId] < 2) {
        item.status = "Q";
        countryCounts[countryId] += 1;
        qualifiedCount += 1;
      } else {
        item.status = "-";
      }
      return;
    }

    if (reserveCount < reserves) {
      if (countryCounts[countryId] < 2) {
        item.status = `R${reserveCount + 1}` as RankedGymnast["status"];
        countryCounts[countryId] += 1;
        reserveCount += 1;
      } else {
        item.status = "-";
      }
      return;
    }

    item.status = "-";
  });

  return list;
};

const createTrailingGymnast = (
  gymnast: Gymnast,
  resultState: Extract<RankingResultState, "DNS" | "DNF">,
): RankedGymnast => ({
  gymnast,
  total: null,
  rank: null,
  resultState,
  status: "-",
  tbE: null,
  tbD: null,
  tbPenalty: null,
  tied: false,
});

const isEligibleForEventFinalRanking = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
  teams: Record<string, Team>,
  qualificationStandByUsage: QualificationStandByUsage,
  dns: DnsMap,
): boolean => {
  if (!competesOnApparatus(gymnast, apparatus, { teams, qualificationStandByUsage, dns })) {
    return false;
  }

  if (apparatus !== "VT") {
    return true;
  }

  // Regression guard: the VT qualification ranking must only include gymnasts
  // who actually entered double-vault mode (`VT*`) and can therefore chase EF.
  return gymnast.apparatus.includes("VT*");
};

export const getTeamRankings = (
  teams: Record<string, Team>,
  scores: ScoreMap,
  dns: DnsMap,
  discipline: Discipline,
  qualificationStandByUsage: QualificationStandByUsage = {},
): RankedTeam[] => {
  const ranked: RankedTeam[] = Object.values(teams).map((team) => {
    const result = getTeamTotalResult(team, scores, dns, discipline, qualificationStandByUsage);
    return {
      team,
      total: result.total,
      rank: null,
      resultState: result.resultState,
      status: "" as RankedTeam["status"],
    };
  });

  const okRows = ranked
    .filter((row) => row.resultState === "OK")
    .sort((a, b) => {
      if (r3((b.total as number)) !== r3((a.total as number))) {
        return (b.total as number) - (a.total as number);
      }
      return sortTeamsAlphabetically(a, b);
    });

  okRows.forEach((row, index) => {
    row.rank = index + 1;
    if (index < 8) row.status = "Q";
    else if (index === 8) row.status = "R1";
    else if (index === 9) row.status = "R2";
  });

  const emptyRows = ranked
    .filter((row) => row.resultState === "EMPTY")
    .sort(sortTeamsAlphabetically);

  const dnfRows = ranked
    .filter((row) => row.resultState === "DNF")
    .sort(sortTeamsAlphabetically);

  return [...okRows, ...emptyRows, ...dnfRows];
};

export const getApparatusRanking = (
  teams: Record<string, Team>,
  scores: ScoreMap,
  dns: DnsMap,
  discipline: Discipline,
  qualificationStandByUsage: QualificationStandByUsage = {},
): TeamApparatusRankingRow[] => {
  const activeApparatus = getApparatusForDiscipline(discipline);
  const rows = Object.values(teams).map((team) => ({
    team,
    apparatus: createApparatusMap((apparatus) => createEmptyTeamApparatusEntry(apparatus)),
  }));

  const rowsByTeamId = new Map(rows.map((row) => [row.team.countryId, row]));

  activeApparatus.forEach((apparatus) => {
    const entries = rows.map((row) => {
      const result = getTeamApparatusResult(
        row.team,
        apparatus,
        scores,
        dns,
        qualificationStandByUsage,
      );
      const entry: TeamApparatusEntry = {
        apparatus,
        score: result.score,
        rank: null,
        countedScores: result.countedScores,
        resultState: result.resultState,
        standardDeviation:
          result.resultState === "OK"
            ? Number(getPopulationStandardDeviation(result.countedScores).toFixed(6))
            : null,
      };

      return {
        teamId: row.team.countryId,
        entry,
      };
    });

    const rankedEntries = entries
      .filter((item) => item.entry.resultState === "OK")
      .sort((a, b) => {
        if (r3((b.entry.score as number)) !== r3((a.entry.score as number))) {
          return (b.entry.score as number) - (a.entry.score as number);
        }
        if (
          r6((a.entry.standardDeviation as number)) !==
          r6((b.entry.standardDeviation as number))
        ) {
          return (
            (a.entry.standardDeviation as number) -
            (b.entry.standardDeviation as number)
          );
        }
        return getCountryById(a.teamId).name.localeCompare(getCountryById(b.teamId).name);
      });

    rankedEntries.forEach((item, index) => {
      if (index === 0) {
        item.entry.rank = 1;
        return;
      }

      const previous = rankedEntries[index - 1].entry;
      const sameScore = r3(item.entry.score as number) === r3(previous.score as number);
      const sameDeviation =
        r6(item.entry.standardDeviation as number) ===
        r6(previous.standardDeviation as number);

      item.entry.rank = sameScore && sameDeviation ? previous.rank : index + 1;
    });

    entries.forEach(({ teamId, entry }) => {
      const row = rowsByTeamId.get(teamId);
      if (row) {
        row.apparatus[apparatus] = entry;
      }
    });
  });

  return rows;
};

export const getAllAroundRankings = (
  allGymnasts: Gymnast[],
  scores: ScoreMap,
  dns: DnsMap,
  discipline: Discipline,
  teams: Record<string, Team> = {},
  qualificationStandByUsage: QualificationStandByUsage = {},
): RankedGymnast[] => {
  const list: (RankedGymnast & {
    _total: number;
    _eSum: number;
    _penaltySum: number;
    _dSum: number;
  })[] = [];
  const trailing: RankedGymnast[] = [];

  allGymnasts.forEach((gymnast) => {
    const participationOptions = { teams, qualificationStandByUsage, dns };
    const resultState = getAllAroundResultState(
      gymnast,
      scores,
      dns,
      discipline,
      participationOptions,
    );
    if (resultState === "EMPTY") return;
    if (resultState === "DNF") {
      trailing.push(createTrailingGymnast(gymnast, "DNF"));
      return;
    }

    const total = getAllAroundTotal(
      gymnast,
      scores,
      dns,
      discipline,
      participationOptions,
    );
    if (total === null) return;

    const { eSum, dSum, penaltySum } = getAAComponents(gymnast, scores, dns, discipline);
    list.push({
      gymnast,
      total,
      rank: null,
      resultState: "OK",
      status: "-",
      tbE: eSum,
      tbD: dSum,
      tbPenalty: penaltySum,
      tied: false,
      _total: total,
      _eSum: eSum,
      _penaltySum: penaltySum,
      _dSum: dSum,
    });
  });

  list.sort((a, b) => {
    if (r3(b._total) !== r3(a._total)) return b._total - a._total;
    if (r3(b._eSum) !== r3(a._eSum)) return b._eSum - a._eSum;
    if (r3(a._penaltySum) !== r3(b._penaltySum)) {
      return a._penaltySum - b._penaltySum;
    }
    if (r3(b._dSum) !== r3(a._dSum)) return b._dSum - a._dSum;
    return a.gymnast.name.localeCompare(b.gymnast.name);
  });

  const isTrulyTiedAA = (a: (typeof list)[number], b: (typeof list)[number]) =>
    r3(a._total) === r3(b._total) &&
    r3(a._eSum) === r3(b._eSum) &&
    r3(a._penaltySum) === r3(b._penaltySum) &&
    r3(a._dSum) === r3(b._dSum);

  list.forEach((item, index) => {
    if (index === 0) {
      item.rank = 1;
      return;
    }

    const previous = list[index - 1];
    if (isTrulyTiedAA(previous, item)) {
      item.rank = previous.rank;
      item.tied = true;
      previous.tied = true;
      return;
    }

    item.rank = index + 1;
  });

  const qualified = apply2PerCountryRule(list as RankedGymnast[], 24, 4);
  return [...qualified, ...trailing.sort(sortGymnastsAlphabetically)];
};

export const getEventFinalRankings = (
  allGymnasts: Gymnast[],
  apparatus: ApparatusKey,
  scores: ScoreMap,
  dns: DnsMap,
  teams: Record<string, Team> = {},
  qualificationStandByUsage: QualificationStandByUsage = {},
): RankedGymnast[] => {
  const isVaultFinal = apparatus === "VT";
  const participationOptions = { teams, qualificationStandByUsage, dns };
  const eligibleRows: (RankedGymnast & { _total: number; _e: number; _d: number })[] = [];
  const trailing: RankedGymnast[] = [];

  allGymnasts.forEach((gymnast) => {
    if (!isEligibleForEventFinalRanking(
      gymnast,
      apparatus,
      teams,
      qualificationStandByUsage,
      dns,
    )) {
      return;
    }

    const resultState = getApparatusResultState(
      gymnast,
      apparatus,
      scores,
      dns,
      participationOptions,
    );
    if (resultState === "EMPTY") return;
    if (resultState === "DNS" || resultState === "DNF") {
      trailing.push(createTrailingGymnast(gymnast, resultState));
      return;
    }

    const total =
      apparatus === "VT" && gymnast.apparatus.includes("VT*")
        ? getVaultFinalScore(gymnast, scores, dns) ?? 0
        : getEffectiveScore(gymnast, apparatus, scores, dns, participationOptions);

    const { d, e } = getApparatusComponents(
      gymnast,
      apparatus,
      scores,
      dns,
      isVaultFinal,
    );

    const row: RankedGymnast & { _total: number; _e: number; _d: number } = {
      gymnast,
      total,
      rank: null,
      resultState: "OK",
      status: "-",
      tbE: e,
      tbD: d,
      tbPenalty: 0,
      tied: false,
      _total: total,
      _e: e,
      _d: d,
    };
    eligibleRows.push(row);
  });

  eligibleRows.sort((a, b) => {
    if (r3(b._total) !== r3(a._total)) return b._total - a._total;
    if (r3(b._e) !== r3(a._e)) return b._e - a._e;
    if (r3(b._d) !== r3(a._d)) return b._d - a._d;
    return a.gymnast.name.localeCompare(b.gymnast.name);
  });

  const isTrulyTiedEF = (a: (typeof eligibleRows)[number], b: (typeof eligibleRows)[number]) =>
    r3(a._total) === r3(b._total) &&
    r3(a._e) === r3(b._e) &&
    r3(a._d) === r3(b._d);

  eligibleRows.forEach((item, index) => {
    if (index === 0) {
      item.rank = 1;
      return;
    }

    const previous = eligibleRows[index - 1];
    if (isTrulyTiedEF(previous, item)) {
      item.rank = previous.rank;
      item.tied = true;
      previous.tied = true;
      return;
    }

    item.rank = index + 1;
  });

  const baseLimit = 8;
  let effectiveLimit = baseLimit;

  if (eligibleRows.length >= baseLimit) {
    const rankAtLimit = eligibleRows[baseLimit - 1].rank as number;
    effectiveLimit = eligibleRows.filter((item) => item.rank !== null && item.rank <= rankAtLimit).length;
  } else {
    effectiveLimit = eligibleRows.length;
  }

  const qualifiedEligible = apply2PerCountryRule(eligibleRows as RankedGymnast[], effectiveLimit, 3);
  return [...qualifiedEligible, ...trailing.sort(sortGymnastsAlphabetically)];
};
