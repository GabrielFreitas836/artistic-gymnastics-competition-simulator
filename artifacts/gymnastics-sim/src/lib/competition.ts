import { ApparatusKey, Discipline } from "@/lib/types";

export const WAG_APPARATUS = ["VT", "UB", "BB", "FX"] as const satisfies readonly ApparatusKey[];
export const MAG_APPARATUS = ["FX", "PH", "SR", "VT", "PB", "HB"] as const satisfies readonly ApparatusKey[];
export const ALL_APPARATUS_KEYS = [
  "FX",
  "PH",
  "SR",
  "VT",
  "PB",
  "HB",
  "UB",
  "BB",
] as const satisfies readonly ApparatusKey[];

export const APPARATUS_LABEL: Record<ApparatusKey, string> = {
  FX: "Floor Exercise",
  PH: "Pommel Horse",
  SR: "Rings",
  VT: "Vault",
  PB: "Parallel Bars",
  HB: "Horizontal Bar",
  UB: "Uneven Bars",
  BB: "Balance Beam",
};

export const APPARATUS_SHORT_LABEL: Record<ApparatusKey, string> = {
  FX: "Floor",
  PH: "Pommel Horse",
  SR: "Rings",
  VT: "Vault",
  PB: "Parallel Bars",
  HB: "Horizontal Bar",
  UB: "Uneven Bars",
  BB: "Balance Beam",
};

export const APPARATUS_FINAL_ROUTE: Record<ApparatusKey, string> = {
  FX: "/finals/apparatus/floor",
  PH: "/finals/apparatus/pommel-horse",
  SR: "/finals/apparatus/rings",
  VT: "/finals/apparatus/vault",
  PB: "/finals/apparatus/parallel-bars",
  HB: "/finals/apparatus/horizontal-bar",
  UB: "/finals/apparatus/uneven-bars",
  BB: "/finals/apparatus/balance-beam",
};

export interface DisciplineConfig {
  discipline: Discipline;
  apparatus: readonly ApparatusKey[];
  mixedGroupCount: number;
  mixedGymnastTotal: number;
  subdivisionCount: number;
  entitiesPerSubdivision: number;
  qualificationRotationCount: number;
  totalFinals: number;
  apparatusFinalCode: Record<ApparatusKey, string>;
}

export const DISCIPLINE_CONFIG: Record<Discipline, DisciplineConfig> = {
  WAG: {
    discipline: "WAG",
    apparatus: WAG_APPARATUS,
    mixedGroupCount: 8,
    mixedGymnastTotal: 36,
    subdivisionCount: 5,
    entitiesPerSubdivision: 4,
    qualificationRotationCount: 4,
    totalFinals: 6,
    apparatusFinalCode: {
      FX: "7.3.4",
      PH: "",
      SR: "",
      VT: "7.3.1",
      PB: "",
      HB: "",
      UB: "7.3.2",
      BB: "7.3.3",
    },
  },
  MAG: {
    discipline: "MAG",
    apparatus: MAG_APPARATUS,
    mixedGroupCount: 6,
    mixedGymnastTotal: 36,
    subdivisionCount: 3,
    entitiesPerSubdivision: 6,
    qualificationRotationCount: 6,
    totalFinals: 8,
    apparatusFinalCode: {
      FX: "7.3.1",
      PH: "7.3.2",
      SR: "7.3.3",
      VT: "7.3.4",
      PB: "7.3.5",
      HB: "7.3.6",
      UB: "",
      BB: "",
    },
  },
};

export const getDisciplineConfig = (discipline: Discipline): DisciplineConfig =>
  DISCIPLINE_CONFIG[discipline];

export const getApparatusForDiscipline = (discipline: Discipline): readonly ApparatusKey[] =>
  DISCIPLINE_CONFIG[discipline].apparatus;

export const isApparatusInDiscipline = (
  discipline: Discipline,
  apparatus: ApparatusKey,
): boolean => getApparatusForDiscipline(discipline).includes(apparatus);

export const createSubdivisionsSkeleton = (
  discipline: Discipline,
): Record<number, Record<string, ApparatusKey | "BYE">> =>
  Array.from({ length: getDisciplineConfig(discipline).subdivisionCount }, (_, index) => index + 1).reduce<
    Record<number, Record<string, ApparatusKey | "BYE">>
  >((accumulator, subdivision) => {
    accumulator[subdivision] = {};
    return accumulator;
  }, {});

export const createApparatusMap = <T,>(
  factory: (apparatus: ApparatusKey) => T,
): Record<ApparatusKey, T> =>
  ALL_APPARATUS_KEYS.reduce<Record<ApparatusKey, T>>((accumulator, apparatus) => {
    accumulator[apparatus] = factory(apparatus);
    return accumulator;
  }, {} as Record<ApparatusKey, T>);
