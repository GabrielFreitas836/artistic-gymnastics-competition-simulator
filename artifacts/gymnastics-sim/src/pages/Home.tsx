import { useLocation } from "wouter";
import { Trophy, ChevronRight } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";

export default function Home() {
  const [, setLocation] = useLocation();
  const { state, dispatch } = useSimulation();

  const handleStart = () => {
    if (state.phase > 1) {
      setLocation(getRouteForPhase(state.phase));
    } else {
      dispatch({ type: 'SET_PHASE', payload: 1 });
      setLocation("/teams");
    }
  };

  const getRouteForPhase = (phase: number) => {
    switch(phase) {
      case 1: return "/teams";
      case 2: return "/roster";
      case 3: return "/mixed-groups";
      case 4: return "/rotation";
      case 5: return "/scoring";
      case 6: return "/results";
      default: return "/teams";
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 relative z-10">
      
      {/* Decorative background logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] -z-10" />
      
      <div className="w-24 h-24 rounded-full bg-gold-gradient flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(212,175,55,0.4)] relative">
        <div className="absolute inset-0 rounded-full border-2 border-amber-300 animate-ping opacity-20"></div>
        <Trophy className="w-12 h-12 text-slate-950" />
      </div>

      <h1 className="text-5xl md:text-7xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 tracking-tight mb-6 drop-shadow-2xl">
        WAG OLYMPIC<br/>SIMULATION
      </h1>
      
      <p className="text-lg md:text-xl text-slate-300 max-w-2xl font-light mb-12 leading-relaxed">
        Experience the thrill of managing a complete Women's Artistic Gymnastics Olympic competition. Build teams, configure rosters, assign scores, and discover the medalists.
      </p>

      <button 
        onClick={handleStart}
        className="group relative overflow-hidden rounded-full bg-slate-900 border border-amber-500/50 px-10 py-5 text-lg font-bold uppercase tracking-widest text-amber-400 transition-all hover:bg-slate-800 hover:border-amber-400 hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] active:scale-95"
      >
        <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity" />
        <span className="flex items-center gap-3 relative z-10">
          {state.phase > 1 ? "Resume Simulation" : "Start Simulation"} 
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </span>
      </button>

      {state.phase > 1 && (
        <button 
          onClick={() => {
            if(confirm("Start completely fresh?")) {
              dispatch({type: 'RESET'});
              setLocation("/teams");
            }
          }}
          className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
        >
          Start new simulation
        </button>
      )}
    </div>
  );
}
