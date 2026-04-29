import { Users } from "lucide-react";

import { QualificationScoringEntity } from "@/features/qualification/scoring/selectors/scoringSelectors";
import { Apparatus, ApparatusKey, DnsEntryKey, Gymnast, Score } from "@/lib/types";

import { GymnastScoreRow } from "./GymnastScoreRow";
import { ScoreField } from "@/features/shared/utils/scoreInput";

interface EntityScoringCardProps {
  entity: QualificationScoringEntity;
  apparatus: ApparatusKey;
  getDnsKey: (gymnast: Gymnast, apparatus: ApparatusKey, vaultIndex?: 0 | 1) => DnsEntryKey;
  isDnsActive: (gymnastId: string, key: DnsEntryKey) => boolean;
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
  onToggleDns: (gymnastId: string, key: DnsEntryKey, apparatus: ApparatusKey) => void;
  onToggleStandByActivation: (teamId: string, apparatus: ApparatusKey, activated: boolean) => void;
  getRank: (gymnastId: string, apparatus: string) => number | null;
  isRankIndicatorActive: (key: string) => boolean;
}

export function EntityScoringCard({
  entity,
  apparatus,
  getDnsKey,
  isDnsActive,
  getStoredScore,
  getInputValue,
  updateDraft,
  onBlur,
  onToggleDns,
  onToggleStandByActivation,
  getRank,
  isRankIndicatorActive,
}: EntityScoringCardProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-800/30 p-4">
      <div className="mb-4 flex items-end justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl drop-shadow-md">
            {entity.isTeam ? entity.flag : <Users className="h-5 w-5 text-slate-400" />}
          </span>
          <h4 className="font-bold text-amber-500">{entity.name}</h4>
        </div>
        {entity.isTeam && (
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              App Total (Top 3)
            </div>
            <div className="text-lg font-bold text-white">
              {entity.teamApparatusResult?.resultState === "OK"
                ? entity.teamApparatusResult.score?.toFixed(3)
                : entity.teamApparatusResult?.resultState === "DNF"
                  ? "DNF"
                  : "-"}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {entity.rows.map((row) => (
          <GymnastScoreRow
            key={`${entity.entityId}_${row.gymnast.id}_${row.role}`}
            row={row}
            apparatus={apparatus}
            getDnsKey={getDnsKey}
            isDnsActive={isDnsActive}
            getStoredScore={getStoredScore}
            getInputValue={getInputValue}
            updateDraft={updateDraft}
            onBlur={onBlur}
            onToggleDns={onToggleDns}
            onToggleStandByActivation={(activated) =>
              onToggleStandByActivation(entity.entityId, apparatus, activated)
            }
            getRank={getRank}
            isRankIndicatorActive={isRankIndicatorActive}
          />
        ))}
      </div>
    </div>
  );
}
