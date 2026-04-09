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
  orderDraft: string[];
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
  orderDraft,
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
            {apparatusCode} {apparatusLabel.toUpperCase()} FINAL ORDER
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Define the competition order manually or click Randomize before the scoring cards are unlocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-400">
              {qualified.length} finalists are available for this apparatus final.
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

              return (
                <div
                  key={gymnastId}
                  className="rounded-2xl border border-white/10 bg-slate-900/50 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-widest text-slate-500">
                          <span>{country.name}</span>
                          <span>Qual {formatOrdinal(row.rank)}</span>
                          <span>{row.total !== null ? row.total.toFixed(3) : "-"}</span>
                          {row.tied && <span>Tied at cutoff</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
            Confirm Order
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
