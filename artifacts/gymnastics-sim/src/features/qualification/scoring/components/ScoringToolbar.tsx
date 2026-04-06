import { Calculator, Trophy } from "lucide-react";

import { PageHero } from "@/components/simulation/layout/PageHero";
import { SegmentedControl } from "@/components/simulation/controls/SegmentedControl";

interface ScoringToolbarProps {
  activeSub: number;
  onSubChange: (value: number) => void;
  activeRot: number;
  onRotChange: (value: number) => void;
  onFinish: () => void;
}

export function ScoringToolbar({
  activeSub,
  onSubChange,
  activeRot,
  onRotChange,
  onFinish,
}: ScoringToolbarProps) {
  return (
    <>
      <PageHero
        icon={<Calculator className="h-8 w-8 text-amber-500" />}
        title="JUDGES PANEL"
        description="Input D-score, E-score and Penalties."
        action={(
          <button
            type="button"
            onClick={onFinish}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3 font-bold uppercase tracking-wide text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
          >
            View Results <Trophy className="h-5 w-5" />
          </button>
        )}
      />

      <div className="glass-panel mb-8 flex flex-col justify-between gap-4 rounded-2xl p-2 md:flex-row">
        <SegmentedControl
          value={activeSub}
          onChange={onSubChange}
          options={[1, 2, 3, 4, 5].map((subdivision) => ({
            id: subdivision,
            label: `Sub ${subdivision}`,
          }))}
          className="bg-slate-900"
        />

        <SegmentedControl
          value={activeRot}
          onChange={onRotChange}
          options={[1, 2, 3, 4].map((rotation) => ({
            id: rotation,
            label: `Rot ${rotation}`,
          }))}
          className="bg-slate-900"
        />
      </div>
    </>
  );
}
