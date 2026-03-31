import { Check } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { clsx } from "clsx";

const STEPS = [
  "Teams",
  "Roster",
  "Mixed Groups",
  "Rotation",
  "Scores",
  "Results",
  "Team Final",
];

export function Stepper() {
  const { state } = useSimulation();
  const currentStep = state.phase;

  return (
    <div className="w-full py-6 px-4 mb-8 overflow-x-auto no-scrollbar">
      <div className="min-w-[600px] flex justify-between relative">
        {/* Connecting Line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-800 -z-10 mx-6">
          <div 
            className="h-full bg-gold-gradient transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={step} className="flex flex-col items-center gap-2 relative z-10 w-24">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
                isCompleted ? "bg-amber-500 border-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]" :
                isCurrent ? "bg-slate-900 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]" :
                "bg-slate-900 border-slate-700 text-slate-500"
              )}>
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span className={clsx(
                "text-xs font-semibold uppercase tracking-wider text-center transition-colors duration-300",
                isCurrent ? "text-amber-400 text-glow" :
                isCompleted ? "text-slate-300" :
                "text-slate-600"
              )}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
