import { cn } from "@/lib/utils";

interface SegmentedControlOption<T extends string | number> {
  id: T;
  label: string;
  badge?: string;
}

interface SegmentedControlProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedControlOption<T>>;
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn("flex rounded-2xl bg-slate-950/70 p-1", className)}>
      {options.map((option) => (
        <button
          key={String(option.id)}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all",
            value === option.id
              ? "bg-amber-500 text-slate-950"
              : "text-slate-400 hover:bg-white/5 hover:text-white",
          )}
        >
          <span>{option.label}</span>
          {option.badge && <span className="ml-2 text-[10px]">{option.badge}</span>}
        </button>
      ))}
    </div>
  );
}
