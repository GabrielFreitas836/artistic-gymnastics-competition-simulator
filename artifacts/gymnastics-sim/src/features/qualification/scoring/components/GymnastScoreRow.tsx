import { CheckCircle2 } from "lucide-react";

import { QualificationScoringRow } from "@/features/qualification/scoring/selectors/scoringSelectors";
import { buildScoreDraftKey, ScoreField } from "@/features/shared/utils/scoreInput";
import { cn } from "@/lib/utils";
import { Apparatus, ApparatusKey, DnsEntryKey, Gymnast, Score } from "@/lib/types";

interface GymnastScoreRowProps {
  row: QualificationScoringRow;
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
  onToggleStandByActivation?: (activated: boolean) => void;
  getRank: (gymnastId: string, apparatus: string) => number | null;
  isRankIndicatorActive: (key: string) => boolean;
}

export function GymnastScoreRow({
  row,
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
}: GymnastScoreRowProps) {
  const gymnast = row.gymnast;
  const isStandByRow = row.role === "standby";
  const isDoubleVault = !isStandByRow && apparatus === "VT" && gymnast.apparatus.includes("VT*");
  const vaults: (0 | 1)[] = isDoubleVault ? [0, 1] : [0];

  return (
    <>
      {vaults.map((vaultIndex) => {
        const scoreAppKey: Apparatus = isDoubleVault ? "VT*" : apparatus;
        const dnsKey = getDnsKey(gymnast, apparatus, isDoubleVault ? vaultIndex : undefined);
        const dnsActive = isDnsActive(gymnast.id, dnsKey);
        const rawStoredScore = getStoredScore(
          gymnast.id,
          scoreAppKey,
          isDoubleVault ? vaultIndex : undefined,
        );
        const storedScore = isStandByRow && !row.standByActivated ? undefined : rawStoredScore;
        const scoreObject = storedScore || { d: 0, e: 0, penalty: 0, total: 0 };
        const isCompleted = row.standByActivated && dnsActive
          ? true
          : !dnsActive && scoreObject.total > 0;
        const indicatorKey = isDoubleVault
          ? `${gymnast.id}_VT*`
          : apparatus !== "VT"
            ? `${gymnast.id}_${apparatus}`
            : null;
        const showBadge =
          indicatorKey !== null
          && !dnsActive
          && (!isStandByRow || row.standByActivated)
          && isRankIndicatorActive(indicatorKey)
          && (!isDoubleVault || vaultIndex === 1);
        const gymnastRank = showBadge ? getRank(gymnast.id, scoreAppKey) : null;
        const fieldsDisabled = dnsActive || (isStandByRow && !row.standByActivated);
        const dnsDisabled = isStandByRow && !row.standByActivated;

        return (
          <div
            key={`${gymnast.id}_${row.role}_${vaultIndex}`}
            className={cn(
              "grid grid-cols-12 gap-3 rounded-lg border p-3",
              dnsActive
                ? "border-rose-500/30 bg-rose-950/20"
                : isStandByRow && !row.standByActivated
                  ? "border-dashed border-slate-700 bg-slate-950/40"
                  : "border-transparent bg-slate-900/50",
            )}
          >
            <div className="col-span-12 flex flex-col gap-3 border-b border-white/5 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-bold text-slate-200">{gymnast.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {isStandByRow && (
                      <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-sky-300">
                        Stand By
                      </span>
                    )}
                    {isDoubleVault && (
                      <p className="text-[10px] uppercase text-slate-500">
                        Vault {vaultIndex + 1}
                      </p>
                    )}
                    {showBadge && gymnastRank !== null && (
                      <span className="rounded border border-amber-500/30 bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-400">
                        Rk {gymnastRank}
                      </span>
                    )}
                    {dnsActive && (
                      <span className="rounded border border-rose-500/30 bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-300">
                        DNS
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                {isStandByRow && (
                  <label className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                    <input
                      type="checkbox"
                      checked={row.standByActivated}
                      onChange={(event) => onToggleStandByActivation?.(event.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-amber-500"
                    />
                    Use Routine
                  </label>
                )}

                <button
                  type="button"
                  disabled={dnsDisabled}
                  onClick={() => onToggleDns(gymnast.id, dnsKey, apparatus)}
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors",
                    dnsDisabled
                      ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600"
                      : dnsActive
                        ? "border-rose-400/50 bg-rose-500/20 text-rose-200"
                        : "border-slate-600 bg-slate-800 text-slate-300 hover:border-rose-500/40 hover:text-rose-200",
                  )}
                >
                  DNS
                </button>
              </div>
            </div>

            {(["d", "e", "penalty"] as ScoreField[]).map((field) => (
              <div key={field} className="col-span-4 sm:col-span-2">
                <label className="mb-0.5 block px-1 text-[9px] uppercase text-slate-500">
                  {field === "penalty" ? "ND" : `${field.toUpperCase()}-Score`}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={getInputValue(
                    buildScoreDraftKey(gymnast.id, scoreAppKey, field, isDoubleVault ? vaultIndex : undefined),
                    storedScore?.[field],
                  )}
                  disabled={fieldsDisabled}
                  onChange={(event) =>
                    updateDraft(
                      buildScoreDraftKey(gymnast.id, scoreAppKey, field, isDoubleVault ? vaultIndex : undefined),
                      event.target.value,
                    )
                  }
                  onBlur={() =>
                    onBlur(
                      gymnast.id,
                      scoreAppKey,
                      field,
                      storedScore,
                      isDoubleVault ? vaultIndex : undefined,
                    )
                  }
                  className={cn(
                    "w-full rounded border px-2 py-1.5 text-sm outline-none",
                    fieldsDisabled
                      ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500"
                      : field === "penalty"
                        ? "border-slate-700 bg-slate-800 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        : "border-slate-700 bg-slate-800 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500",
                  )}
                />
              </div>
            ))}

            <div className="col-span-12 pr-2 text-right sm:col-span-6 lg:col-span-2">
              <label className="mb-0.5 block text-[9px] font-bold uppercase text-amber-500">
                Total
              </label>
              <div className="text-lg font-bold text-white">
                {dnsActive
                  ? "DNS"
                  : scoreObject.total > 0
                    ? scoreObject.total.toFixed(3)
                    : "-.---"}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
