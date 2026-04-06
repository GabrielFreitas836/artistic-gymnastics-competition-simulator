import { ApparatusKey } from "@/lib/types";

export const ALL_AROUND_FINAL_APPARATUS: ApparatusKey[] = ["VT", "UB", "BB", "FX"];

export const ALL_AROUND_FINAL_ROTATIONS: Record<number, Record<ApparatusKey, number[]>> = {
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
