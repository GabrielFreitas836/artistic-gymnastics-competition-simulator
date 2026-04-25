import { AlertCircle, ChevronDown, ChevronUp, Shuffle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatOrdinal } from "@/features/shared/utils/formatters";
import { getCountryById } from "@/lib/countries";
import { RankedGymnast } from "@/lib/simulation/rankings";
import { cn } from "@/lib/utils";

interface ApparatusFinalOrderSetupDialogProps {
  open: boolean;
  apparatusCode: string;
  apparatusLabel: string;
  qualified: RankedGymnast[];
  reserves: RankedGymnast[];
  orderDraft: string[];
  replacementChoice: boolean | null;
  onReplacementChoice: (value: boolean) => void;
  selectedReplacementGymnastIds: string[];
  replacementLimit: number;
  onToggleReplacementGymnast: (qualifiedGymnastId: string) => void;
  setupError: string | null;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRandomize: () => void;
  onConfirm: () => void;
}

export function ApparatusFinalOrderSetupDialog({
  open,
  apparatusCode,
  apparatusLabel,
  qualified,
  reserves,
  orderDraft,
  replacementChoice,
  onReplacementChoice,
  selectedReplacementGymnastIds,
  replacementLimit,
  onToggleReplacementGymnast,
  setupError,
  onMove,
  onRandomize,
  onConfirm,
}: ApparatusFinalOrderSetupDialogProps) {
  const rowLookup = new Map(qualified.map((row) => [row.gymnast.id, row]));

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto border border-amber-500/20 bg-slate-950 text-white touch-pan-y">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-widest text-white">
            {apparatusCode} {apparatusLabel.toUpperCase()} FINAL SETUP
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Set the competition order first. If reserves are used, R1, then R2, then R3 inherit the marked positions below before scoring starts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="text-sm text-slate-300">
                {qualified.length} finalists are available for this apparatus final.
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500">
                Reorder the finalists from first to last. Reserve replacements keep the selected competition positions.
              </div>
            </div>
            <button
              type="button"
              onClick={onRandomize}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/30 hover:text-white"
            >
              <Shuffle className="h-4 w-4" />
              Randomize
            </button>
          </div>

          <div className="space-y-3">
            {orderDraft.map((gymnastId, index) => {
              const row = rowLookup.get(gymnastId);
              if (!row) return null;

              const country = getCountryById(row.gymnast.countryId);
              const replacementOrder = selectedReplacementGymnastIds.indexOf(gymnastId) + 1;
              const isSelectedForReplacement = replacementOrder > 0;

              return (
                <div
                  key={gymnastId}
                  className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    isSelectedForReplacement
                      ? "border-amber-400/40 bg-amber-500/10"
                      : "border-white/10 bg-slate-900/50",
                  )}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-lg font-bold text-amber-300">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-2xl">{country.flag}</span>
                          <span className="font-display text-lg font-bold text-white">
                            {row.gymnast.name}
                          </span>
                          {isSelectedForReplacement && (
                            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                              R{replacementOrder}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-widest text-slate-500">
                          <span>{country.name}</span>
                          <span>Qual {formatOrdinal(row.rank)}</span>
                          <span>{row.total !== null ? row.total.toFixed(3) : "-"}</span>
                          {row.tied && <span>Tied at cutoff</span>}
                          {isSelectedForReplacement && (
                            <span>R{replacementOrder} replaces this position</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {reserves.length > 0 && (
                        <button
                          type="button"
                          disabled={replacementChoice !== true}
                          onClick={() => onToggleReplacementGymnast(gymnastId)}
                          className={cn(
                            "inline-flex min-w-[8.5rem] items-center justify-center rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors",
                            replacementChoice !== true
                              ? "cursor-not-allowed border-white/5 bg-slate-900/40 text-slate-600"
                              : isSelectedForReplacement
                                ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                                : "border-white/10 bg-slate-950/70 text-slate-300 hover:border-amber-500/30 hover:text-white",
                          )}
                        >
                          {isSelectedForReplacement ? `Use R${replacementOrder}` : "Use Reserve"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onMove(index, index - 1)}
                        disabled={index === 0}
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                          index === 0
                            ? "cursor-not-allowed border-white/5 bg-slate-900/40 text-slate-600"
                            : "border-white/10 bg-slate-950/70 text-slate-300 hover:border-amber-500/30 hover:text-white",
                        )}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMove(index, index + 1)}
                        disabled={index === orderDraft.length - 1}
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                          index === orderDraft.length - 1
                            ? "cursor-not-allowed border-white/5 bg-slate-900/40 text-slate-600"
                            : "border-white/10 bg-slate-950/70 text-slate-300 hover:border-amber-500/30 hover:text-white",
                        )}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {reserves.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white">Reserve Replacements</div>
                <div className="text-xs uppercase tracking-widest text-slate-500">
                  Reserves stay in classification order. Mark the finalists above if R1, R2 or R3 should enter before scoring.
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onReplacementChoice(false)}
                  className={cn(
                    "rounded-2xl border px-5 py-4 text-left transition-all",
                    replacementChoice === false
                      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                      : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-emerald-500/30",
                  )}
                >
                  <div className="text-sm font-bold uppercase tracking-widest">No</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Keep the current finalists exactly as ordered above.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onReplacementChoice(true)}
                  className={cn(
                    "rounded-2xl border px-5 py-4 text-left transition-all",
                    replacementChoice === true
                      ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
                      : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-amber-500/30",
                  )}
                >
                  <div className="text-sm font-bold uppercase tracking-widest">Yes</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Use reserves automatically as R1, then R2, then R3 in the marked positions above.
                  </div>
                </button>
              </div>

              <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
                <span>{reserves.length} reserves</span>
                {replacementChoice && (
                  <span>
                    Selected replacements: {selectedReplacementGymnastIds.length}/{replacementLimit}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {reserves.map((reserve, index) => {
                  const country = getCountryById(reserve.gymnast.countryId);
                  const targetGymnastId = selectedReplacementGymnastIds[index];
                  const targetIndex = targetGymnastId ? orderDraft.indexOf(targetGymnastId) : -1;

                  return (
                    <div
                      key={reserve.gymnast.id}
                      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{country.flag}</span>
                        <div>
                          <div className="font-semibold text-white">{reserve.gymnast.name}</div>
                          <div className="text-[11px] uppercase tracking-widest text-slate-500">
                            {country.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {targetIndex >= 0 && replacementChoice === true && (
                          <span className="text-[11px] uppercase tracking-widest text-amber-300">
                            Will replace order {targetIndex + 1}
                          </span>
                        )}
                        <span className="rounded bg-slate-800 px-2 py-1 text-xs font-bold uppercase tracking-widest text-slate-300">
                          {reserve.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {setupError && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{setupError}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 transition-colors hover:bg-amber-400"
          >
            Confirm Final Setup
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
