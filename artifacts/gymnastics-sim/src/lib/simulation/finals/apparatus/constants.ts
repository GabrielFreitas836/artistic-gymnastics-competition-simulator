import { ApparatusKey } from "@/lib/types";

export const APPARATUS_FINALS: ApparatusKey[] = ["VT", "UB", "BB", "FX"];

export const APPARATUS_FINAL_CODE: Record<ApparatusKey, string> = {
  VT: "7.3.1",
  UB: "7.3.2",
  BB: "7.3.3",
  FX: "7.3.4",
};

export const APPARATUS_FINAL_LABEL: Record<ApparatusKey, string> = {
  VT: "Vault",
  UB: "Uneven Bars",
  BB: "Balance Beam",
  FX: "Floor Exercise",
};

export const APPARATUS_FINAL_ROUTE: Record<ApparatusKey, string> = {
  VT: "/finals/apparatus/vault",
  UB: "/finals/apparatus/uneven-bars",
  BB: "/finals/apparatus/balance-beam",
  FX: "/finals/apparatus/floor",
};
