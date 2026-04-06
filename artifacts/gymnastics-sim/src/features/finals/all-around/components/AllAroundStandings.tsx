import { GlassSection } from "@/components/simulation/layout/GlassSection";
import { SegmentedControl } from "@/components/simulation/controls/SegmentedControl";
import { formatOrdinal } from "@/features/shared/utils/formatters";
import { getCountryById } from "@/lib/countries";
import { AllAroundFinalRankingRow } from "@/lib/simulation/finals/all-around";
import { cn } from "@/lib/utils";

import { FinalTab } from "../hooks/useAllAroundFinalController";

const MEDAL_CLASS: Record<"Gold" | "Silver" | "Bronze", string> = {
  Gold: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  Silver: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  Bronze: "border-orange-400/40 bg-orange-500/10 text-orange-300",
};

interface AllAroundStandingsProps {
  rankings: AllAroundFinalRankingRow[];
  activeTab: FinalTab;
  onTabChange: (value: FinalTab) => void;
  isRankIndicatorActive: (key: string) => boolean;
}

export function AllAroundStandings({
  rankings,
  activeTab,
  onTabChange,
  isRankIndicatorActive,
}: AllAroundStandingsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <GlassSection>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-display text-2xl font-bold text-white">Live Rankings</h3>
            <p className="mt-1 text-sm text-slate-400">
              The leaderboard updates as scores are entered. DNF gymnasts move to the end automatically.
            </p>
          </div>
          <SegmentedControl
            value={activeTab}
            onChange={onTabChange}
            options={[
              { id: "STANDINGS", label: "General Ranking" },
              { id: "APPARATUS", label: "Apparatus Ranking" },
            ]}
          />
        </div>

        {activeTab === "STANDINGS" ? (
          <div className="space-y-3">
            {rankings.map((row) => {
              const country = getCountryById(row.gymnast.countryId);
              const rankVisible = row.rank !== null;
              const showIndicator = rankVisible && isRankIndicatorActive(row.gymnast.id);

              return (
                <div
                  key={row.gymnast.id}
                  className={cn(
                    "rounded-2xl border p-4",
                    row.isDnf
                      ? "border-rose-500/20 bg-rose-950/15"
                      : "border-white/10 bg-slate-950/60",
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-amber-300">
                        {rankVisible ? row.rank : "-"}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-2xl">{country.flag}</span>
                          <span className="font-display text-lg font-bold text-white">
                            {row.gymnast.name}
                          </span>
                          {row.medal && (
                            <span
                              className={cn(
                                "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
                                MEDAL_CLASS[row.medal],
                              )}
                            >
                              {row.medal}
                            </span>
                          )}
                          {showIndicator && row.rank !== null && (
                            <span className="animate-pulse rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                              Current position: {formatOrdinal(row.rank)}
                            </span>
                          )}
                          {row.isDnf && (
                            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300">
                              DNS
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-widest text-slate-500">
                          <span>{country.name}</span>
                          <span>Slot {row.slot.slotNumber}</span>
                          <span>Qual {formatOrdinal(row.slot.qualificationRank)}</span>
                          <span>{row.completedRoutineCount}/4 done</span>
                          {row.tied && <span>Tied</span>}
                          {row.slot.reserveSource && (
                            <span>{row.slot.reserveSource} replacement</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Total
                      </div>
                      <div className="text-2xl font-bold text-amber-400">
                        {row.isDnf ? "DNF" : row.total.toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                  <th className="px-3 py-3 font-bold">Gymnast</th>
                  {["VT", "UB", "BB", "FX"].map((apparatus) => (
                    <th key={apparatus} className="px-3 py-3 text-right font-bold">
                      {apparatus}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-bold">AA Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rankings.map((row) => {
                  const country = getCountryById(row.gymnast.countryId);
                  return (
                    <tr key={row.gymnast.id} className="transition-colors hover:bg-white/5">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{country.flag}</span>
                          <div>
                            <div className="font-semibold text-white">{row.gymnast.name}</div>
                            <div className="text-[11px] uppercase tracking-widest text-slate-500">
                              {country.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      {(["VT", "UB", "BB", "FX"] as const).map((apparatus) => {
                        const result = row.apparatus[apparatus];
                        return (
                          <td key={apparatus} className="px-3 py-4 text-right text-sm">
                            {result.resultState === "DNS" ? (
                              <span className="text-rose-300">DNS</span>
                            ) : result.resultState === "EMPTY" || result.score === null ? (
                              <span className="text-slate-600">-</span>
                            ) : (
                              <span className="text-slate-200">
                                {result.score.toFixed(3)} ({formatOrdinal(result.rank)})
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-4 text-right text-lg font-bold text-amber-400">
                        {row.isDnf ? "DNF" : row.total.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassSection>

      <GlassSection>
        <h3 className="font-display text-2xl font-bold text-white">Finalists</h3>
        <p className="mt-2 text-sm text-slate-400">
          Qualification order defines the fixed rotation positions in this final.
        </p>

        <div className="mt-5 space-y-3">
          {rankings.map((row) => {
            const country = getCountryById(row.gymnast.countryId);

            return (
              <div
                key={row.slot.slotNumber}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">
                          {row.gymnast.name}
                        </div>
                        <div className="text-[11px] uppercase tracking-widest text-slate-500">
                          Slot {row.slot.slotNumber} • Qual {formatOrdinal(row.slot.qualificationRank)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {row.slot.reserveSource && (
                    <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                      {row.slot.reserveSource}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassSection>
    </div>
  );
}
