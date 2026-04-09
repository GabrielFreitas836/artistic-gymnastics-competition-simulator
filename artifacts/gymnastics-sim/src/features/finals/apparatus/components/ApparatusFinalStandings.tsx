import { GlassSection } from "@/components/simulation/layout/GlassSection";
import { formatOrdinal } from "@/features/shared/utils/formatters";
import { getCountryById } from "@/lib/countries";
import { ApparatusFinalRankingRow } from "@/lib/simulation/finals/apparatus";
import { cn } from "@/lib/utils";

const MEDAL_CLASS: Record<"Gold" | "Silver" | "Bronze", string> = {
  Gold: "text-amber-400",
  Silver: "text-[#c0c7d1]",
  Bronze: "text-[#c9733d]",
};

interface ApparatusFinalStandingsProps {
  apparatusLabel: string;
  rankings: ApparatusFinalRankingRow[];
  isRankIndicatorActive: (key: string) => boolean;
}

export function ApparatusFinalStandings({
  apparatusLabel,
  rankings,
  isRankIndicatorActive,
}: ApparatusFinalStandingsProps) {
  const competitionOrder = [...rankings].sort(
    (a, b) => a.slot.competitionOrder - b.slot.competitionOrder,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <GlassSection>
        <div className="mb-4">
          <h3 className="font-display text-2xl font-bold text-white">Live Rankings</h3>
          <p className="mt-1 text-sm text-slate-400">
            The leaderboard updates live while scores are entered for the {apparatusLabel.toLowerCase()} final.
          </p>
        </div>

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
                              "rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
                              MEDAL_CLASS[row.medal],
                            )}
                          >
                            {row.medal}
                          </span>
                        )}
                        {showIndicator && row.rank !== null && !row.isDnf && (
                          <span className="animate-pulse rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                            Current position: {formatOrdinal(row.rank)}
                          </span>
                        )}
                        {row.isDnf && (
                          <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300">
                            {row.resultState}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-widest text-slate-500">
                        <span>{country.name}</span>
                        <span>Order {row.slot.competitionOrder}</span>
                        <span>Qual {formatOrdinal(row.slot.qualificationRank)}</span>
                        <span>
                          {row.completedRoutineCount}/{row.routineCount} done
                        </span>
                        {row.tied && <span>Tied</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Score
                    </div>
                    <div className="text-2xl font-bold text-amber-400">
                      {row.isDnf ? row.resultState : row.total.toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassSection>

      <GlassSection>
        <h3 className="font-display text-2xl font-bold text-white">Competition Order</h3>
        <p className="mt-2 text-sm text-slate-400">
          The score cards below follow this exact order.
        </p>

        <div className="mt-5 space-y-3">
          {competitionOrder.map((row) => {
            const country = getCountryById(row.gymnast.countryId);

            return (
              <div
                key={row.slot.competitionOrder}
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
                          Order {row.slot.competitionOrder} • Qual {formatOrdinal(row.slot.qualificationRank)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                    #{row.slot.competitionOrder}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassSection>
    </div>
  );
}
