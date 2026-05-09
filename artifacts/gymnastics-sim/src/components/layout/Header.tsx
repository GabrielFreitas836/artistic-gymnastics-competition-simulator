import { Medal, RotateCcw, Trophy } from "lucide-react";
import { useLocation } from "wouter";

import { useSimulation } from "@/context/SimulationContext";
import { getCompetitionShortLabel, getRunStepCount, getRunStepNumber } from "@/lib/competitionRun";

export function Header() {
  const { state, dispatch } = useSimulation();
  const [, setLocation] = useLocation();
  const shortLabel = getCompetitionShortLabel(state);
  const currentStep = getRunStepNumber(state);
  const totalSteps = getRunStepCount(state);
  const persistenceLabel =
    state.persistenceSource === "remote"
      ? state.lastSavedAt
        ? `Remote save ${new Date(state.lastSavedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "Remote sync enabled"
      : "Local cache";

  const resetSim = () => {
    if (confirm("Are you sure you want to completely reset the simulation? All data will be lost.")) {
      dispatch({ type: "RESET" });
      setLocation("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient shadow-[0_0_15px_rgba(212,175,55,0.4)]">
            <Trophy className="h-5 w-5 text-slate-950" />
          </div>
          <div>
            <h1 className="hidden bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-xl font-bold text-transparent sm:block">
              FIG CYCLE COMPETITION SIMULATOR
            </h1>
            <h1 className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-xl font-bold text-transparent sm:hidden">
              {state.discipline} SIM
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 md:flex">
            <Medal className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-300">
              {shortLabel} | Phase {currentStep} of {totalSteps}
            </span>
          </div>

          <div className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 md:block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
              {persistenceLabel}
            </span>
          </div>

          <button
            onClick={resetSim}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
}
