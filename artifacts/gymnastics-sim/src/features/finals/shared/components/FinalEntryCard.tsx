import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { StatPill } from "@/components/simulation/status/StatPill";
import { cn } from "@/lib/utils";

interface FinalEntryCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  stats: string[];
  onClick: () => void;
}

export function FinalEntryCard({
  icon,
  title,
  description,
  enabled,
  stats,
  onClick,
}: FinalEntryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className={cn(
        "rounded-3xl border p-6 text-left transition-all",
        enabled
          ? "border-amber-500/30 bg-slate-900/60 hover:border-amber-400 hover:bg-slate-900/80"
          : "cursor-not-allowed border-white/10 bg-slate-900/30 opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="text-amber-400">{icon}</div>
            <div className="font-display text-2xl font-bold text-white">{title}</div>
          </div>
          <p className="mt-3 text-sm text-slate-400">{description}</p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 text-slate-500" />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {stats.map((stat) => (
          <StatPill key={stat}>{stat}</StatPill>
        ))}
      </div>
    </button>
  );
}
