import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatPillProps {
  children: ReactNode;
  className?: string;
}

export function StatPill({ children, className }: StatPillProps) {
  return (
    <span className={cn("text-xs uppercase tracking-widest text-slate-500", className)}>
      {children}
    </span>
  );
}
