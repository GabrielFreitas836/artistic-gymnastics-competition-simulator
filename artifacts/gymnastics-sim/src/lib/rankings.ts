import { Gymnast, ScoreMap, Team } from "./types";
import {
  getTeamTotal,
  getAllAroundTotal,
  getEffectiveScore,
  getVaultFinalScore,
  getApparatusComponents,
  getAAComponents,
} from "./scoring";

// ─── Team Rankings ─────────────────────────────────────────────────────────────

export interface RankedTeam {
  team: Team;
  total: number;
  rank: number;
  status: 'Q' | 'R1' | 'R2' | '';
}

export const getTeamRankings = (teams: Record<string, Team>, scores: ScoreMap): RankedTeam[] => {
  const ranked = Object.values(teams).map(team => ({
    team,
    total: getTeamTotal(team, scores),
    rank: 0,
    status: '' as any,
  })).sort((a, b) => b.total - a.total);

  ranked.forEach((r, i) => {
    r.rank = i + 1;
    if (i < 8) r.status = 'Q';
    else if (i === 8) r.status = 'R1';
    else if (i === 9) r.status = 'R2';
  });

  return ranked;
};

// ─── Shared types ──────────────────────────────────────────────────────────────

export interface RankedGymnast {
  gymnast: Gymnast;
  total: number;
  rank: number;
  status: 'Q' | 'R1' | 'R2' | 'R3' | 'R4' | '-';
  /** E-score used in tiebreak (per-apparatus for EF, sum for AA) */
  tbE: number;
  /** D-score used in tiebreak (per-apparatus for EF, sum for AA) */
  tbD: number;
  /** Penalty sum used in tiebreak (AA only; 0 for EF) */
  tbPenalty: number;
  /** True when this gymnast is in a tied group that could not be split by any tiebreaker */
  tied: boolean;
}

// ─── Tiny rounding helper ──────────────────────────────────────────────────────

const r3 = (n: number) => Math.round(n * 1000) / 1000;

// ─── 2-per-country filter ──────────────────────────────────────────────────────

/**
 * Walks the sorted list and marks each gymnast Q / Rn / -  
 * respecting the 2-per-country cap (applies to both Q spots and reserve spots).
 *
 * @param limit   number of main-final spots (may have been expanded for EF ties)
 * @param reserves number of reserve spots
 */
const apply2PerCountryRule = (
  list: RankedGymnast[],
  limit: number,
  reserves: number,
): RankedGymnast[] => {
  const countryCounts: Record<string, number> = {};
  let qCount = 0;
  let rCount = 0;

  list.forEach(item => {
    const cid = item.gymnast.countryId;
    if (!countryCounts[cid]) countryCounts[cid] = 0;

    if (qCount < limit) {
      if (countryCounts[cid] < 2) {
        item.status = 'Q';
        countryCounts[cid]++;
        qCount++;
      } else {
        item.status = '-';
      }
    } else if (rCount < reserves) {
      if (countryCounts[cid] < 2) {
        item.status = `R${rCount + 1}` as any;
        countryCounts[cid]++;
        rCount++;
      } else {
        item.status = '-';
      }
    } else {
      item.status = '-';
    }
  });

  return list;
};

// ─── All-Around Rankings ───────────────────────────────────────────────────────

