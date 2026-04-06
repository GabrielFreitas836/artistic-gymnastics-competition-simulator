import { ChevronRight } from "lucide-react";
import { Medal, Users } from "lucide-react";

import { GlassSection } from "@/components/simulation/layout/GlassSection";
import { cn } from "@/lib/utils";

interface FinalsLaunchPanelProps {
  teamFinalMessage: string;
  allAroundFinalMessage: string;
  canOpenTeamFinal: boolean;
  canOpenAllAroundFinal: boolean;
  teamStats: string[];
  allAroundStats: string[];
  onOpenTeamFinal: () => void;
  onOpenAllAroundFinal: () => void;
}

export function FinalsLaunchPanel({
  teamFinalMessage,
  allAroundFinalMessage,
  canOpenTeamFinal,
  canOpenAllAroundFinal,
  teamStats,
  allAroundStats,
  onOpenTeamFinal,
  onOpenAllAroundFinal,
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
        {[
          { code: "7.3.1", label: "Vault Final", icon: <Medal className="h-5 w-5 text-amber-400" /> },
          { code: "7.3.2", label: "Uneven Bars Final", icon: <Users className="h-5 w-5 text-amber-400" /> },
          { code: "7.3.3", label: "Balance Beam Final", icon: <Medal className="h-5 w-5 text-amber-400" /> },
          { code: "7.3.4", label: "Floor Final", icon: <Users className="h-5 w-5 text-amber-400" /> },
        ].map((final) => (
          <div
            key={final.code}
            className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              {final.icon}
              {final.code}
            </div>
            <div className="mt-2 font-semibold text-white">{final.label}</div>
            <div className="mt-3 inline-flex rounded-full border border-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Coming soon
            </div>
          </div>
        ))}
      </div>
    </GlassSection>
  );
}
