import { CheckCircle2 } from "lucide-react";

import { GlassSection } from "@/components/simulation/layout/GlassSection";
import { ScoreFields } from "@/components/simulation/controls/ScoreFields";
import { SegmentedControl } from "@/components/simulation/controls/SegmentedControl";
import { buildScoreDraftKey, ScoreField } from "@/features/shared/utils/scoreInput";
import { formatOrdinal } from "@/features/shared/utils/formatters";
import {
  ALL_AROUND_FINAL_APPARATUS,
  ALL_AROUND_FINAL_ROTATIONS,
  AllAroundFinalRankingRow,
  getAllAroundFinalStoredScore,
  isAllAroundFinalDnsActive,
} from "@/lib/simulation/finals/all-around";
import { getCountryById } from "@/lib/countries";
import { ApparatusKey, Score, SimulationState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AllAroundRotationPanelProps {
  state: SimulationState;
  rankings: AllAroundFinalRankingRow[];
  activeRotation: number;
  onRotationChange: (value: number) => void;
  getScoreValue: (fieldKey: string, storedValue?: number) => string;
  updateScoreDraft: (fieldKey: string, rawValue: string) => void;
  onScoreBlur: (
    gymnastId: string,
    apparatus: ApparatusKey,
    field: ScoreField,
    storedScore?: Score,
  ) => void;
  onToggleDns: (gymnastId: string, apparatus: ApparatusKey) => void;
  isRankIndicatorActive: (key: string) => boolean;
}

const APP_LABEL: Record<ApparatusKey, string> = {
  VT: "Vault",
  UB: "Uneven Bars",
  BB: "Balance Beam",
  FX: "Floor Exercise",
};

export function AllAroundRotationPanel({
  state,
  rankings,
  activeRotation,
  onRotationChange,
  getScoreValue,
  updateScoreDraft,
  onScoreBlur,
  onToggleDns,
  isRankIndicatorActive,
}: AllAroundRotationPanelProps) {
  return (
    <GlassSection>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-display text-2xl font-bold text-white">Scoring Rotations</h3>
          <p className="mt-2 text-sm text-slate-400">
            Each rotation uses the fixed Olympic draw order based on qualification slots 1 to 24.
          </p>
        </div>
        <SegmentedControl
          value={activeRotation}
          onChange={onRotationChange}
          options={[1, 2, 3, 4].map((rotation) => ({ id: rotation, label: `Rot ${rotation}` }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {ALL_AROUND_FINAL_APPARATUS.map((apparatus) => {
          const rotationSlots = ALL_AROUND_FINAL_ROTATIONS[activeRotation][apparatus]
            .map((slotNumber) => state.finals.allAroundFinal.slots.find((slot) => slot.slotNumber === slotNumber))
            .filter((slot): slot is (typeof state.finals.allAroundFinal.slots)[number] => Boolean(slot));

          return (
            <div
              key={`${activeRotation}_${apparatus}`}
              className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 sm:p-6"
            >
              <div className="mb-5 border-b border-white/10 pb-5">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-display text-xl font-bold text-white">
                    {APP_LABEL[apparatus]} ({apparatus})
                  </h4>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Rotation {activeRotation}
                  </div>
                </div>
                <div className="mt-3 text-sm text-slate-400">
                  Competition order:{" "}
                  {ALL_AROUND_FINAL_ROTATIONS[activeRotation][apparatus]
                    .filter((slotNumber) =>
                      state.finals.allAroundFinal.slots.some((slot) => slot.slotNumber === slotNumber))
                    .join(", ")}
                </div>
              </div>

              <div className="space-y-5">
                {rotationSlots.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-500">
                    No finalist is assigned to this apparatus block.
                  </div>
                )}

                {rotationSlots.map((slot) => {
                  const row = rankings.find((entry) => entry.slot.slotNumber === slot.slotNumber);
                  if (!row) return null;

                  const country = getCountryById(row.gymnast.countryId);
                  const dnsActive = isAllAroundFinalDnsActive(
                    state.finals.allAroundFinal.dns,
                    row.gymnast.id,
                    apparatus,
                  );
                  const storedScore = getAllAroundFinalStoredScore(
                    state.finals.allAroundFinal.scores,
                    row.gymnast.id,
                    apparatus,
                  );
                  const scoreObject = storedScore || { d: 0, e: 0, penalty: 0, total: 0 };
                  const showIndicator = row.rank !== null && isRankIndicatorActive(row.gymnast.id);

                  return (
                    <div
                      key={`${apparatus}_${row.gymnast.id}`}
                      className={cn(
                        "rounded-2xl border p-4 sm:p-5",
                        dnsActive
                          ? "border-rose-500/20 bg-rose-950/20"
                          : "border-white/10 bg-slate-950/60",
                      )}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {storedScore || dnsActive ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            ) : (
                              <div className="h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate text-base font-semibold text-white">
                              {row.gymnast.name}
                            </span>
                            <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                              Slot {slot.slotNumber}
                            </span>
                            {showIndicator && row.rank !== null && !row.isDnf && (
                              <span className="animate-pulse rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                                {formatOrdinal(row.rank)}
                              </span>
                            )}
                            {dnsActive && (
                              <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">
                                DNS
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-widest text-slate-500">
                            <span>{country.name}</span>
                            <span>Qual {formatOrdinal(slot.qualificationRank)}</span>
                            {slot.reserveSource && <span>{slot.reserveSource} replacement</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onToggleDns(row.gymnast.id, apparatus)}
                          className={cn(
                            "self-start rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
                            dnsActive
                              ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                              : "border-slate-600 bg-slate-800 text-slate-300 hover:border-rose-500/30 hover:text-rose-200",
                          )}
                        >
                          DNS
                        </button>
                      </div>

                      <div className="mt-5">
                        <ScoreFields
                          fields={["d", "e", "penalty"]}
                          getValue={(field) =>
                            getScoreValue(
                              buildScoreDraftKey(row.gymnast.id, apparatus, field),
                              storedScore?.[field],
                            )
                          }
                          onChange={(field, value) =>
                            updateScoreDraft(buildScoreDraftKey(row.gymnast.id, apparatus, field), value)
                          }
                          onBlur={(field) => onScoreBlur(row.gymnast.id, apparatus, field, storedScore)}
                          disabled={dnsActive}
                          totalValue={dnsActive ? "DNS" : scoreObject.total.toFixed(3)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </GlassSection>
  );
}
