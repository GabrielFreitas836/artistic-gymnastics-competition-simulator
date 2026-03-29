import { ApparatusKey, Gymnast, ScoreMap, Team } from "./types";
import {
  getAAComponents,
  getAllAroundTotal,
  getApparatusComponents,
  getEffectiveScore,
  getTeamApparatusTotal,
  getTeamTotal,
  getVaultFinalScore,
} from "./scoring";

export interface RankedTeam {
  team: Team;
  total: number;
  rank: number;
  status: 'Q' | 'R1' | 'R2' | '';
}

export type TeamApparatusKey = ApparatusKey;

export interface TeamApparatusEntry {
  apparatus: TeamApparatusKey;
  score: number | null;
  rank: number | null;
  countedScores: number[];
  standardDeviation: number | null;
}

export interface TeamApparatusRankingRow {
  team: Team;
  apparatus: Record<TeamApparatusKey, TeamApparatusEntry>;
}

// Os rankings de equipe usam apenas os quatro aparelhos oficiais da WAG.
const TEAM_APPARATUS: TeamApparatusKey[] = ['VT', 'UB', 'BB', 'FX'];

export const getTeamRankings = (
  teams: Record<string, Team>,
  scores: ScoreMap,
): RankedTeam[] => {
  // Primeiro soma a classificacao de cada equipe; o rank e o status sao definidos depois da ordenacao.
  const ranked = Object.values(teams)
    .map((team) => ({
      team,
      total: getTeamTotal(team, scores),
      rank: 0,
      status: '' as RankedTeam['status'],
    }))
    .sort((a, b) => b.total - a.total);

  ranked.forEach((row, index) => {
    // Top 8 vai para a final; 9o e 10o ficam como reservas.
    row.rank = index + 1;
    if (index < 8) row.status = 'Q';
    else if (index === 8) row.status = 'R1';
    else if (index === 9) row.status = 'R2';
  });

  return ranked;
};

export interface RankedGymnast {
  gymnast: Gymnast;
  total: number;
  rank: number;
  status: 'Q' | 'R1' | 'R2' | 'R3' | 'R4' | '-';
  tbE: number;
  tbD: number;
  tbPenalty: number;
  tied: boolean;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

const getTopTeamApparatusScores = (
  team: Team,
  apparatus: TeamApparatusKey,
  scores: ScoreMap,
): number[] =>
  // Na classificacao por aparelho de equipe contam apenas as 3 maiores notas validas.
  team.gymnasts
    .map((gymnast) => getEffectiveScore(gymnast.id, apparatus, scores))
    .filter((score) => score > 0)
    .sort((a, b) => b - a)
    .slice(0, 3);

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
  standardDeviation: null,
});