export const getAllAroundRankings = (allGymnasts: Gymnast[], scores: ScoreMap): RankedGymnast[] => {
  // Build list with tiebreak components pre-computed
  const list: (RankedGymnast & { _total: number; _eSum: number; _penSum: number; _dSum: number })[] = [];

  allGymnasts.forEach(g => {
    const total = getAllAroundTotal(g.id, scores);
    if (total === null) return;

    const { eSum, dSum, penaltySum } = getAAComponents(g.id, scores);
    list.push({
      gymnast: g,
      total,
      rank: 0,
      status: '-',
      tbE: eSum,
      tbD: dSum,
      tbPenalty: penaltySum,
      tied: false,
      _total: total,
      _eSum: eSum,
      _penSum: penaltySum,
      _dSum: dSum,
    });
  });

  // Sort: total↓ → eSum↓ → penaltySum↑ → dSum↓ → name↑
  list.sort((a, b) => {
    if (r3(b._total) !== r3(a._total)) return b._total - a._total;
    if (r3(b._eSum) !== r3(a._eSum)) return b._eSum - a._eSum;
    if (r3(a._penSum) !== r3(b._penSum)) return a._penSum - b._penSum; // lower penalty is better
    if (r3(b._dSum) !== r3(a._dSum)) return b._dSum - a._dSum;
    return a.gymnast.name.localeCompare(b.gymnast.name); // visual order only within full tie
  });

  // Assign ranks — gymnasts are "truly tied" when ALL four discriminators match
  const isTrulyTiedAA = (
    a: typeof list[0],
    b: typeof list[0],
  ) =>
    r3(a._total) === r3(b._total) &&
    r3(a._eSum) === r3(b._eSum) &&
    r3(a._penSum) === r3(b._penSum) &&
    r3(a._dSum) === r3(b._dSum);

  list.forEach((item, i) => {
    if (i === 0) {
      item.rank = 1;
    } else {
      const prev = list[i - 1];
      if (isTrulyTiedAA(prev, item)) {
        item.rank = prev.rank;
        item.tied = true;
        prev.tied = true;
      } else {
        item.rank = i + 1; // standard competition ranking — skips after tie groups
      }
    }
  });

  return apply2PerCountryRule(list as RankedGymnast[], 24, 4);
};

// ─── Event-Final Rankings ──────────────────────────────────────────────────────

export const getEventFinalRankings = (
  allGymnasts: Gymnast[],
  app: 'VT' | 'UB' | 'BB' | 'FX',
  scores: ScoreMap,
): RankedGymnast[] => {
  const vaultFinal = app === 'VT';

  // Build list with tiebreak components
  const list: (RankedGymnast & { _total: number; _e: number; _d: number })[] = [];

  allGymnasts.forEach(g => {
    let total = 0;
    let eligible = false;

    if (app === 'VT') {
      if (g.apparatus.includes('VT*')) {
        const avg = getVaultFinalScore(g.id, scores);
        if (avg !== null) { total = avg; eligible = true; }
      }
    } else {
      if (g.apparatus.includes(app)) {
        total = getEffectiveScore(g.id, app, scores);
        if (total > 0) eligible = true;
      }
    }

    if (!eligible) return;

    const { d, e } = getApparatusComponents(g.id, app, scores, vaultFinal);
    list.push({
      gymnast: g,
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

  // Sort: total↓ → E↓ → D↓ → name↑
  list.sort((a, b) => {
    if (r3(b._total) !== r3(a._total)) return b._total - a._total;
    if (r3(b._e) !== r3(a._e)) return b._e - a._e;
    if (r3(b._d) !== r3(a._d)) return b._d - a._d;
    return a.gymnast.name.localeCompare(b.gymnast.name); // visual order only within full tie
  });

  // Assign ranks — gymnasts are "truly tied" when total + E + D all match
  const isTrulyTiedEF = (
    a: typeof list[0],
    b: typeof list[0],
  ) =>
    r3(a._total) === r3(b._total) &&
    r3(a._e) === r3(b._e) &&
    r3(a._d) === r3(b._d);

  list.forEach((item, i) => {
    if (i === 0) {
      item.rank = 1;
    } else {
      const prev = list[i - 1];
      if (isTrulyTiedEF(prev, item)) {
        item.rank = prev.rank;
        item.tied = true;
        prev.tied = true;
      } else {
        item.rank = i + 1;
      }
    }
  });

  // ── Expansion rule ────────────────────────────────────────────────────────
  // If gymnasts at the 8/9 boundary share the same rank (full tie on total+E+D),
  // expand the qualification limit to include ALL gymnasts at that rank.
  const BASE_LIMIT = 8;
  let effectiveLimit = BASE_LIMIT;

  if (list.length >= BASE_LIMIT) {
    const rankAt8 = list[BASE_LIMIT - 1].rank;
    // Count every gymnast whose rank is ≤ rankAt8 (includes the tied group)
    effectiveLimit = list.filter(item => item.rank <= rankAt8).length;
  }

  return apply2PerCountryRule(list as RankedGymnast[], effectiveLimit, 3);
};
