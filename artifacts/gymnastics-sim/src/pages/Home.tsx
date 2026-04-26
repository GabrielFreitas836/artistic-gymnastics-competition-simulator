import { useLocation } from "wouter";
import { Trophy, ChevronRight } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { Discipline } from "@/lib/types";

export default function Home() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();

  const getRouteForPhase = (phase: number) => {
    switch (phase) {
      case 1: return "/teams";
      case 2: return "/roster";
      case 3: return "/mixed-groups";
      case 4: return "/rotation";
      case 5: return "/scoring";
      case 6: return "/results";
      case 7: return "/finals";
      default: return "/teams";
    }
  };

  const handleStart = (discipline: Discipline) => {
    dispatch({ type: "RESET" });
    dispatch({ type: "SET_DISCIPLINE", payload: discipline });
    dispatch({ type: "SET_PHASE", payload: 1 });
    setLocation("/teams");
  };

  const handleResume = () => {
    setLocation(getRouteForPhase(state.phase));
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 relative z-10">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] -z-10" />

      <div className="w-24 h-24 rounded-full bg-gold-gradient flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(212,175,55,0.4)] relative">
        <div className="absolute inset-0 rounded-full border-2 border-amber-300 animate-ping opacity-20" />
        <Trophy className="w-12 h-12 text-slate-950" />
      </div>

      <h1 className="text-5xl md:text-7xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 tracking-tight mb-6 drop-shadow-2xl">
        GYMNASTICS OLYMPICS<br />SIMULATION
      </h1>

      <p className="text-lg md:text-xl text-slate-300 max-w-3xl font-light mb-10 leading-relaxed">
        Run a complete Olympic competition for Men&apos;s and Women&apos;s Artistic Gymnastics. Build teams, configure rosters, score qualification, and crown the medalists.
      </p>

      {state.phase > 1 ? (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleResume}
            className="group relative overflow-hidden rounded-full bg-slate-900 border border-amber-500/50 px-10 py-5 text-lg font-bold uppercase tracking-widest text-amber-400 transition-all hover:bg-slate-800 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity" />
            <span className="flex items-center gap-3 relative z-10">
              Resume {state.discipline} Simulation
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

          <button
            onClick={() => {
              if (confirm("Start completely fresh?")) {
                dispatch({ type: "RESET" });
                setLocation("/");
              }
            }}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
          >
            Start new simulation
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 w-full max-w-2xl">
          <button
            onClick={() => handleStart("WAG")}
            className="group rounded-3xl border border-amber-500/40 bg-slate-900/70 px-8 py-8 text-left transition-all hover:border-amber-400 hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(212,175,55,0.18)]"
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Start Simulation</div>
            <div className="mt-3 text-3xl font-display font-bold text-white">WAG</div>
            <div className="mt-2 text-sm text-slate-400">Women&apos;s Artistic Gymnastics</div>
          </button>

          <button
            onClick={() => handleStart("MAG")}
            className="group rounded-3xl border border-amber-500/40 bg-slate-900/70 px-8 py-8 text-left transition-all hover:border-amber-400 hover:bg-slate-800 hover:shadow-[0_0_30px_rgba(212,175,55,0.18)]"
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Start Simulation</div>
            <div className="mt-3 text-3xl font-display font-bold text-white">MAG</div>
            <div className="mt-2 text-sm text-slate-400">Men&apos;s Artistic Gymnastics</div>
          </button>
        </div>
      )}
    </div>
  );
}
