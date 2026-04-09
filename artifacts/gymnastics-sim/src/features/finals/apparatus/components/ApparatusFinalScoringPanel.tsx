import { CheckCircle2 } from "lucide-react";

import { ScoreFields } from "@/components/simulation/controls/ScoreFields";
import { GlassSection } from "@/components/simulation/layout/GlassSection";
import { buildScoreDraftKey, ScoreField } from "@/features/shared/utils/scoreInput";
import { formatOrdinal } from "@/features/shared/utils/formatters";
import { getCountryById } from "@/lib/countries";
import { ApparatusFinalRankingRow } from "@/lib/simulation/finals/apparatus";
import { ApparatusKey, Score, SimulationState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ApparatusFinalScoringPanelProps {
  state: SimulationState;
  apparatus: ApparatusKey;
  apparatusLabel: string;
  rankings: ApparatusFinalRankingRow[];
  getStoredScore: (
    scores: SimulationState["finals"]["apparatusFinals"]["VT"]["scores"],
    gymnastId: string,
    apparatus: ApparatusKey,
    vaultIndex?: 0 | 1,
  ) => Score | undefined;
  isDnsActive: (
    dns: SimulationState["finals"]["apparatusFinals"]["VT"]["dns"],
    gymnastId: string,
    apparatus: ApparatusKey,
    vaultIndex?: 0 | 1,
  ) => boolean;
  isDnfActive: (
    dns: SimulationState["finals"]["apparatusFinals"]["VT"]["dns"],
    gymnastId: string,
    apparatus: ApparatusKey,
  ) => boolean;
  getScoreValue: (fieldKey: string, storedValue?: number) => string;
  updateScoreDraft: (fieldKey: string, rawValue: string) => void;
  onScoreBlur: (
    gymnastId: string,
    field: ScoreField,
    storedScore?: Score,
    vaultIndex?: 0 | 1,
  ) => void;
  onToggleDns: (gymnastId: string) => void;
  isRankIndicatorActive: (key: string) => boolean;
}

export function ApparatusFinalScoringPanel({
  state,
  apparatus,
  apparatusLabel,
  rankings,
  getStoredScore,
  isDnsActive,
  isDnfActive,
  getScoreValue,
  updateScoreDraft,
  onScoreBlur,
  onToggleDns,
  isRankIndicatorActive,
}: ApparatusFinalScoringPanelProps) {
  const competitionOrder = [...rankings].sort(
    (a, b) => a.slot.competitionOrder - b.slot.competitionOrder,
  );

  return (
    <GlassSection>
      <div className="mb-5">
        <h3 className="font-display text-2xl font-bold text-white">Scoring Order</h3>
        <p className="mt-2 text-sm text-slate-400">
          Enter scores in the established {apparatusLabel.toLowerCase()} final order.
        </p>
      </div>

      <div className="space-y-5">
        {competitionOrder.map((row) => {
          const country = getCountryById(row.gymnast.countryId);
          const dnfActive = isDnfActive(
            state.finals.apparatusFinals[apparatus].dns,
            row.gymnast.id,
            apparatus,
          );
          const showIndicator = row.rank !== null && isRankIndicatorActive(row.gymnast.id);

          return (
            <div
              key={row.gymnast.id}
              className={cn(
                "rounded-2xl border p-4 sm:p-5",
                dnfActive
                  ? "border-rose-500/20 bg-rose-950/20"
                  : "border-white/10 bg-slate-950/60",
              )}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {row.completedRoutineCount > 0 ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <div className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate text-base font-semibold text-white">
                      {row.gymnast.name}
                    </span>
                    <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                      Order {row.slot.competitionOrder}
                    </span>
                    {showIndicator && row.rank !== null && !row.isDnf && (
                      <span className="animate-pulse rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                        {formatOrdinal(row.rank)}
                      </span>
                    )}
                    {dnfActive && (
                      <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300">
                        {apparatus === "VT" ? "DNF" : "DNS"}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-widest text-slate-500">
                    <span>{country.name}</span>
                    <span>Qual {formatOrdinal(row.slot.qualificationRank)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleDns(row.gymnast.id)}
                  className={cn(
                    "self-start rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
                    dnfActive
                      ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                      : "border-slate-600 bg-slate-800 text-slate-300 hover:border-rose-500/30 hover:text-rose-200",
                  )}
                >
                  {apparatus === "VT" ? "DNF" : "DNS"}
                </button>
              </div>

              {apparatus === "VT" ? (
                <div className="mt-5 space-y-4">
                  {[0, 1].map((vaultIndex) => {
                    const storedScore = getStoredScore(
                      state.finals.apparatusFinals[apparatus].scores,
                      row.gymnast.id,
                      apparatus,
                      vaultIndex as 0 | 1,
                    );
                    const attemptDns = isDnsActive(
                      state.finals.apparatusFinals[apparatus].dns,
                      row.gymnast.id,
                      apparatus,
                      vaultIndex as 0 | 1,
                    );
                    const scoreObject = storedScore || { d: 0, e: 0, penalty: 0, total: 0 };

                    return (
                      <div
                        key={`${row.gymnast.id}_${vaultIndex}`}
                        className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
                      >
                        <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
                          Vault {vaultIndex + 1}
                        </div>
                        <ScoreFields
                          fields={["d", "e", "penalty"]}
                          getValue={(field) =>
                            getScoreValue(
                              buildScoreDraftKey(row.gymnast.id, apparatus, vaultIndex, field),
                              storedScore?.[field],
                            )
                          }
                          onChange={(field, value) =>
                            updateScoreDraft(
                              buildScoreDraftKey(row.gymnast.id, apparatus, vaultIndex, field),
                              value,
                            )
                          }
                          onBlur={(field) =>
                            onScoreBlur(
                              row.gymnast.id,
                              field,
                              storedScore,
                              vaultIndex as 0 | 1,
                            )
                          }
                          disabled={dnfActive || attemptDns}
                          totalLabel={`V${vaultIndex + 1}`}
                          totalValue={dnfActive || attemptDns ? "DNS" : scoreObject.total.toFixed(3)}
                          totalStatusLabel="Attempt score"
                        />
                      </div>
                    );
                  })}

                  <div className="flex justify-end">
                    <div className="flex min-h-[5.25rem] w-full max-w-[12rem] flex-col justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-right">
                      <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
                        Average
                      </label>
                      <div className="text-2xl font-bold text-white">
                        {dnfActive ? "DNF" : row.total.toFixed(3)}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Final score
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  {(() => {
                    const storedScore = getStoredScore(
                      state.finals.apparatusFinals[apparatus].scores,
                      row.gymnast.id,
                      apparatus,
                    );
                    const dnsActive = isDnsActive(
                      state.finals.apparatusFinals[apparatus].dns,
                      row.gymnast.id,
                      apparatus,
                    );
                    const scoreObject = storedScore || { d: 0, e: 0, penalty: 0, total: 0 };

                    return (
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
                        onBlur={(field) => onScoreBlur(row.gymnast.id, field, storedScore)}
                        disabled={dnsActive}
                        totalValue={dnsActive ? "DNS" : scoreObject.total.toFixed(3)}
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassSection>
  );
}
