import { MAG_APPARATUS, WAG_APPARATUS } from "@/lib/competition";
import { ApparatusKey, Discipline } from "@/lib/types";

const WAG_TEAM_FINAL_ROTATIONS: Record<number, Partial<Record<ApparatusKey, [number, number]>>> = {
  1: { VT: [1, 2], UB: [3, 4], BB: [5, 6], FX: [7, 8] },
  2: { VT: [8, 7], UB: [2, 1], BB: [4, 3], FX: [6, 5] },
  3: { VT: [5, 6], UB: [7, 8], BB: [1, 2], FX: [3, 4] },
  4: { VT: [4, 3], UB: [6, 5], BB: [8, 7], FX: [2, 1] },
};

const MAG_TEAM_FINAL_ROTATIONS: Record<number, Partial<Record<ApparatusKey, [number, number]>>> = {
  1: { FX: [1, 2], PH: [3, 4], SR: [5, 6], VT: [7, 8] },
  2: { PH: [1, 2], SR: [3, 4], VT: [5, 6], PB: [7, 8] },
  3: { SR: [1, 2], VT: [3, 4], PB: [5, 6], HB: [7, 8] },
  4: { VT: [1, 2], PB: [3, 4], HB: [5, 6], FX: [7, 8] },
  5: { PB: [1, 2], HB: [3, 4], FX: [5, 6], PH: [7, 8] },
  6: { HB: [1, 2], FX: [3, 4], PH: [5, 6], SR: [7, 8] },
};

export const getTeamFinalApparatus = (discipline: Discipline): readonly ApparatusKey[] =>
  discipline === "MAG" ? MAG_APPARATUS : WAG_APPARATUS;

export const getTeamFinalRotations = (
  discipline: Discipline,
): Record<number, Partial<Record<ApparatusKey, [number, number]>>> =>
  discipline === "MAG" ? MAG_TEAM_FINAL_ROTATIONS : WAG_TEAM_FINAL_ROTATIONS;
