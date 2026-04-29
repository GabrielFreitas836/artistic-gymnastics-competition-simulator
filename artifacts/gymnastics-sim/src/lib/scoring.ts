import { createApparatusMap, getApparatusForDiscipline } from "./competition";
import {
  ApparatusKey,
  Discipline,
  DnsEntryKey,
  DnsMap,
  Gymnast,
  QualificationStandByUsage,
  RankingResultState,
  Score,
  ScoreMap,
  Team,
} from "./types";
import {
  getActivatedStandByGymnast,
  isMixedGroupGymnast,
  isQualificationActiveOnApparatus,
  isTitularOnApparatus,
} from "./teamRoster";

interface QualificationParticipationOptions {
  teams?: Record<string, Team>;
  qualificationStandByUsage?: QualificationStandByUsage;
  dns?: DnsMap;
}

const usesDoubleVaultMode = (gymnast: Gymnast): boolean =>
  gymnast.apparatus.includes("VT*")
  && (isMixedGroupGymnast(gymnast) || isTitularOnApparatus(gymnast, "VT"));

export const calculateScore = (d: number, e: number, pen: number): number => {
  const total = Number(d) + Number(e) - Number(pen);
  return Math.max(0, Number(total.toFixed(3)));
};

export const isDnsActive = (
  dns: DnsMap,
  gymnastId: string,
  key: DnsEntryKey,
): boolean => Boolean(dns[gymnastId]?.[key]);

export const competesOnApparatus = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
  options: QualificationParticipationOptions = {},
): boolean => {
  if (isMixedGroupGymnast(gymnast)) {
    return apparatus === "VT"
      ? gymnast.apparatus.includes("VT") || gymnast.apparatus.includes("VT*")
      : gymnast.apparatus.includes(apparatus);
  }

  if (options.teams) {
    return isQualificationActiveOnApparatus(
      gymnast,
      apparatus,
      options.teams,
      options.qualificationStandByUsage,
      options.dns,
    );
  }

  return isTitularOnApparatus(gymnast, apparatus);
};

export const competesAllAround = (
  gymnast: Gymnast,
  discipline: Discipline,
  options: QualificationParticipationOptions = {},
): boolean =>
  getApparatusForDiscipline(discipline).every((apparatus) =>
    competesOnApparatus(gymnast, apparatus, options),
  );

export const getDnsEntryKeyForApp = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
  vaultIndex?: 0 | 1,
): DnsEntryKey => {
  if (apparatus !== "VT") return apparatus;
  if (usesDoubleVaultMode(gymnast)) return vaultIndex === 1 ? "VT2" : "VT1";
  return "VT";
};

const getStoredScore = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
  scores: ScoreMap,
): Score | undefined => {
  const gScores = scores[gymnast.id];
  if (!gScores) return undefined;

  if (apparatus === "VT") {
    if (usesDoubleVaultMode(gymnast)) {
      const vaults = gScores["VT*"];
      return Array.isArray(vaults) ? vaults[0] : undefined;
    }
    return gScores["VT"] as Score | undefined;
  }

  return gScores[apparatus] as Score | undefined;
};

export const getEffectiveScore = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
  scores: ScoreMap,
  dns: DnsMap,
  options: QualificationParticipationOptions = {},
): number => {
  if (!competesOnApparatus(gymnast, apparatus, { ...options, dns })) {
    return 0;
  }

  const dnsKey = getDnsEntryKeyForApp(gymnast, apparatus);
  if (isDnsActive(dns, gymnast.id, dnsKey)) return 0;

  return getStoredScore(gymnast, apparatus, scores)?.total || 0;
};

export const getVaultFinalScore = (
  gymnast: Gymnast,
  scores: ScoreMap,
  dns: DnsMap,
): number | null => {
  if (!usesDoubleVaultMode(gymnast)) return null;
  if (isDnsActive(dns, gymnast.id, "VT1") || isDnsActive(dns, gymnast.id, "VT2")) {
    return null;
  }

  const gScores = scores[gymnast.id];
  const vaults = gScores?.["VT*"];
  if (!gScores || !Array.isArray(vaults)) return null;

  const v1 = vaults[0]?.total || 0;
  const v2 = vaults[1]?.total || 0;
  if (v1 === 0 || v2 === 0) return null;

  return Math.floor(((v1 + v2) / 2) * 1000) / 1000;
};

