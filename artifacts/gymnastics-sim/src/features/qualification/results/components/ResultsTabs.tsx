import { getResultsTabConfig, ResultsTab } from "@/features/qualification/results/selectors/resultsSelectors";
import { Discipline } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CompetitionConfig } from "@workspace/sim-core";

interface ResultsTabsProps {
  discipline: Discipline;
  competitionConfig?: CompetitionConfig;
  activeTab: ResultsTab;
  onChange: (tab: ResultsTab) => void;
}

export function ResultsTabs({ discipline, competitionConfig, activeTab, onChange }: ResultsTabsProps) {
  const tabs = getResultsTabConfig(discipline, competitionConfig);

  return (
    <div className="glass-panel mb-8 flex flex-wrap justify-center gap-2 rounded-2xl bg-slate-900/50 p-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all duration-300",
            activeTab === tab.id
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
              : "text-slate-400 hover:bg-white/5 hover:text-white",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
