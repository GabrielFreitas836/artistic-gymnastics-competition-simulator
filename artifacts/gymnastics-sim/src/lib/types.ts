export type Apparatus = 'VT' | 'VT*' | 'UB' | 'BB' | 'FX';
export type ApparatusKey = 'VT' | 'UB' | 'BB' | 'FX';

// O continente entra tanto na selecao de paises quanto no filtro de mixed groups.
export type Continent =
  | 'South America'
  | 'Central America'
  | 'North America'
  | 'Europe'
  | 'Asia'
  | 'Oceania'
  | 'Africa';

export interface Country {
  id: string;
  name: string;
  flag: string;
  continent: Continent;
}

export interface Gymnast {
  id: string;
  name: string;
  countryId: string;
  apparatus: Apparatus[];
  isMixedGroup?: boolean;
  mixedGroupId?: string;
}

export interface Team {
  countryId: string;
  gymnasts: Gymnast[];
}

export interface MixedGroup {
  id: string;
  name: string;
  gymnasts: Gymnast[];
}

export interface Score {
  d: number;
  e: number;
  penalty: number;
  total: number;
}

// VT* representa o caso especial de salto com duas execucoes registradas separadamente.
export type GymnastScores = {
  [K in Apparatus]?: K extends 'VT*' ? [Score, Score] : Score;
};

export type ScoreMap = Record<string, GymnastScores>;

export interface SimulationState {
  phase: number;
  selectedCountries: string[];
  teams: Record<string, Team>;
  mixedGroups: Record<string, MixedGroup>;
  // Cada subdivisao mapeia equipe/grupo misto para o aparelho em que a rotacao comeca.
  subdivisions: Record<number, Record<string, ApparatusKey | 'BYE'>>;
  scores: ScoreMap;
  // entityId (teamId or mgId) → apparatus → ordered gymnast IDs for that apparatus
  apparatusOrder: Record<string, Partial<Record<ApparatusKey, string[]>>>;
}
