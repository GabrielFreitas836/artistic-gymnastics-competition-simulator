import { QualificationScoringEntity } from "@/features/qualification/scoring/selectors/scoringSelectors";
import { Apparatus, ApparatusKey, Gymnast, Score } from "@/lib/types";

import { EntityScoringCard } from "./EntityScoringCard";
import { ScoreField } from "@/features/shared/utils/scoreInput";

interface ApparatusPanelProps {
  apparatus: ApparatusKey;
  entities: QualificationScoringEntity[];
  getDnsKey: (gymnast: Gymnast, apparatus: ApparatusKey, vaultIndex?: 0 | 1) => "VT" | "UB" | "BB" | "FX" | "VT1" | "VT2";
  isDnsActive: (gymnastId: string, key: "VT" | "UB" | "BB" | "FX" | "VT1" | "VT2") => boolean;
  getStoredScore: (gymnastId: string, apparatus: string, vaultIndex?: 0 | 1) => Score | undefined;
  getInputValue: (fieldKey: string, storedValue?: number) => string;
  updateDraft: (fieldKey: string, rawValue: string) => void;
  onBlur: (
    gymnastId: string,
    apparatus: Apparatus,
    field: ScoreField,
    storedScore?: Score,
    vaultIndex?: 0 | 1,
  ) => void;
  onToggleDns: (gymnastId: string, key: "VT" | "UB" | "BB" | "FX" | "VT1" | "VT2") => void;
  getRank: (gymnastId: string, apparatus: string) => number | null;
  isRankIndicatorActive: (key: string) => boolean;
}

export function ApparatusPanel({
  apparatus,
  entities,
  getDnsKey,
  isDnsActive,
  getStoredScore,
  getInputValue,
  updateDraft,
  onBlur,
  onToggleDns,
  getRank,
  isRankIndicatorActive,
}: ApparatusPanelProps) {
  return (
    <div className="glass-panel flex flex-col overflow-hidden rounded-2xl border border-white/5">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 p-4">
        <h3 className="font-display text-xl font-bold tracking-widest text-white">{apparatus}</h3>
        <span className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400">
          {entities.length} Teams/Groups
        </span>
      </div>

      <div className="flex-1 space-y-8 p-4">
        {entities.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm italic text-slate-500">
            No entities on {apparatus} in this rotation.
          </div>
        )}

        {entities.map((entity) => (
          <EntityScoringCard
            key={entity.entityId}
            entity={entity}
            apparatus={apparatus}
            getDnsKey={getDnsKey}
            isDnsActive={isDnsActive}
            getStoredScore={getStoredScore}
            getInputValue={getInputValue}
            updateDraft={updateDraft}
            onBlur={onBlur}
            onToggleDns={onToggleDns}
            getRank={getRank}
            isRankIndicatorActive={isRankIndicatorActive}
          />
        ))}
      </div>
    </div>
  );
}
