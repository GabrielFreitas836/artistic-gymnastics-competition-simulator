import { ChevronRight } from "lucide-react";
import { Medal, Users } from "lucide-react";

import { GlassSection } from "@/components/simulation/layout/GlassSection";
import { ApparatusKey } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FinalsLaunchPanelProps {
  teamFinalMessage: string;
  allAroundFinalMessage: string;
  canOpenTeamFinal: boolean;
  canOpenAllAroundFinal: boolean;
  teamStats: string[];
  allAroundStats: string[];
  apparatusFinals: Record<
    ApparatusKey,
    {
      code: string;
      label: string;
      route: string;
      message: string;
      canOpen: boolean;
      pool: {
        qualified: unknown[];
        reserves: unknown[];
      };
      rankings: unknown[];
      isComplete: boolean;
    }
  >;
  onOpenTeamFinal: () => void;
  onOpenAllAroundFinal: () => void;
  onOpenApparatusFinal: (route: string, isEnabled: boolean) => void;
}

export function FinalsLaunchPanel({
  teamFinalMessage,
  allAroundFinalMessage,
  canOpenTeamFinal,
  canOpenAllAroundFinal,
  teamStats,
  allAroundStats,
  apparatusFinals,
  onOpenTeamFinal,
  onOpenAllAroundFinal,
  onOpenApparatusFinal,
}: FinalsLaunchPanelProps) {
  return (
    <GlassSection className="mb-8 rounded-2xl border-amber-500/20 bg-slate-900/50">
      <div className="mb-5 flex flex-col gap-2">
        <h3 className="font-display text-xl font-bold tracking-widest text-white">
          PHASE 7 FINALS
        </h3>
        <p className="max-w-3xl text-sm text-slate-400">
          Finals are grouped into a single phase. You can choose which final to run first.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                7.1
              </div>
              <h4 className="font-display text-xl font-bold text-white">Team Final</h4>
              <p className="mt-2 text-sm text-slate-400">{teamFinalMessage}</p>
            </div>
            <button
              type="button"
              onClick={onOpenTeamFinal}
              disabled={!canOpenTeamFinal}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wide transition-all",
                canOpenTeamFinal
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
                  : "cursor-not-allowed bg-slate-800 text-slate-500",
              )}
            >
              Open
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
            {teamStats.map((stat) => (
              <span key={stat}>{stat}</span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                7.2
              </div>
              <h4 className="font-display text-xl font-bold text-white">Individual All-Around</h4>
              <p className="mt-2 text-sm text-slate-400">{allAroundFinalMessage}</p>
            </div>
            <button
              type="button"
              onClick={onOpenAllAroundFinal}
              disabled={!canOpenAllAroundFinal}
              className={cn(
                "inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wide transition-all",
                canOpenAllAroundFinal
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
                  : "cursor-not-allowed bg-slate-800 text-slate-500",
              )}
            >
              Open
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
            {allAroundStats.map((stat) => (
              <span key={stat}>{stat}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(["VT", "UB", "BB", "FX"] as const).map((apparatus) => {
          const final = apparatusFinals[apparatus];

          return (
          <div
            key={final.code}
            className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              {apparatus === "VT" || apparatus === "BB" ? (
                <Medal className="h-5 w-5 text-amber-400" />
              ) : (
                <Users className="h-5 w-5 text-amber-400" />
              )}
              {final.code}
            </div>
            <div className="mt-2 font-semibold text-white">{final.label} Final</div>
            <p className="mt-2 min-h-[3rem] text-xs text-slate-400">{final.message}</p>
            <button
              type="button"
              onClick={() => onOpenApparatusFinal(final.route, final.canOpen)}
              disabled={!final.canOpen}
              className={cn(
                "mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors",
                final.canOpen
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                  : "cursor-not-allowed border border-slate-700 text-slate-400",
              )}
            >
              {final.pool.qualified.length === 1
                ? "Automatic gold"
                : final.isComplete
                  ? "Completed"
                  : final.rankings.length > 0
                    ? "Resume"
                    : "Open"}
            </button>
          </div>
          );
        })}
      </div>
    </GlassSection>
  );
}
