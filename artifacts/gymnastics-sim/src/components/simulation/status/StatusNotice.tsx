import { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatusNoticeProps {
  children: ReactNode;
  tone?: "default" | "danger" | "success";
  className?: string;
}

const TONE_CLASS = {
  default: "border-white/10 bg-slate-900/60 text-slate-200",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-200",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
} as const;

export function StatusNotice({
  children,
  tone = "default",
  className,
}: StatusNoticeProps) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border px-5 py-4", TONE_CLASS[tone], className)}>
      <AlertCircle className="h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
