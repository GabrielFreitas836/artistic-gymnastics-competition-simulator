import { ScoreField } from "@/features/shared/utils/scoreInput";
import { cn } from "@/lib/utils";

interface ScoreFieldsProps {
  fields: ReadonlyArray<ScoreField>;
  getValue: (field: ScoreField) => string;
  onChange: (field: ScoreField, value: string) => void;
  onBlur: (field: ScoreField) => void;
  disabled?: boolean;
  totalLabel?: string;
  totalValue: string;
  totalStatusLabel?: string;
  className?: string;
}

export function ScoreFields({
  fields,
  getValue,
  onChange,
  onBlur,
  disabled = false,
  totalLabel = "Total",
  totalValue,
  totalStatusLabel = "Apparatus score",
  className,
}: ScoreFieldsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(8.5rem,0.95fr)]",
        className,
      )}
    >
      {fields.map((field) => (
        <div key={field} className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {field === "penalty" ? "ND" : `${field.toUpperCase()}-Score`}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={getValue(field)}
            disabled={disabled}
            onChange={(event) => onChange(field, event.target.value)}
            onBlur={() => onBlur(field)}
            className={cn(
              "min-h-[3rem] w-full rounded-lg border px-3 py-2.5 text-base outline-none",
              disabled
                ? "cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500"
                : field === "penalty"
                  ? "border-slate-700 bg-slate-800 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-slate-700 bg-slate-800 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500",
            )}
          />
        </div>
      ))}

      <div className="flex min-h-[5.25rem] flex-col justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-right">
        <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
          {totalLabel}
        </label>
        <div className="text-2xl font-bold text-white">{totalValue}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {totalStatusLabel}
        </div>
      </div>
    </div>
  );
}
