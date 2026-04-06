import { AlertCircle } from "lucide-react";

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

interface AllAroundSetupDialogProps {
  open: boolean;
  qualified: RankedGymnast[];
  reserves: RankedGymnast[];
  replacementChoice: boolean | null;
  onReplacementChoice: (value: boolean) => void;
  selectedReplacementSlots: number[];
  replacementLimit: number;
  onToggleSlot: (slotNumber: number) => void;
  setupError: string | null;
  onConfirm: () => void;
}

export function AllAroundSetupDialog({
  open,
  qualified,
  reserves,
  replacementChoice,
  onReplacementChoice,
  selectedReplacementSlots,
  replacementLimit,
  onToggleSlot,
  setupError,
  onConfirm,
}: AllAroundSetupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto border border-amber-500/20 bg-slate-950 text-white touch-pan-y">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-widest text-white">
            INDIVIDUAL ALL-AROUND SUBSTITUTIONS
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Review the 24 qualifiers and decide whether reserves R1-R4 should replace any gymnast.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                Keep the original qualification order.
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
                Replace selected qualifiers using reserves automatically as R1, then R2, R3 and R4.
              </div>
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <div className="mb-3 flex flex-wrap gap-3 text-xs uppercase tracking-widest text-slate-500">
              <span>{qualified.length} qualified</span>
              <span>{reserves.length} reserves</span>
              {replacementChoice && (
                <span>
                  Selected replacements: {selectedReplacementSlots.length}/{replacementLimit}
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
                    <th className="px-3 py-3 font-bold">Slot</th>
                    <th className="px-3 py-3 font-bold">Qualification</th>
                    <th className="px-3 py-3 font-bold">Gymnast</th>
                    <th className="px-3 py-3 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {qualified.map((row, index) => {
                    const slotNumber = index + 1;
                    const isSelected = selectedReplacementSlots.includes(slotNumber);
                    const replacementOrder = isSelected
                      ? selectedReplacementSlots.indexOf(slotNumber) + 1
                      : null;
                    const country = getCountryById(row.gymnast.countryId);

                    return (
                      <tr
                        key={row.gymnast.id}
                        onClick={() => replacementChoice && onToggleSlot(slotNumber)}
                        className={cn(
                          "transition-colors",
                          replacementChoice ? "cursor-pointer hover:bg-white/5" : "cursor-default",
                          isSelected && "bg-amber-500/10",
                        )}
                      >
                        <td className="px-3 py-3 font-bold text-slate-300">#{slotNumber}</td>
                        <td className="px-3 py-3 text-sm text-slate-400">
                          {formatOrdinal(row.rank)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{country.flag}</span>
                            <div>
                              <div className="font-semibold text-white">{row.gymnast.name}</div>
                              <div className="text-[11px] uppercase tracking-widest text-slate-500">
                                {country.name}
                                {replacementOrder !== null && (
                                  <span className="ml-2 text-amber-300">
                                    {`R${replacementOrder} replaces this slot`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-amber-400">
                          {row.total !== null ? row.total.toFixed(3) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {reserves.length > 0 && (
            <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Reserves
              </div>
              <div className="space-y-2">
                {reserves.map((reserve) => {
                  const country = getCountryById(reserve.gymnast.countryId);
                  return (
                    <div
                      key={reserve.gymnast.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3"
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
                      <div className="rounded bg-slate-800 px-2 py-1 text-xs font-bold uppercase tracking-widest text-slate-300">
                        {reserve.status}
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
            Confirm Finalists
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
