import { MAG_APPARATUS, WAG_APPARATUS } from "@/lib/competition";
import { ApparatusKey, Discipline } from "@/lib/types";

const WAG_ALL_AROUND_FINAL_ROTATIONS: Record<number, Partial<Record<ApparatusKey, number[]>>> = {
  1: {
    VT: [3, 2, 1, 6, 5, 4],
    UB: [9, 8, 7, 12, 11, 10],
    BB: [15, 14, 13, 18, 17, 16],
    FX: [21, 20, 19, 24, 23, 22],
  },
  2: {
    VT: [20, 19, 24, 23, 22, 21],
    UB: [2, 1, 6, 5, 4, 3],
    BB: [8, 7, 12, 11, 10, 9],
    FX: [14, 13, 18, 17, 16, 15],
  },
  3: {
    VT: [13, 18, 17, 16, 15, 14],
    UB: [19, 24, 23, 22, 21, 20],
    BB: [1, 6, 5, 4, 3, 2],
    FX: [7, 12, 11, 10, 9, 8],
  },
  4: {
    VT: [12, 11, 10, 9, 8, 7],
    UB: [18, 17, 16, 15, 14, 13],
    BB: [24, 23, 22, 21, 20, 19],
    FX: [6, 5, 4, 3, 2, 1],
  },
};

const MAG_ALL_AROUND_FINAL_ROTATIONS: Record<number, Partial<Record<ApparatusKey, number[]>>> = {
  1: { FX: [5, 4, 3, 2, 1, 6], PH: [11, 10, 9, 8, 7, 12], SR: [17, 16, 15, 14, 13, 18], VT: [23, 22, 21, 20, 19, 24] },
  2: { PH: [4, 3, 2, 1, 6, 5], SR: [10, 9, 8, 7, 12, 11], VT: [16, 15, 14, 13, 18, 17], PB: [22, 21, 20, 19, 24, 23] },
  3: { SR: [3, 2, 1, 6, 5, 4], VT: [9, 8, 7, 12, 11, 10], PB: [15, 14, 13, 18, 17, 16], HB: [21, 20, 19, 24, 23, 22] },
  4: { VT: [2, 1, 6, 5, 4, 3], PB: [8, 7, 12, 11, 10, 9], HB: [14, 13, 18, 17, 16, 15], FX: [20, 19, 24, 23, 22, 21] },
  5: { PB: [1, 6, 5, 4, 3, 2], HB: [7, 12, 11, 10, 9, 8], FX: [13, 18, 17, 16, 15, 14], PH: [19, 24, 23, 22, 21, 20] },
  6: { HB: [6, 5, 4, 3, 2, 1], FX: [12, 11, 10, 9, 8, 7], PH: [18, 17, 16, 15, 14, 13], SR: [24, 23, 22, 21, 20, 19] },
};

export const getAllAroundFinalApparatus = (discipline: Discipline): readonly ApparatusKey[] =>
  discipline === "MAG" ? MAG_APPARATUS : WAG_APPARATUS;

export const getAllAroundFinalRotations = (
  discipline: Discipline,
): Record<number, Partial<Record<ApparatusKey, number[]>>> =>
  discipline === "MAG" ? MAG_ALL_AROUND_FINAL_ROTATIONS : WAG_ALL_AROUND_FINAL_ROTATIONS;
