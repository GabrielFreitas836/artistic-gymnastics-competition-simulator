export type Apparatus = 'VT' | 'VT*' | 'UB' | 'BB' | 'FX';
export type ApparatusKey = 'VT' | 'UB' | 'BB' | 'FX';

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

export type GymnastScores = {
  [K in Apparatus]?: K extends 'VT*' ? [Score, Score] : Score;
};

export type ScoreMap = Record<string, GymnastScores>;

export interface SimulationState {
  phase: number;
  selectedCountries: string[];
  teams: Record<string, Team>;
  mixedGroups: Record<string, MixedGroup>;
  subdivisions: Record<number, Record<string, ApparatusKey | 'BYE'>>;
  scores: ScoreMap;
  // entityId (teamId or mgId) → apparatus → ordered gymnast IDs for that apparatus
  apparatusOrder: Record<string, Partial<Record<ApparatusKey, string[]>>>;
}
