import {
  APPARATUS_FINAL_ROUTE,
  APPARATUS_LABEL,
  getApparatusForDiscipline,
  getDisciplineConfig,
} from "@/lib/competition";
import { ApparatusKey, Discipline } from "@/lib/types";

export const getApparatusFinals = (discipline: Discipline): readonly ApparatusKey[] =>
  getApparatusForDiscipline(discipline);

export const getApparatusFinalCode = (
  discipline: Discipline,
): Record<ApparatusKey, string> => getDisciplineConfig(discipline).apparatusFinalCode;

export const APPARATUS_FINAL_LABEL: Record<ApparatusKey, string> = APPARATUS_LABEL;
export { APPARATUS_FINAL_ROUTE };
