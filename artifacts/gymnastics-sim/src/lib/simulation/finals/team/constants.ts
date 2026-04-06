import { ApparatusKey } from "@/lib/types";

export const TEAM_FINAL_APPARATUS: ApparatusKey[] = ["VT", "UB", "BB", "FX"];

export const TEAM_FINAL_ROTATIONS: Record<number, Record<ApparatusKey, [number, number]>> = {
  1: {
    VT: [1, 2],
    UB: [3, 4],
    BB: [5, 6],
    FX: [7, 8],
  },
  2: {
    VT: [8, 7],
    UB: [2, 1],
    BB: [4, 3],
    FX: [6, 5],
  },
  3: {
    VT: [5, 6],
    UB: [7, 8],
    BB: [1, 2],
    FX: [3, 4],
  },
  4: {
    VT: [4, 3],
    UB: [6, 5],
    BB: [8, 7],
    FX: [2, 1],
  },
};