export const getApparatusRanking = (
  teams: Record<string, Team>,
  scores: ScoreMap,
): TeamApparatusRankingRow[] => {
  // Cada linha nasce "vazia" para que a tabela consiga renderizar aparelhos sem nota.
  const rows = Object.values(teams).map((team) => ({
    team,
    apparatus: {
      VT: createEmptyTeamApparatusEntry('VT'),
      UB: createEmptyTeamApparatusEntry('UB'),
      BB: createEmptyTeamApparatusEntry('BB'),
      FX: createEmptyTeamApparatusEntry('FX'),
    },
  }));

  const rowsByTeamId = new Map(rows.map((row) => [row.team.countryId, row]));

  TEAM_APPARATUS.forEach((apparatus) => {
    const entries = rows.map((row) => {
      const countedScores = getTopTeamApparatusScores(row.team, apparatus, scores);

      if (countedScores.length < 3) {
        // Sem tres notas validas, a equipe nao entra no ranking daquele aparelho.
        return {
          teamId: row.team.countryId,
          entry: createEmptyTeamApparatusEntry(apparatus),
        };
      }

      const score = getTeamApparatusTotal(row.team, apparatus, scores);
      const standardDeviation = Number(
        getPopulationStandardDeviation(countedScores).toFixed(6),
      );

      return {
        teamId: row.team.countryId,
        entry: {
          apparatus,
          score,
          rank: null,
          countedScores,
          standardDeviation,
        } as TeamApparatusEntry,
      };
    });

    const rankedEntries = entries
      .filter((item) => item.entry.score !== null && item.entry.standardDeviation !== null)
      .sort((a, b) => {
        // Desempate: nota total, depois menor desvio-padrao entre as tres notas que contam.
        if (r3(b.entry.score as number) !== r3(a.entry.score as number)) {
          return (b.entry.score as number) - (a.entry.score as number);
        }
        if (
          r6(a.entry.standardDeviation as number) !==
          r6(b.entry.standardDeviation as number)
        ) {
          return (
            (a.entry.standardDeviation as number) -
            (b.entry.standardDeviation as number)
          );
        }
        return a.teamId.localeCompare(b.teamId, undefined, { sensitivity: 'base' });
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

    // Escreve o ranking calculado de volta na linha de cada equipe.
    entries.forEach(({ teamId, entry }) => {
      const row = rowsByTeamId.get(teamId);
      if (row) {
        row.apparatus[apparatus] = entry;
      }
    });
  });

  return rows;
};

const apply2PerCountryRule = (
  list: RankedGymnast[],
  limit: number,
  reserves: number,
): RankedGymnast[] => {
  // A regra "2 per country" vale tanto para classificadas quanto para reservas.
  const countryCounts: Record<string, number> = {};
  let qualifiedCount = 0;
  let reserveCount = 0;

  list.forEach((item) => {
    const countryId = item.gymnast.countryId;
    if (!countryCounts[countryId]) countryCounts[countryId] = 0;

    if (qualifiedCount < limit) {
      if (countryCounts[countryId] < 2) {
        item.status = 'Q';
        countryCounts[countryId]++;
        qualifiedCount++;
      } else {
        item.status = '-';
      }
      return;
    }

    if (reserveCount < reserves) {
      if (countryCounts[countryId] < 2) {
        item.status = `R${reserveCount + 1}` as RankedGymnast['status'];
        countryCounts[countryId]++;
        reserveCount++;
      } else {
        item.status = '-';
      }
      return;
    }

    item.status = '-';
  });

  return list;
};

export const getAllAroundRankings = (
  allGymnasts: Gymnast[],
  scores: ScoreMap,
): RankedGymnast[] => {
  // Campos internos guardam os criterios de desempate sem poluir a interface publica.
  const list: (RankedGymnast & {
    _total: number;
    _eSum: number;
    _penaltySum: number;
    _dSum: number;
  })[] = [];

  allGymnasts.forEach((gymnast) => {
    const total = getAllAroundTotal(gymnast.id, scores);
    if (total === null) return;

    const { eSum, dSum, penaltySum } = getAAComponents(gymnast.id, scores);
    list.push({
      gymnast,
      total,
      rank: 0,
      status: '-',
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
    // Ordem oficial do desempate: total, soma de E, menor penalidade, soma de D, nome.
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

  // AA classifica 24 ginastas e 4 reservas, sempre respeitando o limite por pais.
  return apply2PerCountryRule(list as RankedGymnast[], 24, 4);
};

export const getEventFinalRankings = (
  allGymnasts: Gymnast[],
  apparatus: 'VT' | 'UB' | 'BB' | 'FX',
  scores: ScoreMap,
): RankedGymnast[] => {
  const isVaultFinal = apparatus === 'VT';
  const list: (RankedGymnast & { _total: number; _e: number; _d: number })[] = [];

  allGymnasts.forEach((gymnast) => {
    let total = 0;
    let eligible = false;

    if (apparatus === 'VT') {
      // Em VT final, so entra quem declarou dois saltos e possui media valida.
      if (gymnast.apparatus.includes('VT*')) {
        const average = getVaultFinalScore(gymnast.id, scores);
        if (average !== null) {
          total = average;
          eligible = true;
        }
      }
    } else if (gymnast.apparatus.includes(apparatus)) {
      total = getEffectiveScore(gymnast.id, apparatus, scores);
      if (total > 0) eligible = true;
    }

    if (!eligible) return;

    const { d, e } = getApparatusComponents(
      gymnast.id,
      apparatus,
      scores,
      isVaultFinal,
    );

    list.push({
      gymnast,
      total,
      rank: 0,
      status: '-',
      tbE: e,
      tbD: d,
      tbPenalty: 0,
      tied: false,
      _total: total,
      _e: e,
      _d: d,
    });
  });

  list.sort((a, b) => {
    // Desempate em finais por aparelho: total, E, D e depois nome.
    if (r3(b._total) !== r3(a._total)) return b._total - a._total;
    if (r3(b._e) !== r3(a._e)) return b._e - a._e;
    if (r3(b._d) !== r3(a._d)) return b._d - a._d;
    return a.gymnast.name.localeCompare(b.gymnast.name);
  });

  const isTrulyTiedEF = (a: (typeof list)[number], b: (typeof list)[number]) =>
    r3(a._total) === r3(b._total) &&
    r3(a._e) === r3(b._e) &&
    r3(a._d) === r3(b._d);

  list.forEach((item, index) => {
    if (index === 0) {
      item.rank = 1;
      return;
    }

    const previous = list[index - 1];
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

  if (list.length >= baseLimit) {
    // Empates na ultima vaga expandem a final alem das 8 posicoes-base.
    const rankAtLimit = list[baseLimit - 1].rank;
    effectiveLimit = list.filter((item) => item.rank <= rankAtLimit).length;
  }

  return apply2PerCountryRule(list as RankedGymnast[], effectiveLimit, 3);
};
