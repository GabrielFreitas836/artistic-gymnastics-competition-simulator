import { Trophy, Medal, RotateCcw } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { useLocation } from "wouter";

export function Header() {
  const { state, dispatch } = useSimulation();
  const [, setLocation] = useLocation();

  const resetSim = () => {
    if (confirm("Are you sure you want to completely reset the simulation? All data will be lost.")) {
      dispatch({ type: 'RESET' });
      setLocation("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)]">
            <Trophy className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 hidden sm:block">
              WAG OLYMPIC SIMULATION
            </h1>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 sm:hidden">
              WAG SIM
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
            <Medal className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-300">Phase {state.phase} of 6</span>
          </div>
          
          <button 
            onClick={resetSim}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
}
