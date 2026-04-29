export type Discipline = "WAG" | "MAG";
export type ApparatusKey = "FX" | "PH" | "SR" | "VT" | "PB" | "HB" | "UB" | "BB";
export type Apparatus = ApparatusKey | "VT*";
export type DnsEntryKey = ApparatusKey | "VT1" | "VT2";
export type RankingResultState = 'OK' | 'DNS' | 'DNF' | 'EMPTY';
export type TeamAssignmentStatus = "inactive" | "titular" | "standby";
export type TeamAssignmentMap = Partial<Record<ApparatusKey, TeamAssignmentStatus>>;

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
  teamAssignments?: TeamAssignmentMap;
  isMixedGroup?: boolean;
  mixedGroupId?: string;
}

export interface Team {
  countryId: string;
  gymnasts: Gymnast[];
  rosterFormat?: 3 | 5;
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

export interface TeamFinalSlot {
  seedRank: number;
  qualifiedTeamId: string;
  activeTeamId: string;
  reserveSource?: 'R1' | 'R2';
}

export interface AllAroundFinalSlot {
  slotNumber: number;
  qualificationRank: number | null;
  qualifiedGymnastId: string;
  activeGymnastId: string;
  reserveSource?: 'R1' | 'R2' | 'R3' | 'R4';
}

export interface ApparatusFinalSlot {
  competitionOrder: number;
  qualificationRank: number | null;
  qualifiedGymnastId: string;
  activeGymnastId: string;
  reserveSource?: 'R1' | 'R2' | 'R3';
}

export type TeamFinalLineups = Record<string, Partial<Record<ApparatusKey, string[]>>>;

export interface TeamFinalState {
  slots: TeamFinalSlot[];
  lineups: TeamFinalLineups;
  scores: ScoreMap;
  dns: DnsMap;
}

export interface AllAroundFinalState {
  slots: AllAroundFinalSlot[];
  scores: ScoreMap;
  dns: DnsMap;
}

export interface ApparatusFinalState {
  slots: ApparatusFinalSlot[];
  scores: ScoreMap;
  dns: DnsMap;
}

export type ApparatusFinalsState = Record<ApparatusKey, ApparatusFinalState>;

export interface FinalsState {
  teamFinal: TeamFinalState;
  allAroundFinal: AllAroundFinalState;
  apparatusFinals: ApparatusFinalsState;
}

// VT* representa o caso especial de salto com duas execucoes registradas separadamente.
export type GymnastScores = {
  [K in Apparatus]?: K extends 'VT*' ? [Score, Score] : Score;
};

export type ScoreMap = Record<string, GymnastScores>;
export type DnsMap = Record<string, Partial<Record<DnsEntryKey, boolean>>>;
export type QualificationStandByUsage = Record<
  string,
  Partial<Record<ApparatusKey, { standbyGymnastId: string; activated: boolean }>>
>;

export interface SimulationState {
  discipline: Discipline;
  phase: number;
  selectedCountries: string[];
  teams: Record<string, Team>;
  mixedGroups: Record<string, MixedGroup>;
  // Cada subdivisao mapeia equipe/grupo misto para o aparelho em que a rotacao comeca.
  subdivisions: Record<number, Record<string, ApparatusKey | 'BYE'>>;
  scores: ScoreMap;
  dns: DnsMap;
  qualificationStandByUsage: QualificationStandByUsage;
  // entityId (teamId or mgId) -> apparatus -> ordered gymnast IDs for that apparatus
  apparatusOrder: Record<string, Partial<Record<ApparatusKey, string[]>>>;
  finals: FinalsState;
}

export type SimulationHydrationPayload = Pick<
  SimulationState,
  | 'discipline'
  | 'phase'
  | 'selectedCountries'
  | 'teams'
  | 'mixedGroups'
  | 'subdivisions'
  | 'scores'
  | 'dns'
  | 'qualificationStandByUsage'
  | 'apparatusOrder'
  | 'finals'
>;