export const getApparatusResultState = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
  scores: ScoreMap,
  dns: DnsMap,
  options: QualificationParticipationOptions = {},
): RankingResultState => {
  if (!competesOnApparatus(gymnast, apparatus, { ...options, dns })) return "EMPTY";

  if (apparatus === "VT" && usesDoubleVaultMode(gymnast)) {
    if (isDnsActive(dns, gymnast.id, "VT1") || isDnsActive(dns, gymnast.id, "VT2")) {
      return "DNF";
    }
    return getVaultFinalScore(gymnast, scores, dns) !== null ? "OK" : "EMPTY";
  }

  const dnsKey = getDnsEntryKeyForApp(gymnast, apparatus);
  if (isDnsActive(dns, gymnast.id, dnsKey)) return "DNS";
  return getEffectiveScore(gymnast, apparatus, scores, dns, options) > 0 ? "OK" : "EMPTY";
};

const hasEffectiveDnsForAllAround = (
  gymnast: Gymnast,
  dns: DnsMap,
  discipline: Discipline,
  options: QualificationParticipationOptions = {},
): boolean =>
  getApparatusForDiscipline(discipline).some((apparatus) =>
    competesOnApparatus(gymnast, apparatus, { ...options, dns })
    && isDnsActive(dns, gymnast.id, getDnsEntryKeyForApp(gymnast, apparatus)),
  );

export const getAllAroundTotal = (
  gymnast: Gymnast,
  scores: ScoreMap,
  dns: DnsMap,
  discipline: Discipline,
  options: QualificationParticipationOptions = {},
): number | null => {
  if (!competesAllAround(gymnast, discipline, { ...options, dns })) {
    return null;
  }

  const totals = getApparatusForDiscipline(discipline).map((apparatus) =>
    getEffectiveScore(gymnast, apparatus, scores, dns, options),
  );

  if (totals.some((score) => score === 0)) return null;
  return Number(totals.reduce((sum, score) => sum + score, 0).toFixed(3));
};

export const getAllAroundResultState = (
  gymnast: Gymnast,
  scores: ScoreMap,
  dns: DnsMap,
  discipline: Discipline,
  options: QualificationParticipationOptions = {},
): RankingResultState => {
  if (!competesAllAround(gymnast, discipline, { ...options, dns })) return "EMPTY";
  if (hasEffectiveDnsForAllAround(gymnast, dns, discipline, options)) return "DNF";
  return getAllAroundTotal(gymnast, scores, dns, discipline, options) !== null ? "OK" : "EMPTY";
};

export interface TeamApparatusComputationResult {
  countedScores: number[];
  resultState: Exclude<RankingResultState, "DNS">;
  score: number | null;
}

const getEligibleTeamGymnasts = (
  team: Team,
  apparatus: ApparatusKey,
  qualificationStandByUsage: QualificationStandByUsage = {},
  dns: DnsMap = {},
): Gymnast[] => {
  const eligibleGymnasts = [...team.gymnasts.filter((gymnast) => isTitularOnApparatus(gymnast, apparatus))];
  const activatedStandBy = getActivatedStandByGymnast(team, apparatus, qualificationStandByUsage, dns);

  if (activatedStandBy) {
    eligibleGymnasts.push(activatedStandBy);
  }

  return eligibleGymnasts;
};

export const getTeamApparatusResult = (
  team: Team,
  apparatus: ApparatusKey,
  scores: ScoreMap,
  dns: DnsMap,
  qualificationStandByUsage: QualificationStandByUsage = {},
): TeamApparatusComputationResult => {
  const eligibleGymnasts = getEligibleTeamGymnasts(team, apparatus, qualificationStandByUsage, dns);
  if (eligibleGymnasts.length === 0) {
    return { countedScores: [], resultState: "EMPTY", score: null };
  }

  const entries = eligibleGymnasts.map((gymnast) => {
    const dnsActive = isDnsActive(dns, gymnast.id, getDnsEntryKeyForApp(gymnast, apparatus));
    const score = getEffectiveScore(gymnast, apparatus, scores, dns);
    return { dnsActive, score };
  });

  if (entries.every((entry) => entry.dnsActive)) {
    return { countedScores: [], resultState: "DNF", score: null };
  }

  const countedScores = entries
    .map((entry) => entry.score)
    .filter((score) => score > 0)
    .sort((a, b) => b - a)
    .slice(0, 3);

  if (countedScores.length === 0) {
    return { countedScores: [], resultState: "EMPTY", score: null };
  }

  return {
    countedScores,
    resultState: "OK",
    score: Number(countedScores.reduce((sum, value) => sum + value, 0).toFixed(3)),
  };
};

export const getTeamApparatusTotal = (
  team: Team,
  apparatus: ApparatusKey,
  scores: ScoreMap,
  dns: DnsMap,
  qualificationStandByUsage: QualificationStandByUsage = {},
): number | null =>
  getTeamApparatusResult(team, apparatus, scores, dns, qualificationStandByUsage).score;

