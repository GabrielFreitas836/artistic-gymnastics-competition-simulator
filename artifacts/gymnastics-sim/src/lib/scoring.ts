import { Gymnast, ScoreMap, Apparatus, Team, Score } from "./types";

export const calculateScore = (d: number, e: number, pen: number): number => {
  // A nota final nunca fica negativa e sempre e normalizada para 3 casas.
  const total = Number(d) + Number(e) - Number(pen);
  return Math.max(0, Number(total.toFixed(3)));
};

// Para equipe e AA, VT* conta como o primeiro salto; a media dos dois fica restrita a final de VT.
export const getEffectiveScore = (gymnastId: string, app: 'VT' | 'UB' | 'BB' | 'FX', scores: ScoreMap): number => {
  const gScores = scores[gymnastId];
  if (!gScores) return 0;

  if (app === 'VT') {
    if (gScores['VT']) return (gScores['VT'] as Score).total || 0;
    if (gScores['VT*'] && Array.isArray(gScores['VT*'])) return gScores['VT*'][0]?.total || 0;
    return 0;
  }

  const score = gScores[app] as Score | undefined;
  return score?.total || 0;
};

// A final de VT usa a media truncada dos dois saltos, sem arredondar para cima.
export const getVaultFinalScore = (gymnastId: string, scores: ScoreMap): number | null => {
  const gScores = scores[gymnastId];
  if (!gScores || !gScores['VT*'] || !Array.isArray(gScores['VT*'])) return null;

  const v1 = gScores['VT*'][0]?.total || 0;
  const v2 = gScores['VT*'][1]?.total || 0;
  if (v1 === 0 || v2 === 0) return null;

  // Trunca para 3 casas decimais (floor), nunca arredonda para cima
  return Math.floor(((v1 + v2) / 2) * 1000) / 1000;
};

export const getTeamApparatusTotal = (team: Team, app: 'VT' | 'UB' | 'BB' | 'FX', scores: ScoreMap): number => {
  // Na qualificacao por equipes, cada aparelho soma apenas as tres maiores notas validas.
  const appScores = team.gymnasts.map(g => getEffectiveScore(g.id, app, scores)).filter(s => s > 0);
  appScores.sort((a, b) => b - a);
  const top3 = appScores.slice(0, 3);
  return Number(top3.reduce((sum, val) => sum + val, 0).toFixed(3));
};

export const getTeamTotal = (team: Team, scores: ScoreMap): number => {
  // O total de equipe e a soma dos quatro aparelhos.
  const vt = getTeamApparatusTotal(team, 'VT', scores);
  const ub = getTeamApparatusTotal(team, 'UB', scores);
  const bb = getTeamApparatusTotal(team, 'BB', scores);
  const fx = getTeamApparatusTotal(team, 'FX', scores);
  return Number((vt + ub + bb + fx).toFixed(3));
};

export const getAllAroundTotal = (gymnastId: string, scores: ScoreMap): number | null => {
  // Para aparecer no AA a ginasta precisa ter nota valida em todos os quatro aparelhos.
  const vt = getEffectiveScore(gymnastId, 'VT', scores);
  const ub = getEffectiveScore(gymnastId, 'UB', scores);
  const bb = getEffectiveScore(gymnastId, 'BB', scores);
  const fx = getEffectiveScore(gymnastId, 'FX', scores);

  if (vt === 0 || ub === 0 || bb === 0 || fx === 0) return null;
  return Number((vt + ub + bb + fx).toFixed(3));
};

export interface ScoreComponents {
  d: number;
  e: number;
  penalty: number;
}

/**
 * Recupera os componentes que alimentam os desempates.
 * Em VT, o modo decide se usamos a media dos dois saltos (final) ou apenas o salto efetivo (equipe/AA).
 */
export const getApparatusComponents = (
  gId: string,
  app: 'VT' | 'UB' | 'BB' | 'FX',
  scores: ScoreMap,
  vaultFinalMode = false
): ScoreComponents => {
  const gScores = scores[gId];
  if (!gScores) return { d: 0, e: 0, penalty: 0 };

  if (app === 'VT') {
    if (vaultFinalMode) {
      const arr = gScores['VT*'] as [Score, Score] | undefined;
      const v1 = arr?.[0] ?? { d: 0, e: 0, penalty: 0 };
      const v2 = arr?.[1] ?? { d: 0, e: 0, penalty: 0 };
      // A final de VT tambem desempata pela media dos componentes.
      return {
        d: Number(((v1.d + v2.d) / 2).toFixed(3)),
        e: Number(((v1.e + v2.e) / 2).toFixed(3)),
        penalty: Number(((v1.penalty + v2.penalty) / 2).toFixed(3)),
      };
    }
    // Contexto Team/AA: preferir um salto, olhar para primeiro salto de VT*
    const vtScore = gScores['VT'] as Score | undefined;
    if (vtScore) return { d: vtScore.d, e: vtScore.e, penalty: vtScore.penalty };
    const arr = gScores['VT*'] as [Score, Score] | undefined;
    const v1 = arr?.[0] ?? { d: 0, e: 0, penalty: 0 };
    return { d: v1.d, e: v1.e, penalty: v1.penalty };
  }

  const score = gScores[app] as Score | undefined;
  return score ? { d: score.d, e: score.e, penalty: score.penalty } : { d: 0, e: 0, penalty: 0 };
};

export interface AAComponents {
  eSum: number;
  dSum: number;
  penaltySum: number;
}

// Soma os componentes dos quatro aparelhos para o desempate do individual geral.
/**
 * Sums D, E, and penalty across all 4 apparatus for a gymnast — used in AA tiebreak logic.
 */
export const getAAComponents = (gId: string, scores: ScoreMap): AAComponents => {
  let eSum = 0, dSum = 0, penaltySum = 0;
  for (const app of ['VT', 'UB', 'BB', 'FX'] as const) {
    const { d, e, penalty } = getApparatusComponents(gId, app, scores, false);
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
