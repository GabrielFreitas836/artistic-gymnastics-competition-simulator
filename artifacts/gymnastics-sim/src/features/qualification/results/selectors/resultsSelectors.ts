import { APPARATUS_LABEL, APPARATUS_SHORT_LABEL, getApparatusForDiscipline } from "@/lib/competition";
import { RankedGymnast } from "@/lib/simulation/rankings";
import { ApparatusKey, Discipline } from "@/lib/types";
import { CompetitionConfig } from "@workspace/sim-core";

export type ResultsTab = "TEAM" | "TEAM_APP" | "AA" | ApparatusKey;

export const getResultsTabConfig = (
  discipline: Discipline,
  competitionConfig?: CompetitionConfig,
): Array<{ id: ResultsTab; label: string }> => [
  ...(competitionConfig?.uiCapabilities.supportsTeamResults === false ? [] : [{ id: "TEAM" as ResultsTab, label: "Team Qualification" }]),
  ...(competitionConfig?.uiCapabilities.supportsTeamApparatusResults === false
    ? []
    : [{ id: "TEAM_APP" as ResultsTab, label: "Team Apparatus" }]),
  ...(competitionConfig?.uiCapabilities.supportsAllAroundResults === false
    ? []
    : [{ id: "AA" as ResultsTab, label: "All-Around" }]),
  ...getApparatusForDiscipline(discipline).map((apparatus) => ({
    id: apparatus,
    label: apparatus === "FX" ? APPARATUS_SHORT_LABEL[apparatus] : APPARATUS_LABEL[apparatus],
  })),
];

export const getDefaultResultsTab = (
  discipline: Discipline,
  competitionConfig?: CompetitionConfig,
): ResultsTab => getResultsTabConfig(discipline, competitionConfig)[0]?.id || "AA";

export const getResultsRowStyle = (
  status: string,
  resultState: "OK" | "DNS" | "DNF" | "EMPTY",
): string => {
  if (resultState === "DNF" || resultState === "DNS") {
    return "border-l-2 border-l-rose-500/40 bg-rose-950/10";
  }
  if (status === "Q") return "border-l-2 border-l-emerald-500/50 bg-emerald-900/10";
  if (status.startsWith("R")) return "border-l-2 border-l-slate-500/50 bg-slate-800/30";
  return resultState === "EMPTY" ? "opacity-60" : "";
};

export const renderResultsTiebreakValue = (value: number | null) =>
  value === null ? "-" : value.toFixed(3);

export const renderIndividualTotal = (row: RankedGymnast) => {
  if (row.resultState === "DNS") return "DNS";
  if (row.resultState === "DNF") return "DNF";
  if (row.resultState === "EMPTY" || row.total === null) return "-";
  return row.total.toFixed(3);
};