export interface TeamTotalComputationResult {
  apparatus: Record<ApparatusKey, TeamApparatusComputationResult>;
  resultState: Exclude<RankingResultState, "DNS">;
  total: number | null;
}

export const getTeamTotalResult = (
  team: Team,
  scores: ScoreMap,
  dns: DnsMap,
  discipline: Discipline,
  qualificationStandByUsage: QualificationStandByUsage = {},
): TeamTotalComputationResult => {
  const activeApparatus = getApparatusForDiscipline(discipline);
  const apparatus = createApparatusMap<TeamApparatusComputationResult>((apparatusKey) =>
    activeApparatus.includes(apparatusKey)
      ? getTeamApparatusResult(team, apparatusKey, scores, dns, qualificationStandByUsage)
      : { countedScores: [], resultState: "EMPTY", score: null },
  );

  if (activeApparatus.some((key) => apparatus[key].resultState === "DNF")) {
    return { apparatus, resultState: "DNF", total: null };
  }

  const scoredApparatus = activeApparatus.filter((key) => apparatus[key].score !== null);
  if (scoredApparatus.length === 0) {
    return { apparatus, resultState: "EMPTY", total: null };
  }

  const total = Number(
    activeApparatus.reduce((sum, key) => sum + (apparatus[key].score || 0), 0).toFixed(3),
  );

  return { apparatus, resultState: "OK", total };
};

export const getTeamTotal = (
  team: Team,
  scores: ScoreMap,
  dns: DnsMap,
  discipline: Discipline,
  qualificationStandByUsage: QualificationStandByUsage = {},
): number | null => getTeamTotalResult(team, scores, dns, discipline, qualificationStandByUsage).total;

export interface ScoreComponents {
  d: number;
  e: number;
  penalty: number;
}

export const getApparatusComponents = (
  gymnast: Gymnast,
  apparatus: ApparatusKey,
  scores: ScoreMap,
  dns: DnsMap,
  vaultFinalMode = false,
): ScoreComponents => {
  const gScores = scores[gymnast.id];
  if (!gScores) return { d: 0, e: 0, penalty: 0 };

  if (apparatus === "VT") {
    if (vaultFinalMode && usesDoubleVaultMode(gymnast)) {
      if (isDnsActive(dns, gymnast.id, "VT1") || isDnsActive(dns, gymnast.id, "VT2")) {
        return { d: 0, e: 0, penalty: 0 };
      }

      const arr = gScores["VT*"] as [Score, Score] | undefined;
      const v1 = arr?.[0] ?? { d: 0, e: 0, penalty: 0 };
      const v2 = arr?.[1] ?? { d: 0, e: 0, penalty: 0 };
      return {
        d: Number(((v1.d + v2.d) / 2).toFixed(3)),
        e: Number(((v1.e + v2.e) / 2).toFixed(3)),
        penalty: Number(((v1.penalty + v2.penalty) / 2).toFixed(3)),
      };
    }

    if (isDnsActive(dns, gymnast.id, getDnsEntryKeyForApp(gymnast, "VT"))) {
      return { d: 0, e: 0, penalty: 0 };
    }

    const score = getStoredScore(gymnast, "VT", scores);
    return score ? { d: score.d, e: score.e, penalty: score.penalty } : { d: 0, e: 0, penalty: 0 };
  }

  if (isDnsActive(dns, gymnast.id, apparatus)) {
    return { d: 0, e: 0, penalty: 0 };
  }

  const score = gScores[apparatus] as Score | undefined;
  return score ? { d: score.d, e: score.e, penalty: score.penalty } : { d: 0, e: 0, penalty: 0 };
};

export interface AAComponents {
  eSum: number;
  dSum: number;
  penaltySum: number;
}

export const getAAComponents = (
  gymnast: Gymnast,
  scores: ScoreMap,
  dns: DnsMap,
  discipline: Discipline,
): AAComponents => {
  let eSum = 0;
  let dSum = 0;
  let penaltySum = 0;

  for (const apparatus of getApparatusForDiscipline(discipline)) {
    const { d, e, penalty } = getApparatusComponents(
      gymnast,
      apparatus,
      scores,
      dns,
      false,
    );
    eSum += e;
    dSum += d;
    penaltySum += penalty;
  }

  return {
    eSum: Number(eSum.toFixed(3)),
    dSum: Number(dSum.toFixed(3)),
    penaltySum: Number(penaltySum.toFixed(3)),
  };
};
