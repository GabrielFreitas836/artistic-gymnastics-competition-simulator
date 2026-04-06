import { RankedGymnast } from "@/lib/simulation/rankings";

export type ResultsTab = "TEAM" | "TEAM_APP" | "AA" | "VT" | "UB" | "BB" | "FX";

export const RESULTS_TAB_CONFIG: Array<{ id: ResultsTab; label: string }> = [
  { id: "TEAM", label: "Team Qualification" },
  { id: "TEAM_APP", label: "Team Apparatus" },
  { id: "AA", label: "All-Around" },
  { id: "VT", label: "Vault" },
  { id: "UB", label: "Uneven Bars" },
  { id: "BB", label: "Balance Beam" },
  { id: "FX", label: "Floor" },
];

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
